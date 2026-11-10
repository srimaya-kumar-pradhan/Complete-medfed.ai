"""
FL-FedFib Local Training
=========================
Single-hospital local model training with evaluation.
Supports CUDA + mixed precision (AMP) + OOM recovery.
Clients train SEQUENTIALLY on the same GPU.

Usage:
    python -m training.local_train --hospital hospital_a
    python -m training.local_train --hospital hospital_a --epochs 2 --demo
"""
import os
import sys
import time
import json
import argparse
import copy
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.cuda.amp import autocast, GradScaler
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from models.model import create_model, get_model_param_count, get_model_state_size
from data_pipeline.dataset import (
    ChestXrayDataset, get_train_transforms, get_eval_transforms, encode_labels
)
from utils.metrics import compute_metrics, format_metrics


def set_seed(seed):
    """Set random seed for reproducibility."""
    torch.manual_seed(seed)
    np.random.seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def load_hospital_data(hospital_name, max_samples=None):
    """
    Load train and val datasets for a given hospital.
    
    Returns:
        train_dataset, val_dataset, label_names
    """
    h_dir = config.HOSPITAL_DIRS[hospital_name]
    
    train_csv = os.path.join(h_dir, "train.csv")
    val_csv = os.path.join(h_dir, "val.csv")
    
    if not os.path.exists(train_csv):
        raise FileNotFoundError(
            f"Train manifest not found: {train_csv}\n"
            "Run 'python -m data_pipeline.create_partitions' first."
        )
    
    train_df = pd.read_csv(train_csv)
    val_df = pd.read_csv(val_csv)
    
    # Optionally limit samples for demo mode
    if max_samples and len(train_df) > max_samples:
        train_df = train_df.sample(n=max_samples, random_state=config.SEED)
    if max_samples and len(val_df) > max_samples // 4:
        val_df = val_df.sample(n=max_samples // 4, random_state=config.SEED)
    
    label_names = config.TARGET_LABELS
    train_labels = encode_labels(train_df, label_names)
    val_labels = encode_labels(val_df, label_names)
    
    train_dataset = ChestXrayDataset(
        image_paths=train_df["image_path"].tolist(),
        labels=train_labels,
        label_names=label_names,
        transform=get_train_transforms(config.IMAGE_SIZE),
    )
    
    val_dataset = ChestXrayDataset(
        image_paths=val_df["image_path"].tolist(),
        labels=val_labels,
        label_names=label_names,
        transform=get_eval_transforms(config.IMAGE_SIZE),
    )
    
    return train_dataset, val_dataset, label_names


def load_test_data(max_samples=None):
    """Load global test dataset."""
    test_csv = os.path.join(config.PROCESSED_DIR, "test.csv")
    if not os.path.exists(test_csv):
        raise FileNotFoundError(f"Test manifest not found: {test_csv}")
    
    test_df = pd.read_csv(test_csv)
    if max_samples and len(test_df) > max_samples:
        test_df = test_df.sample(n=max_samples, random_state=config.SEED)
    
    label_names = config.TARGET_LABELS
    test_labels = encode_labels(test_df, label_names)
    
    test_dataset = ChestXrayDataset(
        image_paths=test_df["image_path"].tolist(),
        labels=test_labels,
        label_names=label_names,
        transform=get_eval_transforms(config.IMAGE_SIZE),
    )
    return test_dataset, label_names


def train_one_epoch(model, dataloader, criterion, optimizer, device,
                    scaler=None, use_amp=False):
    """Train for one epoch with optional AMP. Returns average loss."""
    model.train()
    total_loss = 0.0
    n_batches = 0
    
    for images, labels in dataloader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        
        optimizer.zero_grad(set_to_none=True)
        
        if use_amp and scaler is not None:
            with autocast(device_type='cuda'):
                outputs = model(images)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
        
        total_loss += loss.item()
        n_batches += 1
    
    return total_loss / max(n_batches, 1)


def evaluate(model, dataloader, criterion, device, use_amp=False):
    """Evaluate model. Returns loss, predictions, and ground truth."""
    model.eval()
    total_loss = 0.0
    n_batches = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in dataloader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            
            if use_amp:
                with autocast(device_type='cuda'):
                    outputs = model(images)
                    loss = criterion(outputs, labels)
            else:
                outputs = model(images)
                loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            n_batches += 1
            
            # Always compute probabilities in float32
            probs = torch.sigmoid(outputs.float()).cpu().numpy()
            all_preds.append(probs)
            all_labels.append(labels.cpu().numpy())
    
    avg_loss = total_loss / max(n_batches, 1)
    all_preds = np.concatenate(all_preds, axis=0)
    all_labels = np.concatenate(all_labels, axis=0)
    
    return avg_loss, all_preds, all_labels


class HospitalClient:
    """
    Simulated hospital client for federated learning.
    
    Encapsulates local dataset, model, training, and evaluation.
    Provides get/set for model parameters (for federation).
    
    All clients train SEQUENTIALLY on the same GPU.
    Supports mixed precision (AMP) and automatic OOM recovery.
    """
    
    def __init__(self, hospital_name, model=None, device=None,
                 max_samples=None, batch_size=None):
        self.hospital_name = hospital_name
        self.device = device or config.DEVICE
        self.max_samples = max_samples
        self.batch_size = batch_size or config.BATCH_SIZE
        self.use_amp = config.USE_AMP and self.device.type == 'cuda'
        
        # AMP scaler
        self.scaler = GradScaler() if self.use_amp else None
        
        # Load data
        self.train_dataset, self.val_dataset, self.label_names = \
            load_hospital_data(hospital_name, max_samples=max_samples)
        
        self._create_dataloaders(self.batch_size)
        
        # Model
        if model is not None:
            self.model = copy.deepcopy(model).to(self.device)
        else:
            self.model = create_model(
                config.NUM_CLASSES, config.MODEL_NAME, config.PRETRAINED
            ).to(self.device)
        
        # Loss and optimizer
        self.criterion = nn.BCEWithLogitsLoss()
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=config.LEARNING_RATE,
            weight_decay=config.WEIGHT_DECAY,
        )
        
        # Tracking
        self.train_history = []
    
    def _create_dataloaders(self, batch_size):
        """Create dataloaders with given batch size."""
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=batch_size,
            shuffle=True,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
            persistent_workers=True if config.NUM_WORKERS > 0 else False,
        )
        self.val_loader = DataLoader(
            self.val_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
            persistent_workers=True if config.NUM_WORKERS > 0 else False,
        )
    
    @property
    def num_samples(self):
        return len(self.train_dataset)
    
    def get_model_params(self):
        """Return model state dict (for federation). Moved to CPU."""
        return {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
    
    def set_model_params(self, state_dict):
        """Set model parameters from a state dict (for federation)."""
        self.model.load_state_dict(state_dict)
        # Reset optimizer after receiving new global model
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=config.LEARNING_RATE,
            weight_decay=config.WEIGHT_DECAY,
        )
        if self.use_amp:
            self.scaler = GradScaler()
    
    def train(self, epochs=None):
        """
        Train locally for the specified number of epochs.
        Handles CUDA OOM by reducing batch size automatically.
        Returns training metrics.
        """
        epochs = epochs or config.LOCAL_EPOCHS
        results = {
            "hospital": self.hospital_name,
            "epochs": epochs,
            "losses": [],
            "val_loss": None,
            "metrics": None,
            "training_time_s": 0,
            "batch_size_used": self.batch_size,
            "amp_used": self.use_amp,
        }
        
        start_time = time.time()
        
        try:
            for epoch in range(epochs):
                train_loss = train_one_epoch(
                    self.model, self.train_loader, self.criterion,
                    self.optimizer, self.device,
                    scaler=self.scaler, use_amp=self.use_amp,
                )
                results["losses"].append(train_loss)
                
        except torch.cuda.OutOfMemoryError:
            # OOM recovery: reduce batch size and retry
            torch.cuda.empty_cache()
            new_bs = max(4, self.batch_size // 2)
            print(f"  [OOM] Reducing batch size {self.batch_size} -> {new_bs}")
            self.batch_size = new_bs
            self._create_dataloaders(new_bs)
            results["batch_size_used"] = new_bs
            results["losses"] = []
            
            # Retry training
            for epoch in range(epochs):
                train_loss = train_one_epoch(
                    self.model, self.train_loader, self.criterion,
                    self.optimizer, self.device,
                    scaler=self.scaler, use_amp=self.use_amp,
                )
                results["losses"].append(train_loss)
        
        results["training_time_s"] = time.time() - start_time
        
        # Evaluate on local validation set
        val_loss, val_preds, val_labels = evaluate(
            self.model, self.val_loader, self.criterion,
            self.device, use_amp=self.use_amp,
        )
        results["val_loss"] = val_loss
        results["metrics"] = compute_metrics(val_labels, val_preds)
        
        self.train_history.append(results)
        
        # Free GPU cache between clients
        if self.device.type == 'cuda':
            torch.cuda.empty_cache()
        
        return results
    
    def evaluate_on_loader(self, dataloader):
        """Evaluate on an arbitrary dataloader (e.g., global test set)."""
        loss, preds, labels = evaluate(
            self.model, dataloader, self.criterion,
            self.device, use_amp=self.use_amp,
        )
        metrics = compute_metrics(labels, preds)
        return loss, metrics
    
    def release_gpu(self):
        """Move model to CPU and free GPU memory. Call between sequential clients."""
        self.model = self.model.cpu()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    def to_device(self):
        """Move model back to configured device."""
        self.model = self.model.to(self.device)


def main():
    """Standalone local training for a single hospital."""
    parser = argparse.ArgumentParser(description="Local hospital training")
    parser.add_argument("--hospital", type=str, required=True,
                        choices=config.HOSPITAL_NAMES)
    parser.add_argument("--epochs", type=int, default=config.LOCAL_EPOCHS)
    parser.add_argument("--demo", action="store_true",
                        help="Use small demo subset")
    args = parser.parse_args()
    
    set_seed(config.SEED)
    
    max_samples = config.DEMO_MAX_SAMPLES_PER_HOSPITAL if args.demo else None
    
    print("=" * 60)
    print(f"FL-FedFib: Local Training - {args.hospital}")
    print("=" * 60)
    print(config.get_hardware_summary())
    print(f"Epochs: {args.epochs}")
    print(f"Demo mode: {args.demo}")
    print(f"AMP: {config.USE_AMP}")
    print("=" * 60)
    
    # Create client
    client = HospitalClient(
        args.hospital, device=config.DEVICE, max_samples=max_samples
    )
    
    total, trainable = get_model_param_count(client.model)
    print(f"\nModel: {config.MODEL_NAME}")
    print(f"Parameters: {total:,} total, {trainable:,} trainable")
    print(f"Train samples: {len(client.train_dataset)}")
    print(f"Val samples: {len(client.val_dataset)}")
    print(f"Batch size: {client.batch_size}")
    print(f"Class distribution (train): {client.train_dataset.get_class_distribution()}")
    
    # Train
    print(f"\nTraining for {args.epochs} epochs...")
    results = client.train(epochs=args.epochs)
    
    print(f"\nTraining time: {results['training_time_s']:.1f}s")
    print(f"Batch size used: {results['batch_size_used']}")
    print(f"Train losses: {[f'{l:.4f}' for l in results['losses']]}")
    print(f"Val loss: {results['val_loss']:.4f}")
    print(f"\nValidation Metrics:")
    print(format_metrics(results["metrics"], config.TARGET_LABELS))
    
    # Save checkpoint
    ckpt_path = os.path.join(config.CHECKPOINTS_DIR, f"{args.hospital}_local.pt")
    os.makedirs(config.CHECKPOINTS_DIR, exist_ok=True)
    torch.save({
        "model_state_dict": client.get_model_params(),
        "hospital": args.hospital,
        "epochs": args.epochs,
        "metrics": results["metrics"],
        "config": config.get_config_dict(),
    }, ckpt_path)
    print(f"\nCheckpoint saved: {ckpt_path}")
    
    # Save results
    results_path = os.path.join(
        config.RESULTS_DIR, f"local_{args.hospital}.json"
    )
    # Convert numpy values for JSON
    serializable = {
        k: v for k, v in results.items()
        if k != "metrics"
    }
    serializable["metrics"] = {
        k: (v if not isinstance(v, list) else
            [float(x) if not np.isnan(x) else None for x in v])
        for k, v in results["metrics"].items()
    }
    with open(results_path, "w") as f:
        json.dump(serializable, f, indent=2, default=str)
    print(f"Results saved: {results_path}")


if __name__ == "__main__":
    main()
