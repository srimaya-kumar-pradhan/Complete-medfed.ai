"""Phase 1: Dataset inspection script for FL-FedFib prototype."""
import pandas as pd
import os
from collections import Counter

# Paths
BASE = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE, "DataSET")
CSV_PATH = os.path.join(DATASET_DIR, "Data_Entry_2017.csv")
TRAIN_LIST = os.path.join(DATASET_DIR, "train_val_list.txt")
TEST_LIST = os.path.join(DATASET_DIR, "test_list.txt")

# Image directories
IMAGE_DIRS = [
    os.path.join(DATASET_DIR, f"images_{i:03d}", "images")
    for i in range(1, 13)
]

print("=" * 60)
print("FL-FedFib Phase 1: Dataset Inspection")
print("=" * 60)

# 1. Load CSV
print("\n[1] Loading Data_Entry_2017.csv...")
df = pd.read_csv(CSV_PATH)
print(f"   Total rows: {len(df)}")
print(f"   Columns: {list(df.columns)}")
print(f"\n   First 3 rows:")
print(df.head(3).to_string(index=False))

# 2. Analyze labels
print("\n[2] Label Analysis...")
all_labels = []
for labels in df["Finding Labels"]:
    for label in str(labels).split("|"):
        all_labels.append(label.strip())

label_counts = Counter(all_labels)
print(f"   Unique labels: {len(label_counts)}")
print(f"\n   Label distribution:")
for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
    pct = 100.0 * count / len(df)
    print(f"     {label:25s} {count:6d}  ({pct:.1f}%)")

# 3. Check for multi-label
multi_label_count = sum(1 for labels in df["Finding Labels"] if "|" in str(labels))
print(f"\n   Multi-label images: {multi_label_count}")

# 4. Patient ID analysis
print(f"\n[3] Patient Analysis...")
print(f"   Unique patients: {df['Patient ID'].nunique()}")
print(f"   Images per patient (mean): {len(df) / df['Patient ID'].nunique():.1f}")

# 5. Check which image directories exist and count images
print(f"\n[4] Image File Analysis...")
existing_images = set()
for img_dir in IMAGE_DIRS:
    if os.path.exists(img_dir):
        imgs = os.listdir(img_dir)
        existing_images.update(imgs)
        print(f"   {img_dir}: {len(imgs)} images")
    else:
        print(f"   {img_dir}: NOT FOUND")

print(f"\n   Total physical images found: {len(existing_images)}")

# 6. Match CSV to images
csv_images = set(df["Image Index"].values)
matched = csv_images & existing_images
missing_from_disk = csv_images - existing_images
extra_on_disk = existing_images - csv_images

print(f"   Images in CSV: {len(csv_images)}")
print(f"   Matched (CSV & Disk): {len(matched)}")
print(f"   In CSV but not on disk: {len(missing_from_disk)}")
print(f"   On disk but not in CSV: {len(extra_on_disk)}")

# 7. Train/test split files
print(f"\n[5] Official Split Files...")
with open(TRAIN_LIST) as f:
    train_images = set(line.strip() for line in f if line.strip())
with open(TEST_LIST) as f:
    test_images = set(line.strip() for line in f if line.strip())

print(f"   Train/val list: {len(train_images)} images")
print(f"   Test list: {len(test_images)} images")
print(f"   Overlap: {len(train_images & test_images)}")

# Check which are available
train_available = train_images & existing_images
test_available = test_images & existing_images
print(f"   Train available on disk: {len(train_available)}")
print(f"   Test available on disk: {len(test_available)}")

# 8. MVP label selection recommendation
print(f"\n[6] MVP Label Selection...")
# For the MVP, we want labels with enough samples that are also
# medically meaningful and not just "No Finding"
pathology_counts = {k: v for k, v in label_counts.items() if k != "No Finding"}
sorted_pathologies = sorted(pathology_counts.items(), key=lambda x: -x[1])
print(f"   Top pathologies (excluding No Finding):")
for label, count in sorted_pathologies[:8]:
    print(f"     {label:25s} {count:6d}")

print("\n   RECOMMENDATION for MVP (5 classes):")
print("     1. No Finding (normal baseline)")
print("     2. Infiltration (most common pathology)")
print("     3. Effusion")
print("     4. Atelectasis")
print("     5. Nodule")

print("\n" + "=" * 60)
print("Inspection complete.")
print("=" * 60)
