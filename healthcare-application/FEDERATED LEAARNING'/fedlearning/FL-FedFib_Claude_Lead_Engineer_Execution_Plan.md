# FL-FedFib Prototype — Lead Engineer Execution Plan for Claude

## 0. DOCUMENT PURPOSE

You are the lead engineer responsible for building the **first working prototype of FL-FedFib** for a government startup funding demonstration.

This document is an execution contract, not a generic brainstorming prompt.

Your job is to take the project from its current state — **data collection / early EDA, with no completed ML/FL prototype** — to a reliable local demonstration.

The prototype must demonstrate the central idea clearly and honestly:

> Multiple simulated hospitals train on their own local chest X-ray data, exchange model updates rather than raw X-ray images, and contribute to a global diagnostic model. The prototype compares standard FedAvg against the proposed experimental Fed-FibAvg scheduling approach.

The prototype is **not** the final research system, production healthcare software, or proof of clinical efficacy.

---

# 1. PROJECT CONTEXT

## 1.1 Identity

- Project: **FL-FedFib**
- Team: **Team Chanakya**
- Working title: **Multi-Node Privacy-Preserving Federated Learning Engine for Medical Diagnostics**
- Domain: Healthcare AI / Privacy-Preserving Machine Learning / Medical Imaging
- Target demonstration: Government startup funding round

## 1.2 Problem

Small/regional hospitals may lack sufficiently diverse data to train robust diagnostic AI.

Centralizing patient X-rays creates privacy, regulatory, security, and institutional barriers.

The proposed approach is to allow hospitals to collaborate through federated learning while keeping raw X-ray data local.

## 1.3 Dataset

Intended research dataset:

**NIH Chest X-ray14 + MAPLEZ / LLM-enhanced annotations**

The project intends to use its multi-label pathology information to simulate heterogeneous hospital data.

For the first prototype, use a manageable subset and a small number of representative pathology classes if required for runtime.

Do not pretend the full 14-class research system is implemented if only a subset is used.

## 1.4 Proposed innovations

### Fed-FibAvg

A proposed Fibonacci-inspired client scheduling/aggregation concept intended to investigate heterogeneous client performance and straggler effects.

Current status:

**Experimental / unvalidated.**

Do not claim that it is mathematically proven optimal or that it produces a specific percentage improvement until experiments actually establish this.

### Prime-Number DP

A proposed privacy research direction.

Current status:

**Conceptual / not validated.**

Do not represent it as a proven cryptographic or differential-privacy mechanism.

For the MVP, standard DP may be used where practical. Prime-Number DP should remain clearly marked as research/future work unless a genuine implementation and validation exists.

## 1.5 Explainability

Use Grad-CAM where feasible to show which image regions influenced a model prediction.

The output must be described as model explanation, not clinical diagnosis.

---

# 2. NON-NEGOTIABLE ENGINEERING RULES

## Rule 1 — Never fabricate

Never fabricate:

- accuracy
- F1
- ROC-AUC
- latency
- communication savings
- convergence improvement
- privacy guarantees
- clinical performance
- successful experiments

Every displayed result must be one of:

- measured
- simulated and explicitly labelled
- not measured
- planned

## Rule 2 — Inspect before implementing

Before writing substantial code:

1. inspect the existing repository
2. inspect the available dataset files
3. inspect existing scripts
4. inspect `requirements.txt` / environment
5. inspect README/documentation
6. determine what actually exists

Do not assume code exists because the project description mentions it.

## Rule 3 — Build incrementally

Do not generate the entire system in one uncontrolled pass.

Complete one phase, run it, test it, record the result, then proceed.

## Rule 4 — Keep the prototype simple

Preferred stack:

- Python
- PyTorch
- Flower where useful
- Streamlit
- Pandas
- NumPy
- scikit-learn
- PIL/OpenCV
- Matplotlib
- Opacus where practical for standard DP

Avoid unnecessary:

- Kubernetes
- microservices
- cloud deployment
- complex databases
- real hospital integrations
- production authentication
- complicated cryptography
- unnecessary frontend frameworks

## Rule 5 — Preserve data locality

Raw X-ray images must remain inside the simulated hospital node.

The system may run all nodes on one laptop, but the code must maintain separate logical data silos.

Only model parameters/updates or explicitly defined non-raw information may cross the federation boundary.

## Rule 6 — Do not overclaim

Use terminology such as:

- prototype
- simulated hospital
- experimental
- proposed
- research
- unvalidated

Avoid:

- clinically validated
- production ready
- guaranteed private
- mathematically proven
- patent protected

unless genuine evidence exists.

---

# 3. TARGET MVP

The minimum successful prototype must demonstrate:

1. Three simulated hospital nodes
2. Separate local datasets
3. Non-IID data distribution
4. Local model training
5. Single-hospital baseline
6. Working FedAvg
7. Experimental Fed-FibAvg
8. Actual comparison metrics
9. Basic communication/participation visualization
10. X-ray prediction
11. Grad-CAM if technically feasible
12. Simple Streamlit UI
13. Demo mode
14. Experiment mode
15. README and reproducible setup

The complete production architecture is out of scope.

---

# 4. REQUIRED DEVELOPMENT SEQUENCE

Execute these phases strictly in order:

1. Phase 1 — Inspect Project and Design Architecture
2. Phase 2 — Build Dataset Pipeline
3. Phase 3 — Implement Local Model
4. Phase 4 — Implement FedAvg Baseline
5. Phase 5 — Implement Experimental Fed-FibAvg
6. Phase 6 — Build UI/UX
7. Phase 7 — Test Everything
8. Phase 8 — Fix Bugs and Stabilize
9. Phase 9 — Prepare Funding Demonstration

Do not skip the baseline.

Do not start UI polishing before the ML/FL pipeline works.

---

# PHASE 1 — INSPECT PROJECT / DESIGN ARCHITECTURE

## Objective

Understand the actual repository and establish the smallest architecture capable of supporting the MVP.

## Tasks

### 1. Inspect repository

Identify:

- directories
- Python files
- notebooks
- datasets
- CSV files
- image directories
- existing EDA scripts
- configuration files
- dependency files
- existing model code
- existing UI code

Create a concise inventory.

### 2. Inspect dataset

Determine:

- actual annotation filename
- available columns
- image identifiers
- pathology labels
- label encoding
- missing values
- class frequencies
- whether image files are physically available
- whether annotations map correctly to image filenames

Do not assume the dataset structure.

### 3. Define MVP architecture

Use this conceptual architecture:

```text
Hospital A ── Local Dataset ── Local Model ──┐
                                              │
Hospital B ── Local Dataset ── Local Model ──┼──> Coordinator
                                              │       │
Hospital C ── Local Dataset ── Local Model ──┘       │
                                                      ▼
                                               Global Model
                                                      │
                                                      ▼
                                             Prediction / Grad-CAM
```

### 4. Define module boundaries

Recommended structure:

```text
fl-fedfib/
├── app.py
├── config.py
├── requirements.txt
├── README.md
├── data/
│   ├── raw/
│   ├── processed/
│   ├── hospital_a/
│   ├── hospital_b/
│   └── hospital_c/
├── models/
│   └── model.py
├── training/
│   ├── local_train.py
│   ├── fedavg.py
│   └── fed_fibavg.py
├── experiments/
│   ├── run_experiment.py
│   └── evaluation.py
├── explainability/
│   └── gradcam.py
├── privacy/
│   └── dp.py
└── utils/
    ├── data_utils.py
    ├── metrics.py
    └── logging_utils.py
```

Do not create unnecessary modules.

## Phase 1 completion criteria

Phase 1 is complete only when:

- repository inventory is documented
- dataset structure is known
- actual implementation gaps are identified
- architecture is documented
- dependencies are identified
- MVP scope is frozen
- a clear run path is defined

Before moving on, produce:

`docs/PHASE_1_REPORT.md`

It must contain:

- current state
- discovered files
- dataset structure
- architecture
- assumptions
- risks
- Phase 2 plan

---

# PHASE 2 — DATASET PIPELINE

## Objective

Create a reproducible pipeline that converts the available dataset into three logical non-IID hospital silos.

## Tasks

### 2.1 Build dataset loader

Create a robust loader that:

- reads annotation CSV
- validates image paths
- maps labels to images
- reports missing images
- removes unusable rows
- produces reproducible train/validation/test splits

Never silently discard data.

Report how many samples are:

- loaded
- valid
- missing
- excluded

### 2.2 Select prototype labels

For the MVP, use a manageable subset of pathology labels if the full 14-class task is too large.

Selection must be based on actual dataset availability and class support.

Document the selection.

### 2.3 Create non-IID partitioner

Create three logical hospitals:

```text
Hospital_A
Hospital_B
Hospital_C
```

Use deterministic random seeds.

Example conceptual distribution:

```text
Hospital A → stronger representation of selected class group A
Hospital B → stronger representation of selected class group B
Hospital C → stronger representation of selected class group C
```

Do not claim these distributions represent real hospitals.

Label them:

**Simulated Non-IID Distribution**

### 2.4 Prevent leakage

The same image must never appear in training and test sets across hospitals.

Prefer splitting by image identity before hospital assignment.

### 2.5 Produce EDA

Generate:

- total sample count
- class distribution
- hospital distribution
- hospital/class matrix
- train/validation/test counts

## Phase 2 completion criteria

The following must work:

```bash
python -m data_pipeline.create_partitions
```

or an equivalent clear command.

It must produce:

```text
data/processed/
data/hospital_a/
data/hospital_b/
data/hospital_c/
```

and a partition report.

Create:

`docs/PHASE_2_REPORT.md`

Include:

- dataset statistics
- selected labels
- partition method
- non-IID evidence
- leakage checks
- known limitations

Do not proceed until the data pipeline is reproducible.

---

# PHASE 3 — LOCAL MODEL

## Objective

Build and validate one reliable local medical-image classifier before federating it.

## Model

Preferred:

**DenseNet121 pretrained on ImageNet**

Fallback:

**ResNet18**

Choose based on actual hardware/runtime.

Do not invent a new architecture.

## Tasks

### 3.1 Preprocessing

Implement:

- image loading
- resizing
- normalization
- train augmentation where appropriate
- validation/test preprocessing

Do not introduce medically inappropriate transformations.

### 3.2 Model head

Modify the classifier for the selected number of labels.

For multi-label classification, use:

`BCEWithLogitsLoss`

initially.

If class imbalance requires it, implement Focal Loss as a controlled experiment rather than introducing it before the baseline works.

### 3.3 Local training

Implement:

- train loop
- validation loop
- checkpoint saving
- loss tracking
- metrics
- device selection CPU/CUDA
- reproducibility seed

### 3.4 Single-hospital baseline

Train at least one local model independently.

Evaluate on a common evaluation set where appropriate.

Record:

- loss
- precision
- recall
- F1
- ROC-AUC where meaningful
- training time

## Phase 3 completion criteria

A command such as:

```bash
python -m training.local_train --hospital hospital_a
```

must successfully:

1. load local data
2. load model
3. train
4. validate
5. save checkpoint
6. output actual metrics

Create:

`docs/PHASE_3_REPORT.md`

No federated learning yet.

Do not move forward until the local model works reliably.

---

# PHASE 4 — FEDAVG BASELINE

## Objective

Build the simplest trustworthy federated-learning baseline.

This phase establishes the control condition for the research.

## Architecture

```text
Global Model
     ↓
Hospital A
Hospital B
Hospital C
     ↓
Local Training
     ↓
Model Updates
     ↓
FedAvg Aggregation
     ↓
New Global Model
```

## Tasks

### 4.1 Implement client abstraction

Each simulated hospital client must expose:

- local dataset
- local model
- train method
- evaluate method
- model parameter get/set
- local sample count
- local timing

### 4.2 Implement FedAvg

Use standard weighted FedAvg:

local models are aggregated according to the selected weighting rule, normally local sample count.

Do not modify FedAvg in this phase.

### 4.3 Run multiple rounds

Use a small number of rounds initially.

For every round record:

- participating clients
- local training time
- aggregation time
- global evaluation metrics
- communication size

### 4.4 Flower

Use Flower if it simplifies implementation.

If Flower creates unnecessary instability for the first local prototype, create a clean in-process FedAvg implementation first, then integrate Flower without changing the experiment semantics.

Do not sacrifice correctness merely to use a framework.

## Phase 4 completion criteria

A complete run must show:

```text
Round 1
→ clients train
→ updates aggregated
→ global model evaluated

Round 2
→ clients train
→ updates aggregated
→ global model evaluated

...

Final global metrics
```

Create:

`docs/PHASE_4_REPORT.md`

Include:

- FedAvg implementation
- experiment configuration
- actual metrics
- communication statistics
- known limitations

FedAvg becomes the baseline for Phase 5.

---

# PHASE 5 — EXPERIMENTAL FED-FIBAVG

## Objective

Implement the project's proposed Fibonacci-inspired client scheduling idea as a controlled experiment.

This phase must be scientifically cautious.

## Core concept

Measure client characteristics such as:

- local training time
- simulated/actual latency
- availability
- optionally data quality/sample count

Then classify clients into performance tiers.

Example:

```text
FAST
MEDIUM
SLOW
```

Assign a Fibonacci-inspired participation cadence.

Example sequence:

```text
1, 2, 3, 5, 8
```

The exact implementation must be explicitly documented.

## Critical rule

Do not alter multiple variables simultaneously without recording them.

The first comparison should be:

```text
FedAvg
vs
Fed-FibAvg scheduling
```

under comparable:

- model
- data
- number of rounds
- local epochs
- optimizer
- evaluation set

## Simulated latency

If real multi-machine latency is unavailable, simulate client latency.

Example:

```text
Hospital A → 50 ms
Hospital B → 120 ms
Hospital C → 300 ms
```

But label it:

**Simulated latency**

Do not present simulation as real hospital infrastructure measurements.

## Metrics

Measure:

- global F1
- ROC-AUC
- convergence behavior
- wall-clock training time
- client participation count
- waiting/straggler time
- communication volume
- number of aggregation rounds

## Required experiment

Run:

```text
Experiment A — FedAvg
Experiment B — Fed-FibAvg
```

under the same dataset/model conditions.

Generate comparative graphs.

## Scientific interpretation

If Fed-FibAvg performs worse, report that.

If it performs similarly, report that.

If it performs better, report the measured improvement.

Do not tune until the method wins.

## Phase 5 completion criteria

The system must be able to select:

```text
FedAvg
Fed-FibAvg
```

and run the same experiment pipeline.

Create:

`docs/PHASE_5_REPORT.md`

Include:

- exact algorithm definition
- scheduling rule
- experimental setup
- actual measurements
- comparison
- interpretation
- limitations
- threats to validity

Do not call Fed-FibAvg validated unless sufficient experiments support that statement.

---

# PHASE 6 — UI / UX

## Objective

Build a simple funding-demo interface around the working backend.

The UI is a demonstration layer, not the core engineering.

## Design principle

The UI must look:

- simple
- clinical
- professional
- restrained
- research-oriented
- easy to understand

It must NOT look like:

- futuristic AI
- neon dashboard
- cyberpunk
- generic AI SaaS
- excessive glassmorphism
- overly animated startup template

Avoid:

- purple/blue gradients
- glowing cards
- robot graphics
- brain graphics
- unnecessary icons
- excessive rounded cards
- animated backgrounds
- fake AI terminology

## Preferred UI

Use Streamlit unless there is a strong reason not to.

## Screens

### Screen 1 — Overview

Show:

- FL-FedFib
- one-line problem
- three simulated hospitals
- global model
- raw X-ray transfer = 0 in the prototype
- simple architecture diagram

### Screen 2 — Hospital Nodes

Show:

- Hospital A
- Hospital B
- Hospital C
- local sample count
- class distribution
- training status
- simulated/actual latency

### Screen 3 — Federated Training

Controls:

```text
Aggregation Method:
[ FedAvg | Fed-FibAvg ]

Rounds:
[ 5 ]

[ Start Training ]
```

Show:

- current round
- participating clients
- local training progress
- aggregation status
- global metrics

### Screen 4 — Results

Show actual comparison:

| Metric | FedAvg | Fed-FibAvg |
|---|---:|---:|
| F1 | measured | measured |
| ROC-AUC | measured | measured |
| Training time | measured | measured |
| Communication | measured | measured |
| Client participation | measured | measured |

If unavailable:

`Not measured`

### Screen 5 — X-Ray Demo

Allow:

- image upload
- analysis
- predictions
- confidence/probability
- Grad-CAM if implemented

Display:

> Research prototype. Not for clinical diagnosis.

## Demo mode

Add:

`Run Demonstration`

It should execute a small, reliable pipeline without requiring the evaluator to configure many parameters.

## Experiment mode

Allow configuration for research testing.

---

# PHASE 7 — TEST EVERYTHING

## Objective

Verify that the complete system actually works.

Testing is not optional.

## 7.1 Unit tests

Test:

- dataset loading
- label parsing
- partitioning
- no leakage
- model forward pass
- loss
- metric calculation
- weight serialization
- FedAvg aggregation
- Fed-FibAvg scheduler
- Grad-CAM generation

## 7.2 Integration tests

Test:

```text
Dataset
→ Hospital nodes
→ Local training
→ FedAvg
→ Global model
```

Then:

```text
Dataset
→ Hospital nodes
→ Local training
→ Fed-FibAvg
→ Global model
```

## 7.3 UI test

Test:

- application launch
- dataset loading
- demo button
- training
- results
- image upload
- prediction
- Grad-CAM
- error states

## 7.4 Failure tests

Test:

- missing dataset
- invalid image
- missing checkpoint
- CPU-only environment
- insufficient samples
- interrupted training
- corrupted CSV

The application must display useful messages.

## 7.5 Reproducibility

Run the same experiment twice with the same seed.

Confirm results are reasonably reproducible.

Create:

`docs/PHASE_7_TEST_REPORT.md`

Include:

- test count
- passed
- failed
- known issues
- reproducibility observations

---

# PHASE 8 — BUG FIXING / STABILIZATION

## Objective

Turn the working prototype into a reliable demo.

## Priority order

Fix in this order:

1. crashes
2. incorrect results
3. data leakage
4. incorrect aggregation
5. incorrect scheduling
6. broken UI flows
7. dependency problems
8. performance problems
9. visual polish

Do not spend time making buttons beautiful while the training pipeline is incorrect.

## Required stability pass

Run the full prototype from a clean environment.

Verify:

```bash
pip install -r requirements.txt
streamlit run app.py
```

The README must be sufficient for a new user to reproduce the setup.

## Remove

- debug prints
- dead code
- hardcoded local machine paths
- accidental secrets
- temporary files
- misleading claims
- fake metrics

## Phase 8 completion criteria

The complete demo should run from start to finish without manual code edits.

Create:

`docs/PHASE_8_STABILITY_REPORT.md`

---

# PHASE 9 — FUNDING DEMONSTRATION PREPARATION

## Objective

Prepare the prototype for a government startup funding evaluation.

The demo should communicate the concept in approximately 3–5 minutes.

## Demonstration sequence

### Step 1 — Problem

Show:

```text
Hospital A    Hospital B    Hospital C
     │             │             │
     └──── Cannot simply centralize ────┘
```

Explain:

Hospitals need collaborative learning but patient data should remain local.

### Step 2 — Local nodes

Show three hospitals.

Each has:

- local images
- local training
- local model

### Step 3 — Federation

Run:

`FedAvg`

Show:

```text
Local training
→ Model updates
→ Aggregation
→ Global model
```

### Step 4 — Proposed innovation

Run:

`Fed-FibAvg`

Show:

- client tiers
- participation schedule
- actual comparison

### Step 5 — Privacy concept

Show:

```text
RAW X-RAYS
   X
DO NOT LEAVE NODE

MODEL UPDATES
   ↓
COORDINATOR
```

### Step 6 — Clinical demo

Upload an X-ray.

Show:

- prediction
- confidence
- Grad-CAM

### Step 7 — Honest research status

Show:

```text
Implemented
Experimental
Planned
```

This is important.

Do not hide unfinished research.

---

# 5. FUNDING DEMO LANGUAGE

Use:

> "This prototype demonstrates the architecture and experimental workflow of privacy-preserving collaborative medical AI."

Use:

> "Fed-FibAvg is our proposed experimental scheduling strategy."

Use:

> "The current prototype evaluates whether the strategy can reduce heterogeneous-client bottlenecks."

Use:

> "The X-ray data remains within each simulated hospital node."

Do not use:

> "This is a clinically validated diagnostic system."

Do not use:

> "Fed-FibAvg guarantees 25% lower communication."

Do not use:

> "Prime-Number DP guarantees privacy."

---

# 6. DATA / RESULT INTEGRITY POLICY

Every experiment must produce a machine-readable result file.

Preferred:

```text
results/
├── fedavg/
│   ├── config.json
│   ├── metrics.json
│   └── history.csv
└── fed_fibavg/
    ├── config.json
    ├── metrics.json
    └── history.csv
```

Each result must record:

- date/time
- random seed
- dataset version/path
- classes
- hospital count
- model
- epochs
- batch size
- optimizer
- learning rate
- rounds
- aggregation method
- metrics
- latency assumptions
- whether latency was simulated

This makes the prototype defensible during questions.

---

# 7. EXPERIMENT CONFIGURATION

Centralize configuration.

Example:

```yaml
project:
  name: FL-FedFib

data:
  mode: demo
  num_hospitals: 3
  seed: 42

model:
  name: densenet121
  pretrained: true

training:
  local_epochs: 1
  batch_size: 8
  learning_rate: 0.0001
  rounds: 5

federation:
  method: fedavg

privacy:
  enabled: false
  method: standard_dp

explainability:
  gradcam: true
```

Do not scatter values throughout the code.

---

# 8. PERFORMANCE TARGET

This is a prototype for a normal laptop.

Prioritize predictable runtime.

Demo mode should finish within a practical presentation window.

If the full dataset is too large:

- use a reproducible subset
- reduce epochs
- reduce number of classes
- reduce rounds

Document the limitation.

Do not secretly use fake training.

---

# 9. DOCUMENTATION REQUIREMENTS

Maintain:

```text
docs/
├── PHASE_1_REPORT.md
├── PHASE_2_REPORT.md
├── PHASE_3_REPORT.md
├── PHASE_4_REPORT.md
├── PHASE_5_REPORT.md
├── PHASE_7_TEST_REPORT.md
├── PHASE_8_STABILITY_REPORT.md
└── FUNDING_DEMO.md
```

`FUNDING_DEMO.md` must contain:

- 3-minute script
- system workflow
- what is implemented
- what is experimental
- what is planned
- known limitations
- likely evaluator questions

---

# 10. OPEN TECHNICAL RISKS

Track these explicitly.

## High priority

### Risk 1 — Fed-FibAvg mathematical validity

The scheduling concept may not improve convergence or may harm model quality.

Mitigation:

- retain FedAvg baseline
- conduct controlled experiments
- measure both accuracy and efficiency
- do not assume improvement

### Risk 2 — Extreme non-IID data

The global model may become unstable.

Mitigation:

- begin with moderate skew
- increase heterogeneity gradually
- record failure cases

### Risk 3 — Limited compute

Mitigation:

- use transfer learning
- small demo subset
- few local epochs
- CPU/GPU compatibility

### Risk 4 — Dataset/image mismatch

Mitigation:

- validate every image path
- produce missing-image report
- never silently train on incomplete labels

### Risk 5 — Prototype becoming over-engineered

Mitigation:

Always ask:

> Does this feature help demonstrate the core funding proposition?

If not, defer it.

---

# 11. WHAT MUST NOT BE IMPLEMENTED IN THE MVP

Unless required to make the demonstration work, do not build:

- real hospital deployment
- real patient EMR integration
- real DICOM hospital network
- cloud infrastructure
- production authentication
- Kubernetes
- complex database systems
- production-grade cryptographic protocols
- full legal compliance system
- full 14-class state-of-the-art model
- production monitoring
- mobile application
- commercial billing
- advanced analytics unrelated to the core demonstration

These belong to later phases.

---

# 12. ENGINEERING CHECKPOINT AFTER EACH PHASE

At the end of every phase, report:

## Completed

What actually works.

## Not completed

What remains.

## Evidence

Commands/tests/results proving completion.

## Problems

Current failures.

## Decisions

Any technical decision made.

## Next phase

Exactly what will be done next.

Never say a phase is complete merely because code was written.

A phase is complete only when the acceptance criteria are demonstrated.

---

# 13. FINAL ACCEPTANCE CRITERIA

The prototype is ready for the funding round only when all of the following are true:

### Data

- [ ] Dataset loads correctly
- [ ] Image/label mapping works
- [ ] Three hospital partitions exist
- [ ] Non-IID distribution is measurable
- [ ] Leakage check passes

### ML

- [ ] Local model trains
- [ ] Local metrics are calculated
- [ ] Checkpoint saves/loads correctly

### Federated Learning

- [ ] FedAvg works
- [ ] Multiple rounds work
- [ ] Global model is evaluated
- [ ] Model updates, not raw images, cross the federation boundary
- [ ] Fed-FibAvg experimental scheduler works

### Research

- [ ] FedAvg/Fed-FibAvg comparison is reproducible
- [ ] Actual metrics are stored
- [ ] Simulated assumptions are labelled
- [ ] No unsupported claims are displayed

### Explainability

- [ ] X-ray upload works
- [ ] Prediction works
- [ ] Grad-CAM works or is explicitly marked unavailable

### UI

- [ ] UI is simple
- [ ] UI is professional
- [ ] UI is non-futuristic
- [ ] Demo can be run without touching code
- [ ] Errors are understandable

### Reliability

- [ ] Clean installation works
- [ ] Application launches
- [ ] End-to-end demo works
- [ ] No secrets are committed
- [ ] README is complete

### Presentation

- [ ] 3–5 minute demo path exists
- [ ] Problem is clear
- [ ] Architecture is clear
- [ ] Innovation is clear
- [ ] Actual evidence is shown
- [ ] Limitations are clearly stated

---

# 14. FINAL OUTPUT EXPECTED FROM YOU

At the end of the entire execution, provide:

## A. Working repository

With the agreed structure.

## B. Runnable application

```bash
streamlit run app.py
```

## C. Reproducible experiment commands

For example:

```bash
python -m experiments.run_experiment --method fedavg
python -m experiments.run_experiment --method fed_fibavg
```

## D. Actual results

Stored in `results/`.

## E. Documentation

All phase reports.

## F. Funding demo script

A concise walkthrough that a founder can use in front of evaluators.

## G. Technical limitations

A truthful list of what is not yet validated.

---

# 15. LEAD ENGINEER BEHAVIOR

While executing this plan, behave like a senior engineer supervising a research prototype.

You must:

1. Challenge technically weak assumptions.
2. Prefer reproducibility over cleverness.
3. Prefer simple implementations.
4. Never fabricate evidence.
5. Never hide failures.
6. Never call conceptual work implemented.
7. Never introduce unnecessary dependencies.
8. Preserve the distinction between research hypothesis and engineering implementation.
9. Test code instead of merely generating it.
10. Fix root causes instead of patching symptoms.
11. Keep the architecture extensible but small.
12. Maintain clear documentation.
13. Keep the funding demonstration reliable.
14. Do not restart from zero after every phase.
15. Maintain a running project state.

When something fails, report:

```text
PROBLEM
CAUSE
FIX
TEST
STATUS
```

When something is uncertain, report:

```text
UNKNOWN
WHY IT MATTERS
HOW TO VALIDATE
```

When proposing a change, report:

```text
CURRENT APPROACH
PROPOSED CHANGE
WHY
TRADE-OFF
```

---

# 16. MOST IMPORTANT INSTRUCTION

Do not optimize for how impressive the code looks.

Optimize for whether an evaluator can watch the prototype and understand:

```text
HOSPITALS HAVE DATA
        ↓
DATA CANNOT SIMPLY BE CENTRALIZED
        ↓
TRAIN LOCALLY
        ↓
SHARE MODEL UPDATES
        ↓
FEDERATE
        ↓
BUILD GLOBAL MODEL
        ↓
COMPARE FEDAVG WITH FED-FIBAVG
        ↓
SHOW MEDICAL PREDICTION
        ↓
SHOW EXPLANATION
```

The prototype should make the proposed research question visible:

> **Can Fibonacci-inspired client scheduling make federated learning more efficient under heterogeneous hospital conditions without requiring raw patient data to leave local nodes?**

That is the core story.

Build the smallest real system capable of demonstrating it.

---

# 17. START NOW

Begin with **PHASE 1 only**.

Do not implement Phase 2–9 until Phase 1 has been inspected and completed.

Your first response must contain:

1. Repository inspection findings
2. Dataset inspection findings
3. Existing implementation inventory
4. Architecture proposal
5. MVP scope
6. Risks discovered
7. Phase 1 acceptance checklist
8. Exact next commands/actions

Then execute Phase 1.

Do not ask me to restate information already contained in this instruction or the project files.
