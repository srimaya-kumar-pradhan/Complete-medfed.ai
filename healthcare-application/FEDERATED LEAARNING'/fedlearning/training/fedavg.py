"""
FL-FedFib FedAvg
=================
Standard Federated Averaging (FedAvg) implementation.
This is the BASELINE aggregation method for the research comparison.

Architecture:
  1. Coordinator distributes global model to all clients
  2. Each client trains locally (SEQUENTIALLY on same GPU)
  3. Clients send model updates back
  4. Coordinator aggregates via weighted average (by sample count)
  5. New global model is distributed for next round

Reference: McMahan et al., "Communication-Efficient Learning of Deep Networks
from Decentralized Data", AISTATS 2017.
"""
import os
import sys
import time
import json
import copy
import numpy as np
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from models.model import create_model, get_model_state_size
from training.local_train import (
    HospitalClient, load_test_data, evaluate, set_seed
)
from utils.metrics import compute_metrics, format_metrics


def fedavg_aggregate(client_params_list, client_weights):
    """
    Weighted Federated Averaging.
    
    Args:
        client_params_list: List of state dicts from clients.
        client_weights: List of weights (typically num_samples per client).
    
    Returns:
        Aggregated state dict.
    """
    total_weight = sum(client_weights)
    
    # Initialize with zeros
    avg_params = {}
    for key in client_params_list[0]:
        avg_params[key] = torch.zeros_like(client_params_list[0][key], dtype=torch.float32)
    
    # Weighted sum
    for params, weight in zip(client_params_list, client_weights):
        w = weight / total_weight
        for key in avg_params:
            avg_params[key] += params[key].float() * w
    
    return avg_params


def run_fedavg(num_rounds=None, local_epochs=None, max_samples=None,
               progress_callback=None):
    """
    Run FedAvg experiment.
    
    Args:
        num_rounds: Number of federation rounds.
        local_epochs: Local training epochs per round.
        max_samples: Max samples per hospital (for demo mode).
        progress_callback: Optional callable(round, total, metrics_dict)
            for UI updates.
    
    Returns:
        dict: Complete experiment results.
    """
    num_rounds = num_rounds or config.FED_ROUNDS
    local_epochs = local_epochs or config.LOCAL_EPOCHS
    
    set_seed(config.SEED)
    device = config.DEVICE
    
    print("=" * 70)
    print("FedAvg Experiment")
    print("=" * 70)
    print(config.get_hardware_summary())
    print(f"Rounds: {num_rounds}")
    print(f"Local epochs: {local_epochs}")
    print(f"Demo mode: {max_samples is not None}")
    
    # Create global model
    global_model = create_model(
        config.NUM_CLASSES, config.MODEL_NAME, config.PRETRAINED
    )
    model_size = get_model_state_size(global_model)
    print(f"Model size: {model_size / (1024**2):.1f} MB")
    
    # Create hospital clients (SEQUENTIAL, same GPU)
    clients = {}
    for h_name in config.HOSPITAL_NAMES:
        print(f"\nInitializing {h_name}...")
        clients[h_name] = HospitalClient(
            h_name,
            model=global_model,
            device=device,
            max_samples=max_samples,
        )
        print(f"  Train: {clients[h_name].num_samples} samples")
    
    # Load global test set
    test_max = max_samples * 2 if max_samples else None
    test_dataset, label_names = load_test_data(max_samples=test_max)
    test_loader = DataLoader(
        test_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=False,
        num_workers=config.NUM_WORKERS,
        pin_memory=config.PIN_MEMORY,
    )
    
    # Experiment tracking
    experiment = {
        "method": "FedAvg",
        "config": config.get_config_dict(),
        "num_rounds": num_rounds,
        "local_epochs": local_epochs,
        "max_samples_per_hospital": max_samples,
        "model_size_bytes": model_size,
        "rounds": [],
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    
    total_communication = 0
    experiment_start = time.time()
    
    # ================================================================
    # Federation Rounds
    # ================================================================
    for round_num in range(1, num_rounds + 1):
        round_start = time.time()
        print(f"\n{'='*50}")
        print(f"Round {round_num}/{num_rounds}")
        print(f"{'='*50}")
        
        round_data = {
            "round": round_num,
            "clients": {},
            "global_metrics": None,
            "communication_bytes": 0,
            "round_time_s": 0,
        }
        
        # Distribute global model to all clients
        global_state = global_model.state_dict()
        
        # Train each client SEQUENTIALLY
        client_params_list = []
        client_weights = []
        
        for h_name, client in clients.items():
            print(f"\n  [{h_name}] Training...")
            
            # Set global model params
            client.set_model_params(copy.deepcopy(global_state))
            client.to_device()
            
            # Train locally
            results = client.train(epochs=local_epochs)
            
            # Collect model update
            params = client.get_model_params()
            client_params_list.append(params)
            client_weights.append(client.num_samples)
            
            print(f"  [{h_name}] Loss: {results['losses'][-1]:.4f} | "
                  f"Val F1: {results['metrics']['f1_macro']:.4f} | "
                  f"Time: {results['training_time_s']:.1f}s")
            
            round_data["clients"][h_name] = {
                "train_loss": results["losses"][-1],
                "val_loss": results["val_loss"],
                "val_f1": results["metrics"]["f1_macro"],
                "training_time_s": results["training_time_s"],
                "num_samples": client.num_samples,
                "batch_size_used": results["batch_size_used"],
            }
            
            # Free GPU between clients
            client.release_gpu()
        
        # Aggregate
        print(f"\n  Aggregating (weighted by sample count)...")
        global_state = fedavg_aggregate(client_params_list, client_weights)
        global_model.load_state_dict(global_state)
        
        # Communication volume: each client sends + receives full model
        round_comm = model_size * len(clients) * 2
        total_communication += round_comm
        round_data["communication_bytes"] = round_comm
        
        # Evaluate global model on test set
        print(f"  Evaluating global model...")
        global_model_eval = copy.deepcopy(global_model).to(device)
        criterion = torch.nn.BCEWithLogitsLoss()
        use_amp = config.USE_AMP and device.type == 'cuda'
        test_loss, test_preds, test_labels = evaluate(
            global_model_eval, test_loader, criterion, device, use_amp=use_amp,
        )
        test_metrics = compute_metrics(test_labels, test_preds)
        
        # Move eval model back to CPU to free GPU
        del global_model_eval
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        round_data["global_metrics"] = {
            "test_loss": test_loss,
            **{k: v for k, v in test_metrics.items() if k != "per_class_auc"},
            "per_class_auc": [
                float(x) if not np.isnan(x) else None
                for x in test_metrics.get("per_class_auc", [])
            ],
        }
        
        round_time = time.time() - round_start
        round_data["round_time_s"] = round_time
        
        print(f"\n  Global Test Metrics:")
        print(format_metrics(test_metrics, label_names))
        print(f"  Round time: {round_time:.1f}s")
        print(f"  Communication: {round_comm / (1024**2):.1f} MB")
        
        experiment["rounds"].append(round_data)
        
        # Progress callback for UI
        if progress_callback:
            progress_callback(round_num, num_rounds, round_data)
    
    # ================================================================
    # Final summary
    # ================================================================
    total_time = time.time() - experiment_start
    experiment["total_time_s"] = total_time
    experiment["total_communication_bytes"] = total_communication
    experiment["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
    
    # Final global metrics
    final_metrics = experiment["rounds"][-1]["global_metrics"]
    experiment["final_metrics"] = final_metrics
    
    print(f"\n{'='*70}")
    print(f"FedAvg Complete")
    print(f"{'='*70}")
    print(f"Total time: {total_time:.1f}s")
    print(f"Total communication: {total_communication / (1024**2):.1f} MB")
    print(f"Final F1 (macro): {final_metrics['f1_macro']:.4f}")
    roc = final_metrics.get('roc_auc_macro', float('nan'))
    if not np.isnan(roc):
        print(f"Final ROC-AUC (macro): {roc:.4f}")
    
    # Save results
    config.ensure_dirs()
    results_path = os.path.join(config.RESULTS_DIR, "fedavg", "experiment.json")
    with open(results_path, "w") as f:
        json.dump(experiment, f, indent=2, default=str)
    print(f"\nResults saved: {results_path}")
    
    # Save global model checkpoint
    ckpt_path = os.path.join(config.CHECKPOINTS_DIR, "fedavg_global.pt")
    torch.save({
        "model_state_dict": global_model.state_dict(),
        "config": config.get_config_dict(),
        "final_metrics": final_metrics,
        "num_rounds": num_rounds,
    }, ckpt_path)
    print(f"Checkpoint saved: {ckpt_path}")
    
    return experiment


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run FedAvg experiment")
    parser.add_argument("--rounds", type=int, default=config.FED_ROUNDS)
    parser.add_argument("--epochs", type=int, default=config.LOCAL_EPOCHS)
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    
    max_samples = config.DEMO_MAX_SAMPLES_PER_HOSPITAL if args.demo else None
    run_fedavg(
        num_rounds=args.rounds,
        local_epochs=args.epochs,
        max_samples=max_samples,
    )
