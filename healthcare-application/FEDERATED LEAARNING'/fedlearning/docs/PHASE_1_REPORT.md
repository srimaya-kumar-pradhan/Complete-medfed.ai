# Phase 1 Report — Project Inspection & Architecture

**Date**: 2026-08-24
**Status**: COMPLETE

---

## 1. Repository Inventory

### Current State: Data collection / early EDA only

| Item | Status |
|------|--------|
| Execution plan | Present (FL-FedFib_Claude_Lead_Engineer_Execution_Plan.md) |
| Dataset (NIH Chest X-ray14) | Partially present (images_001 through images_005) |
| Data_Entry_2017.csv | Present (112,120 rows) |
| train_val_list.txt | Present (86,524 images) |
| test_list.txt | Present (25,596 images) |
| BBox_List_2017.csv | Present (986 bounding boxes) |
| ML code | **NOT IMPLEMENTED** |
| FL code | **NOT IMPLEMENTED** |
| UI code | **NOT IMPLEMENTED** |
| Model code | **NOT IMPLEMENTED** |
| Requirements | **NOT IMPLEMENTED** (created in this phase) |
| Configuration | **NOT IMPLEMENTED** (created in this phase) |

### Files Created in Phase 1

- `config.py` — Central configuration
- `requirements.txt` — Dependencies
- `data_pipeline/__init__.py` — Package init
- `models/__init__.py` — Package init
- `training/__init__.py` — Package init
- `experiments/__init__.py` — Package init
- `explainability/__init__.py` — Package init
- `utils/__init__.py` — Package init
- `inspect_dataset.py` — Dataset inspection script

---

## 2. Dataset Structure

### Annotation File: `DataSET/Data_Entry_2017.csv`

| Column | Description |
|--------|-------------|
| Image Index | Filename (e.g., 00000001_000.png) |
| Finding Labels | Pipe-separated pathology labels |
| Follow-up # | Follow-up visit number |
| Patient ID | Unique patient identifier |
| Patient Age | Patient age |
| Patient Gender | M/F |
| View Position | PA/AP |

### Image Availability

| Directory | Images |
|-----------|--------|
| images_001 | 4,999 |
| images_002 | 10,000 |
| images_003 | 10,000 |
| images_004 | 10,000 |
| images_005 | 6,965 |
| images_006-012 | NOT PRESENT |
| **Total on disk** | **41,964** |
| **Total in CSV** | **112,120** |
| **Coverage** | **37.4%** |

### Label Distribution (Full Dataset)

| Label | Count | % |
|-------|------:|--:|
| No Finding | 60,361 | 53.8% |
| Infiltration | 19,894 | 17.7% |
| Effusion | 13,317 | 11.9% |
| Atelectasis | 11,559 | 10.3% |
| Nodule | 6,331 | 5.6% |
| Mass | 5,782 | 5.2% |
| Pneumothorax | 5,302 | 4.7% |
| Consolidation | 4,667 | 4.2% |
| Pleural_Thickening | 3,385 | 3.0% |
| Cardiomegaly | 2,776 | 2.5% |
| Emphysema | 2,516 | 2.2% |
| Edema | 2,303 | 2.1% |
| Fibrosis | 1,686 | 1.5% |
| Pneumonia | 1,431 | 1.3% |
| Hernia | 227 | 0.2% |

Multi-label images: 20,796 (18.5%)

### Official Splits (Available on Disk)

| Split | Listed | Available |
|-------|-------:|----------:|
| Train/Val | 86,524 | 34,957 |
| Test | 25,596 | 7,007 |
| Overlap | 0 | 0 |

---

## 3. MVP Architecture

```
Hospital A -- Local Dataset -- Local Model --+
                                              |
Hospital B -- Local Dataset -- Local Model --+--> Coordinator
                                              |       |
Hospital C -- Local Dataset -- Local Model --+       |
                                                      v
                                               Global Model
                                                      |
                                                      v
                                             Prediction / Grad-CAM
```

### Module Structure

```
fl-fedfib/
├── app.py                    # Streamlit UI
├── config.py                 # Central configuration
├── requirements.txt          # Dependencies
├── data_pipeline/
│   ├── __init__.py
│   ├── dataset.py            # PyTorch Dataset class
│   └── create_partitions.py  # Hospital data partitioning
├── models/
│   ├── __init__.py
│   └── model.py              # DenseNet121 medical classifier
├── training/
│   ├── __init__.py
│   ├── local_train.py        # Single-hospital training
│   ├── fedavg.py             # FedAvg aggregation
│   └── fed_fibavg.py         # Experimental Fed-FibAvg
├── experiments/
│   ├── __init__.py
│   ├── run_experiment.py     # Experiment runner
│   └── evaluation.py         # Metrics computation
├── explainability/
│   ├── __init__.py
│   └── gradcam.py            # Grad-CAM visualization
├── utils/
│   ├── __init__.py
│   └── metrics.py            # Metric helpers
├── data/
│   ├── processed/            # Processed partition manifests
│   ├── hospital_a/           # Hospital A data manifest
│   ├── hospital_b/           # Hospital B data manifest
│   └── hospital_c/           # Hospital C data manifest
├── checkpoints/              # Model checkpoints
├── results/                  # Experiment results
│   ├── fedavg/
│   └── fed_fibavg/
└── docs/                     # Phase reports
```

---

## 4. MVP Scope (Frozen)

### Labels: 5 classes

1. No Finding
2. Infiltration
3. Effusion
4. Atelectasis
5. Nodule

### Model: DenseNet121 (pretrained ImageNet)

Fallback: ResNet18 if DenseNet121 is too slow on CPU.

### Task: Multi-label classification with BCEWithLogitsLoss

### Federation: 3 simulated hospitals, in-process FedAvg (no Flower)

### Hardware: CPU-only (CUDA not available)

### Decision: In-process federation

Flower adds complexity for a single-machine prototype. We implement clean in-process FedAvg first. The architecture remains modular enough to integrate Flower later.

---

## 5. Assumptions

1. Only images_001 through images_005 are available (~42K images)
2. The prototype will use only images that exist on disk
3. Patient-level splitting prevents data leakage
4. All 3 hospitals run on one machine (simulated)
5. CPU training — demo subset size must be small enough for practical runtime
6. DenseNet121 with ImageNet pretrained weights should work on CPU with small batch size

---

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Only 37% of images available | Medium | Filter to available images only; sufficient for MVP |
| CPU-only training slow | High | Use small demo subset (200 samples/hospital), few epochs |
| Class imbalance (No Finding = 54%) | Medium | BCEWithLogitsLoss first; Focal Loss as follow-up |
| DenseNet121 too slow on CPU | Medium | Fallback to ResNet18 |
| Non-IID partition may destabilize FL | Medium | Start with moderate skew |

---

## 7. Phase 2 Plan

1. Build `data_pipeline/dataset.py` — PyTorch Dataset for chest X-rays
2. Build `data_pipeline/create_partitions.py` — Non-IID hospital partitioner
3. Validate image loading, label encoding, and patient-level splitting
4. Generate partition statistics and EDA
5. Run and verify the pipeline

---

## 8. Phase 1 Acceptance Checklist

- [x] Repository inventory documented
- [x] Dataset structure known
- [x] Implementation gaps identified
- [x] Architecture documented
- [x] Dependencies identified
- [x] MVP scope frozen
- [x] Run path defined
