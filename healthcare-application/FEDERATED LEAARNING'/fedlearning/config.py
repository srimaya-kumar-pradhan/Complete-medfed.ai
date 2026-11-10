"""
FL-FedFib Configuration
========================
Central configuration for the federated learning prototype.
All hyperparameters and paths are defined here.

Hardware: NVIDIA RTX 2070 (8GB VRAM), Intel i5 12th Gen
"""
import os
import torch

# ============================================================
# Paths
# ============================================================
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(PROJECT_ROOT, "DataSET")
CSV_PATH = os.path.join(DATASET_DIR, "Data_Entry_2017.csv")
TRAIN_LIST_PATH = os.path.join(DATASET_DIR, "train_val_list.txt")
TEST_LIST_PATH = os.path.join(DATASET_DIR, "test_list.txt")

# Image directories (images_001 through images_012, only some may exist)
IMAGE_DIRS = [
    os.path.join(DATASET_DIR, f"images_{i:03d}", "images")
    for i in range(1, 13)
]

# Output directories
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
HOSPITAL_DIRS = {
    "hospital_a": os.path.join(DATA_DIR, "hospital_a"),
    "hospital_b": os.path.join(DATA_DIR, "hospital_b"),
    "hospital_c": os.path.join(DATA_DIR, "hospital_c"),
}
CHECKPOINTS_DIR = os.path.join(PROJECT_ROOT, "checkpoints")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

# ============================================================
# Dataset Configuration
# ============================================================
# MVP label subset — selected based on actual dataset availability
# These are the most frequent pathologies with sufficient samples
TARGET_LABELS = [
    "No Finding",
    "Infiltration",
    "Effusion",
    "Atelectasis",
    "Nodule",
]
NUM_CLASSES = len(TARGET_LABELS)

# Number of simulated hospitals
NUM_HOSPITALS = 3
HOSPITAL_NAMES = ["hospital_a", "hospital_b", "hospital_c"]

# Random seed for reproducibility
SEED = 42

# ============================================================
# Model Configuration
# ============================================================
MODEL_NAME = "densenet121"  # Fallback: "resnet18"
PRETRAINED = True
IMAGE_SIZE = 224
IN_CHANNELS = 3  # Convert grayscale to RGB for pretrained model

# ============================================================
# GPU / Device Configuration
# ============================================================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Mixed precision (AMP) — enabled when CUDA is available
USE_AMP = torch.cuda.is_available()

# GPU VRAM detection and batch size adaptation
def _detect_gpu_config():
    """Detect GPU VRAM and set optimal batch size."""
    if not torch.cuda.is_available():
        return 8, False  # CPU: small batch, no AMP
    
    try:
        vram_bytes = torch.cuda.get_device_properties(0).total_mem
        vram_gb = vram_bytes / (1024 ** 3)
        gpu_name = torch.cuda.get_device_properties(0).name
        print(f"[GPU] {gpu_name} | VRAM: {vram_gb:.1f} GB")
        
        # Batch size based on VRAM
        # RTX 2070 = 8GB -> batch 32 with AMP is comfortable for DenseNet121
        if vram_gb >= 10:
            return 32, True
        elif vram_gb >= 7:
            return 24, True  # RTX 2070 sweet spot
        elif vram_gb >= 5:
            return 16, True
        elif vram_gb >= 3:
            return 8, True
        else:
            return 4, True
    except Exception:
        return 8, True

_auto_batch, _auto_amp = _detect_gpu_config()

# ============================================================
# Training Configuration
# ============================================================
BATCH_SIZE = _auto_batch
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-5
LOCAL_EPOCHS = 2          # Per federation round
NUM_WORKERS = 4           # i5 12th gen can handle 4 workers
PIN_MEMORY = torch.cuda.is_available()
USE_AMP = _auto_amp

# OOM recovery: if CUDA OOM occurs, retry with this reduced batch size
OOM_FALLBACK_BATCH_SIZE = max(4, BATCH_SIZE // 2)

# ============================================================
# Federation Configuration
# ============================================================
FED_ROUNDS = 5            # Number of federation rounds
FED_METHOD = "fedavg"     # "fedavg" or "fed_fibavg"

# Sequential client training on single GPU (no parallel GPU processes)
SEQUENTIAL_CLIENTS = True

# Fed-FibAvg configuration
FIBAVG_TIERS = {
    "fast": {"simulated_latency_ms": 50, "participation_weight": 1.0},
    "medium": {"simulated_latency_ms": 120, "participation_weight": 0.8},
    "slow": {"simulated_latency_ms": 300, "participation_weight": 0.6},
}
# Fibonacci sequence for scheduling cadence
FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21]

# Hospital tier assignments (for Fed-FibAvg latency simulation)
HOSPITAL_TIERS = {
    "hospital_a": "fast",
    "hospital_b": "medium",
    "hospital_c": "slow",
}

# ============================================================
# Demo Configuration
# ============================================================
DEMO_ROUNDS = 3
DEMO_LOCAL_EPOCHS = 1
DEMO_MAX_SAMPLES_PER_HOSPITAL = 300  # Larger subset OK with GPU
DEMO_BATCH_SIZE = BATCH_SIZE  # Same as normal with GPU

# ============================================================
# Privacy (EXPERIMENTAL / PLANNED)
# ============================================================
DP_ENABLED = False
DP_EPSILON = 1.0
DP_DELTA = 1e-5
DP_MAX_GRAD_NORM = 1.0
# Prime-Number DP: EXPERIMENTAL / NOT IMPLEMENTED
PRIME_DP_STATUS = "EXPERIMENTAL / PLANNED"

# ============================================================
# Explainability
# ============================================================
GRADCAM_ENABLED = True
GRADCAM_TARGET_LAYER = "features.denseblock4"  # For DenseNet121

# ============================================================
# Utility
# ============================================================
def ensure_dirs():
    """Create all required output directories."""
    dirs = [
        DATA_DIR, PROCESSED_DIR, CHECKPOINTS_DIR, RESULTS_DIR, DOCS_DIR,
        os.path.join(RESULTS_DIR, "fedavg"),
        os.path.join(RESULTS_DIR, "fed_fibavg"),
    ]
    dirs.extend(HOSPITAL_DIRS.values())
    for d in dirs:
        os.makedirs(d, exist_ok=True)


def get_config_dict():
    """Return configuration as a serializable dictionary."""
    return {
        "project": "FL-FedFib",
        "model": MODEL_NAME,
        "pretrained": PRETRAINED,
        "image_size": IMAGE_SIZE,
        "num_classes": NUM_CLASSES,
        "target_labels": TARGET_LABELS,
        "batch_size": BATCH_SIZE,
        "learning_rate": LEARNING_RATE,
        "local_epochs": LOCAL_EPOCHS,
        "fed_rounds": FED_ROUNDS,
        "num_hospitals": NUM_HOSPITALS,
        "seed": SEED,
        "device": str(DEVICE),
        "use_amp": USE_AMP,
        "dp_enabled": DP_ENABLED,
        "prime_dp_status": PRIME_DP_STATUS,
        "sequential_clients": SEQUENTIAL_CLIENTS,
    }


def get_hardware_summary():
    """Return hardware summary string."""
    lines = [f"Device: {DEVICE}"]
    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        lines.append(f"GPU: {props.name}")
        lines.append(f"VRAM: {props.total_mem / (1024**3):.1f} GB")
        lines.append(f"AMP: {USE_AMP}")
    else:
        lines.append("GPU: None (CPU fallback)")
        lines.append("AMP: Disabled")
    lines.append(f"Batch size: {BATCH_SIZE}")
    lines.append(f"Workers: {NUM_WORKERS}")
    return "\n".join(lines)
