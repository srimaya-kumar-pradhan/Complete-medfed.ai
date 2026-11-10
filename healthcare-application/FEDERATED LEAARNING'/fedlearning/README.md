# FL-FedFib

**Multi-Node Privacy-Preserving Federated Learning Engine for Medical Diagnostics**

*Team Chanakya*

---

## Overview

FL-FedFib is a research prototype that demonstrates privacy-preserving collaborative medical AI training through federated learning. Multiple simulated hospitals train on their local chest X-ray data, exchange model updates (never raw images), and contribute to a global diagnostic model.

The prototype compares standard **FedAvg** against the proposed experimental **Fed-FibAvg** scheduling approach.

> **Research Question:** Can Fibonacci-inspired client scheduling improve federated learning efficiency under heterogeneous hospital conditions while keeping raw patient data local?

## Status

| Component | Status |
|-----------|--------|
| Local training | IMPLEMENTED |
| FedAvg baseline | IMPLEMENTED |
| Fed-FibAvg scheduling | EXPERIMENTAL |
| Grad-CAM explainability | IMPLEMENTED |
| Streamlit UI | IMPLEMENTED |
| Non-IID data partitioning | IMPLEMENTED |
| Prime-Number DP | PLANNED |
| Clinical validation | NOT IN SCOPE |

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

For CUDA (NVIDIA GPU):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 2. Create data partitions

```bash
python -m data_pipeline.create_partitions
```

### 3. Run experiments

Demo mode (quick, small subset):
```bash
python -m experiments.run_experiment --method both --demo
```

Full experiment:
```bash
python -m experiments.run_experiment --method both --rounds 5 --epochs 2
```

### 4. Launch UI

```bash
streamlit run app.py
```

## Architecture

```
Hospital A ── Local Data ── Local Training ──┐
                                              │
Hospital B ── Local Data ── Local Training ──┼──> Coordinator
                                              │       │
Hospital C ── Local Data ── Local Training ──┘       │
                                                      ↓
                                                Global Model
                                                      │
                                                ┌─────┴─────┐
                                                ↓           ↓
                                          Prediction   Grad-CAM
```

**Raw X-ray images remain at each hospital node. Only model parameter updates cross the federation boundary.**

## Dataset

NIH Chest X-ray14 (subset available on disk). Labels used in MVP:

1. No Finding
2. Infiltration
3. Effusion
4. Atelectasis
5. Nodule

## Fed-FibAvg (EXPERIMENTAL)

Fibonacci-inspired client scheduling:
- **Fast** hospitals: train every round (cadence = 1)
- **Medium** hospitals: train every 2nd round (cadence = 2)
- **Slow** hospitals: train every 3rd round (cadence = 3)

Non-participating clients contribute stale parameters to aggregation.

**This is an experimental research idea. It has not been validated as a superior approach.**

## Project Structure

```
fl-fedfib/
├── app.py                    # Streamlit UI
├── config.py                 # Central configuration
├── requirements.txt          # Dependencies
├── data_pipeline/
│   ├── dataset.py            # PyTorch Dataset
│   └── create_partitions.py  # Hospital data partitioning
├── models/
│   └── model.py              # DenseNet121 classifier
├── training/
│   ├── local_train.py        # Single-hospital training
│   ├── fedavg.py             # FedAvg baseline
│   └── fed_fibavg.py         # Fed-FibAvg (experimental)
├── experiments/
│   └── run_experiment.py     # Experiment runner
├── explainability/
│   └── gradcam.py            # Grad-CAM visualization
├── utils/
│   └── metrics.py            # Metric helpers
├── data/                     # Partition manifests
├── checkpoints/              # Model checkpoints
├── results/                  # Experiment results
└── docs/                     # Phase reports
```

## Hardware

- Tested on: NVIDIA RTX 2050 (4GB VRAM) + Intel i5 12th Gen
- Supports: CUDA with AMP (mixed precision) and CPU fallback
- Sequential client training on single GPU

## Limitations

- This is a research prototype, not production healthcare software
- Only 5 out of 14 pathology classes are used in the MVP
- Hospitals are simulated on a single machine
- Latency is simulated, not measured from real infrastructure
- Fed-FibAvg is experimental and unvalidated
- Prime-Number DP is not implemented
- Not clinically validated

## License

Research prototype for government startup funding demonstration.
