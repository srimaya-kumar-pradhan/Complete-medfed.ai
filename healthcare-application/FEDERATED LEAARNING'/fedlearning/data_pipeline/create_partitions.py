"""
FL-FedFib Hospital Partitioner
================================
Creates non-IID data partitions for 3 simulated hospitals.

The partitioning is done at the PATIENT level to prevent data leakage:
the same patient's images never appear in different hospitals or in both
train and test sets.

Non-IID is achieved by giving each hospital a skewed class distribution:
  Hospital A: enriched in Infiltration + Effusion
  Hospital B: enriched in Atelectasis + Nodule
  Hospital C: more balanced / enriched in No Finding

This is a SIMULATED non-IID distribution, not real hospital data.

Usage:
    python -m data_pipeline.create_partitions
"""
import os
import sys
import json
import numpy as np
import pandas as pd
from collections import Counter

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from data_pipeline.dataset import build_image_index, load_and_filter_csv, encode_labels


def get_patient_primary_label(patient_df, target_labels):
    """
    Assign a 'primary label' to each patient based on their most frequent
    pathology finding. Used for stratified non-IID assignment.
    """
    label_counts = patient_df[target_labels].sum()
    # Exclude "No Finding" from primary label determination for pathology patients
    pathology_labels = [l for l in target_labels if l != "No Finding"]
    pathology_counts = patient_df[pathology_labels].sum()
    
    if pathology_counts.sum() > 0:
        return pathology_counts.idxmax()
    return "No Finding"


def create_non_iid_partitions(df, target_labels, seed=42):
    """
    Partition patients into 3 hospitals with non-IID class distributions.
    
    Strategy:
      1. Group images by Patient ID
      2. Assign a primary label to each patient
      3. Skew patient assignment so each hospital has different class emphasis
      4. Within each hospital, split into train/val sets
    
    Returns:
        dict: {hospital_name: {"train": df, "val": df, "test": df_global_test}}
    """
    rng = np.random.RandomState(seed)
    
    # Get unique patients and their primary labels
    patients = df.groupby("Patient ID").apply(
        lambda x: get_patient_primary_label(x, target_labels)
    ).reset_index()
    patients.columns = ["Patient ID", "primary_label"]
    
    # Shuffle patients deterministically
    patients = patients.sample(frac=1, random_state=seed).reset_index(drop=True)
    
    # Hold out ~15% of patients for a global test set (shared evaluation)
    n_test = int(len(patients) * 0.15)
    test_patients = patients.iloc[:n_test]
    train_patients = patients.iloc[n_test:]
    
    # Define non-IID assignment probabilities per label group
    # Each row = probability of assigning to [hospital_a, hospital_b, hospital_c]
    assignment_probs = {
        "Infiltration":  [0.55, 0.20, 0.25],
        "Effusion":      [0.50, 0.25, 0.25],
        "Atelectasis":   [0.20, 0.55, 0.25],
        "Nodule":        [0.20, 0.50, 0.30],
        "No Finding":    [0.25, 0.25, 0.50],
    }
    
    hospitals = {name: [] for name in config.HOSPITAL_NAMES}
    
    for _, row in train_patients.iterrows():
        pid = row["Patient ID"]
        plabel = row["primary_label"]
        probs = assignment_probs.get(plabel, [1/3, 1/3, 1/3])
        hospital = rng.choice(config.HOSPITAL_NAMES, p=probs)
        hospitals[hospital].append(pid)
    
    # Build hospital dataframes
    result = {}
    test_df = df[df["Patient ID"].isin(test_patients["Patient ID"])]
    
    for h_name, patient_ids in hospitals.items():
        h_df = df[df["Patient ID"].isin(patient_ids)].copy()
        
        # Within each hospital, create a local validation split (20%)
        h_patients = list(set(patient_ids))
        rng.shuffle(h_patients)
        n_val = max(1, int(len(h_patients) * 0.2))
        val_patients = set(h_patients[:n_val])
        train_patients_local = set(h_patients[n_val:])
        
        h_train = h_df[h_df["Patient ID"].isin(train_patients_local)]
        h_val = h_df[h_df["Patient ID"].isin(val_patients)]
        
        result[h_name] = {
            "train": h_train,
            "val": h_val,
        }
    
    return result, test_df


def verify_no_leakage(partitions, test_df):
    """Verify no patient appears in multiple sets."""
    all_sets = []
    for h_name, splits in partitions.items():
        for split_name, split_df in splits.items():
            patients = set(split_df["Patient ID"].unique())
            all_sets.append((f"{h_name}/{split_name}", patients))
    
    # Add test set
    all_sets.append(("global_test", set(test_df["Patient ID"].unique())))
    
    issues = []
    for i in range(len(all_sets)):
        for j in range(i + 1, len(all_sets)):
            name_i, set_i = all_sets[i]
            name_j, set_j = all_sets[j]
            overlap = set_i & set_j
            if overlap and not (name_i.endswith("/val") and name_j.endswith("/val")):
                # Allow overlap between same hospital's train/val
                # But NOT between hospitals or between train/test
                if name_i.split("/")[0] != name_j.split("/")[0]:
                    issues.append(f"LEAKAGE: {name_i} <-> {name_j}: {len(overlap)} patients")
    
    return issues


def save_partition_manifest(partitions, test_df, target_labels):
    """Save partition manifests as CSV files for reproducibility."""
    for h_name, splits in partitions.items():
        h_dir = config.HOSPITAL_DIRS[h_name]
        os.makedirs(h_dir, exist_ok=True)
        
        for split_name, split_df in splits.items():
            manifest_path = os.path.join(h_dir, f"{split_name}.csv")
            split_df[["Image Index", "image_path", "Patient ID"] + target_labels].to_csv(
                manifest_path, index=False
            )
            print(f"  Saved {manifest_path} ({len(split_df)} samples)")
    
    # Save global test set
    test_path = os.path.join(config.PROCESSED_DIR, "test.csv")
    test_df[["Image Index", "image_path", "Patient ID"] + target_labels].to_csv(
        test_path, index=False
    )
    print(f"  Saved {test_path} ({len(test_df)} samples)")


def print_partition_stats(partitions, test_df, target_labels):
    """Print detailed partition statistics."""
    print("\n" + "=" * 70)
    print("PARTITION STATISTICS")
    print("=" * 70)
    
    for h_name, splits in partitions.items():
        print(f"\n--- {h_name.upper()} ---")
        for split_name, split_df in splits.items():
            n_patients = split_df["Patient ID"].nunique()
            n_images = len(split_df)
            print(f"  {split_name}: {n_images} images, {n_patients} patients")
            
            # Class distribution
            for label in target_labels:
                count = split_df[label].sum()
                pct = 100 * count / n_images if n_images > 0 else 0
                print(f"    {label:20s}: {count:5d} ({pct:.1f}%)")
    
    print(f"\n--- GLOBAL TEST ---")
    n_test = len(test_df)
    n_test_patients = test_df["Patient ID"].nunique()
    print(f"  test: {n_test} images, {n_test_patients} patients")
    for label in target_labels:
        count = test_df[label].sum()
        pct = 100 * count / n_test if n_test > 0 else 0
        print(f"    {label:20s}: {count:5d} ({pct:.1f}%)")
    
    # Summary
    total = sum(len(s["train"]) + len(s["val"]) for s in partitions.values()) + n_test
    print(f"\n  TOTAL SAMPLES: {total}")


def main():
    print("=" * 70)
    print("FL-FedFib: Creating Hospital Data Partitions")
    print("=" * 70)
    
    # Ensure output directories exist
    config.ensure_dirs()
    
    # Build image index
    print("\n[1] Building image index...")
    image_index = build_image_index(config.IMAGE_DIRS)
    print(f"    Found {len(image_index)} images on disk")
    
    # Load and filter CSV
    print("\n[2] Loading and filtering annotations...")
    df = load_and_filter_csv(
        config.CSV_PATH,
        image_index,
        config.TARGET_LABELS,
        config.TRAIN_LIST_PATH,
        config.TEST_LIST_PATH,
    )
    print(f"    Filtered to {len(df)} samples with target labels")
    print(f"    Unique patients: {df['Patient ID'].nunique()}")
    
    # Create non-IID partitions
    print("\n[3] Creating non-IID hospital partitions...")
    partitions, test_df = create_non_iid_partitions(
        df, config.TARGET_LABELS, seed=config.SEED
    )
    
    # Verify no leakage
    print("\n[4] Verifying no data leakage...")
    issues = verify_no_leakage(partitions, test_df)
    if issues:
        for issue in issues:
            print(f"    ERROR: {issue}")
        print("    LEAKAGE DETECTED! Aborting.")
        sys.exit(1)
    else:
        print("    PASSED: No patient leakage detected")
    
    # Print statistics
    print_partition_stats(partitions, test_df, config.TARGET_LABELS)
    
    # Save manifests
    print("\n[5] Saving partition manifests...")
    save_partition_manifest(partitions, test_df, config.TARGET_LABELS)
    
    # Save partition metadata
    metadata = {
        "target_labels": config.TARGET_LABELS,
        "num_hospitals": config.NUM_HOSPITALS,
        "seed": config.SEED,
        "total_images": len(df),
        "partition_method": "patient-level non-IID with skewed class probabilities",
        "non_iid_label": "SIMULATED Non-IID Distribution",
    }
    
    for h_name, splits in partitions.items():
        metadata[h_name] = {
            "train_samples": len(splits["train"]),
            "val_samples": len(splits["val"]),
            "train_patients": int(splits["train"]["Patient ID"].nunique()),
            "val_patients": int(splits["val"]["Patient ID"].nunique()),
        }
    
    metadata["global_test"] = {
        "samples": len(test_df),
        "patients": int(test_df["Patient ID"].nunique()),
    }
    
    meta_path = os.path.join(config.PROCESSED_DIR, "partition_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"\n  Saved {meta_path}")
    
    print("\n" + "=" * 70)
    print("Partitioning complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
