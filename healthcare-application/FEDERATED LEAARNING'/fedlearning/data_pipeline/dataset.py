"""
FL-FedFib Dataset
==================
PyTorch Dataset for NIH Chest X-ray14 with multi-label classification.
Handles image loading, preprocessing, and label encoding.
"""
import os
import torch
import numpy as np
import pandas as pd
from torch.utils.data import Dataset
from PIL import Image
from torchvision import transforms


class ChestXrayDataset(Dataset):
    """
    PyTorch Dataset for chest X-ray images with multi-label pathology labels.
    
    Args:
        image_paths: List of full paths to image files.
        labels: numpy array of shape (N, num_classes) with binary labels.
        label_names: List of label names.
        transform: torchvision transforms to apply.
    """
    
    def __init__(self, image_paths, labels, label_names, transform=None):
        assert len(image_paths) == len(labels), \
            f"Mismatch: {len(image_paths)} paths vs {len(labels)} labels"
        self.image_paths = image_paths
        self.labels = labels
        self.label_names = label_names
        self.transform = transform
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        label = self.labels[idx]
        
        # Load image
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            # Return a blank image and the label if image is corrupted
            print(f"WARNING: Failed to load {img_path}: {e}")
            image = Image.new("RGB", (224, 224), (0, 0, 0))
        
        if self.transform:
            image = self.transform(image)
        
        label_tensor = torch.FloatTensor(label)
        return image, label_tensor
    
    def get_class_distribution(self):
        """Return per-class sample counts."""
        counts = self.labels.sum(axis=0)
        return {name: int(c) for name, c in zip(self.label_names, counts)}


def get_train_transforms(image_size=224):
    """Training transforms with mild augmentation."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],  # ImageNet stats
            std=[0.229, 0.224, 0.225]
        ),
    ])


def get_eval_transforms(image_size=224):
    """Validation/test transforms (no augmentation)."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        ),
    ])


def build_image_index(image_dirs):
    """
    Build a mapping from filename to full path across all image directories.
    
    Returns:
        dict: {filename: full_path}
    """
    index = {}
    for img_dir in image_dirs:
        if not os.path.exists(img_dir):
            continue
        for fname in os.listdir(img_dir):
            if fname.endswith(".png"):
                index[fname] = os.path.join(img_dir, fname)
    return index


def load_and_filter_csv(csv_path, image_index, target_labels, train_list_path=None, test_list_path=None):
    """
    Load the NIH CSV, filter to available images and target labels.
    
    Returns:
        pd.DataFrame with columns: Image Index, Patient ID, image_path,
            and one binary column per target label.
    """
    df = pd.read_csv(csv_path)
    
    # Filter to images that exist on disk
    df = df[df["Image Index"].isin(image_index)].copy()
    df["image_path"] = df["Image Index"].map(image_index)
    
    # Parse multi-label: create binary columns for each target label
    for label in target_labels:
        df[label] = df["Finding Labels"].apply(
            lambda x: 1 if label in str(x).split("|") else 0
        )
    
    # Keep only rows that have at least one target label active
    # (this includes "No Finding" as a label)
    label_sum = df[target_labels].sum(axis=1)
    df = df[label_sum > 0].copy()
    
    # Load official splits if provided
    if train_list_path and os.path.exists(train_list_path):
        with open(train_list_path) as f:
            train_images = set(line.strip() for line in f if line.strip())
        df["is_train"] = df["Image Index"].isin(train_images)
    
    if test_list_path and os.path.exists(test_list_path):
        with open(test_list_path) as f:
            test_images = set(line.strip() for line in f if line.strip())
        df["is_test"] = df["Image Index"].isin(test_images)
    
    return df


def encode_labels(df, target_labels):
    """Extract label matrix from DataFrame."""
    return df[target_labels].values.astype(np.float32)
