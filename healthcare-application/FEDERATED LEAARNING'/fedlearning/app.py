"""
FL-FedFib Streamlit Application
==================================
Funding demonstration interface for the FL-FedFib prototype.

Screens:
  1. Overview — Problem statement & architecture
  2. Hospital Nodes — Data distribution & status
  3. Federated Training — Run FedAvg / Fed-FibAvg
  4. Results — Comparison metrics
  5. X-Ray Demo — Upload, predict, Grad-CAM

Usage:
    streamlit run app.py
"""
import os
import sys
import json
import time
import copy
import numpy as np
import pandas as pd
import torch
from PIL import Image
import streamlit as st
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from models.model import create_model, get_model_param_count
from data_pipeline.dataset import get_eval_transforms
from explainability.gradcam import GradCAM, create_gradcam_overlay
from utils.metrics import format_metrics

# ============================================================
# Page Configuration
# ============================================================
st.set_page_config(
    page_title="FL-FedFib | Federated Learning Prototype",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================================
# Custom CSS — Simple, clinical, professional
# ============================================================
st.markdown("""
<style>
    /* Clean, clinical styling */
    .main .block-container {
        padding-top: 1.5rem;
        max-width: 1100px;
    }
    
    .stMetric {
        background: #f8f9fa;
        padding: 0.8rem;
        border-radius: 4px;
        border-left: 3px solid #2c5282;
    }
    
    .disclaimer {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        padding: 0.6rem 1rem;
        margin: 0.5rem 0;
        font-size: 0.85rem;
        color: #856404;
    }
    
    .status-tag {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .tag-implemented { background: #d4edda; color: #155724; }
    .tag-experimental { background: #fff3cd; color: #856404; }
    .tag-planned { background: #f8d7da; color: #721c24; }
    
    h1, h2, h3 { color: #1a365d; }
    
    .hospital-card {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
</style>
""", unsafe_allow_html=True)


# ============================================================
# Sidebar Navigation
# ============================================================
st.sidebar.title("FL-FedFib")
st.sidebar.caption("Federated Learning Prototype")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigation",
    ["Overview", "Hospital Nodes", "Federated Training",
     "Results", "X-Ray Demo"],
    index=0,
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    '<div class="disclaimer">Research prototype. '
    'Not for clinical use.</div>',
    unsafe_allow_html=True,
)
st.sidebar.markdown(f"**Device:** {config.DEVICE}")
if torch.cuda.is_available():
    st.sidebar.markdown(
        f"**GPU:** {torch.cuda.get_device_properties(0).name}"
    )
st.sidebar.markdown(f"**AMP:** {'Enabled' if config.USE_AMP else 'Disabled'}")


# ============================================================
# Helper Functions
# ============================================================
def load_partition_metadata():
    """Load partition metadata if available."""
    meta_path = os.path.join(config.PROCESSED_DIR, "partition_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            return json.load(f)
    return None


def load_experiment_results(method):
    """Load experiment results for a method."""
    path = os.path.join(config.RESULTS_DIR, method, "experiment.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def load_comparison():
    """Load comparison results."""
    path = os.path.join(config.RESULTS_DIR, "comparison.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def status_tag(status):
    """Render a status tag."""
    css_class = {
        "IMPLEMENTED": "tag-implemented",
        "EXPERIMENTAL": "tag-experimental",
        "PLANNED": "tag-planned",
    }.get(status, "tag-planned")
    return f'<span class="status-tag {css_class}">{status}</span>'


# ============================================================
# Page: Overview
# ============================================================
if page == "Overview":
    st.title("FL-FedFib")
    st.markdown("**Multi-Node Privacy-Preserving Federated Learning for Medical Diagnostics**")
    st.markdown("*Team Chanakya*")
    
    st.markdown("---")
    
    st.header("Problem")
    st.markdown("""
    Regional hospitals often lack sufficient data to train robust diagnostic AI independently.
    Centralizing patient X-rays raises **privacy, regulatory, and security** barriers.
    
    **FL-FedFib** demonstrates how hospitals can collaboratively train a diagnostic model
    through **federated learning** — without sharing raw patient images.
    """)
    
    st.header("Architecture")
    st.code("""
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
    
    RAW X-RAY IMAGES: remain at each hospital node
    MODEL UPDATES ONLY: cross the federation boundary
    """, language="text")
    
    st.header("Research Question")
    st.info(
        "Can Fibonacci-inspired client scheduling improve federated learning "
        "efficiency under heterogeneous hospital conditions while keeping "
        "raw patient data local?"
    )
    
    st.header("Implementation Status")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("#### Implemented")
        st.markdown(f"""
        - {status_tag('IMPLEMENTED')} Local training
        - {status_tag('IMPLEMENTED')} FedAvg baseline
        - {status_tag('IMPLEMENTED')} Non-IID data partitioning
        - {status_tag('IMPLEMENTED')} Grad-CAM
        - {status_tag('IMPLEMENTED')} Streamlit UI
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("#### Experimental")
        st.markdown(f"""
        - {status_tag('EXPERIMENTAL')} Fed-FibAvg scheduling
        - {status_tag('EXPERIMENTAL')} Fibonacci participation cadence
        - {status_tag('EXPERIMENTAL')} Simulated hospital latency
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("#### Planned")
        st.markdown(f"""
        - {status_tag('PLANNED')} Prime-Number DP
        - {status_tag('PLANNED')} Real multi-node deployment
        - {status_tag('PLANNED')} Full 14-class model
        - {status_tag('PLANNED')} Clinical validation
        """, unsafe_allow_html=True)
    
    st.markdown(
        '<div class="disclaimer">'
        'This is a research prototype for a government startup funding demonstration. '
        'It is not clinically validated or production-ready.'
        '</div>',
        unsafe_allow_html=True,
    )


# ============================================================
# Page: Hospital Nodes
# ============================================================
elif page == "Hospital Nodes":
    st.title("Simulated Hospital Nodes")
    st.markdown("Three simulated hospitals with **non-IID data distribution**.")
    st.caption("SIMULATED Non-IID Distribution — Not real hospital data.")
    
    meta = load_partition_metadata()
    
    if meta is None:
        st.warning(
            "Data partitions not created yet. "
            "Run: `python -m data_pipeline.create_partitions`"
        )
    else:
        cols = st.columns(3)
        hospital_display = {
            "hospital_a": ("Hospital A", "Fast", "#28a745"),
            "hospital_b": ("Hospital B", "Medium", "#ffc107"),
            "hospital_c": ("Hospital C", "Slow", "#dc3545"),
        }
        
        for i, h_name in enumerate(config.HOSPITAL_NAMES):
            h_meta = meta.get(h_name, {})
            display_name, tier, color = hospital_display[h_name]
            
            with cols[i]:
                st.markdown(
                    f'<div class="hospital-card">'
                    f'<h3 style="color: {color};">{display_name}</h3>'
                    f'<p>Tier: <b>{tier}</b> '
                    f'(Simulated latency: {config.FIBAVG_TIERS[tier.lower()]["simulated_latency_ms"]}ms)</p>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                
                st.metric("Train Samples", h_meta.get("train_samples", "?"))
                st.metric("Val Samples", h_meta.get("val_samples", "?"))
                st.metric("Train Patients", h_meta.get("train_patients", "?"))
                
                # Load and show class distribution
                train_csv = os.path.join(config.HOSPITAL_DIRS[h_name], "train.csv")
                if os.path.exists(train_csv):
                    df = pd.read_csv(train_csv)
                    dist = {label: int(df[label].sum()) for label in config.TARGET_LABELS}
                    
                    fig, ax = plt.subplots(figsize=(4, 2.5))
                    bars = ax.barh(list(dist.keys()), list(dist.values()), color=color, alpha=0.7)
                    ax.set_xlabel("Count")
                    ax.set_title(f"{display_name} Classes", fontsize=10)
                    ax.tick_params(labelsize=8)
                    plt.tight_layout()
                    st.pyplot(fig)
                    plt.close()
        
        # Global test set info
        st.markdown("---")
        st.subheader("Global Test Set")
        test_meta = meta.get("global_test", {})
        col1, col2 = st.columns(2)
        col1.metric("Test Samples", test_meta.get("samples", "?"))
        col2.metric("Test Patients", test_meta.get("patients", "?"))
        
        st.markdown("""
        **Data locality principle:** Raw X-ray images remain within each hospital node.
        Only model parameter updates cross the federation boundary.
        """)


# ============================================================
# Page: Federated Training
# ============================================================
elif page == "Federated Training":
    st.title("Federated Training")
    
    st.markdown("---")
    
    # Mode selection
    mode = st.radio("Mode", ["Demo (Quick)", "Experiment"], horizontal=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        method = st.selectbox(
            "Aggregation Method",
            ["FedAvg", "Fed-FibAvg (EXPERIMENTAL)", "Both (Comparison)"]
        )
    
    with col2:
        if mode == "Demo (Quick)":
            rounds = st.number_input("Rounds", 1, 10, config.DEMO_ROUNDS)
            local_epochs = config.DEMO_LOCAL_EPOCHS
        else:
            rounds = st.number_input("Rounds", 1, 20, config.FED_ROUNDS)
            local_epochs = st.number_input("Local Epochs", 1, 5, config.LOCAL_EPOCHS)
    
    with col3:
        if mode == "Demo (Quick)":
            max_samples = st.number_input(
                "Samples/Hospital", 50, 1000,
                config.DEMO_MAX_SAMPLES_PER_HOSPITAL,
            )
        else:
            max_samples = st.number_input(
                "Samples/Hospital (0=all)", 0, 50000, 0
            )
            if max_samples == 0:
                max_samples = None
    
    if method == "Fed-FibAvg (EXPERIMENTAL)":
        st.info(
            "**Fed-FibAvg** uses Fibonacci-inspired client scheduling. "
            "Fast clients train every round; slower clients train less frequently. "
            "This is an EXPERIMENTAL approach."
        )
    
    # Training execution
    if st.button("Start Training", type="primary"):
        progress_bar = st.progress(0)
        status_text = st.empty()
        metrics_display = st.empty()
        round_log = st.empty()
        
        all_round_data = []
        
        def progress_callback(round_num, total, round_data):
            progress_bar.progress(round_num / total)
            gm = round_data.get("global_metrics", {})
            status_text.markdown(
                f"**Round {round_num}/{total}** | "
                f"F1: {gm.get('f1_macro', 0):.4f} | "
                f"Time: {round_data.get('round_time_s', 0):.1f}s"
            )
            all_round_data.append(round_data)
        
        try:
            if method == "FedAvg":
                from training.fedavg import run_fedavg
                results = run_fedavg(
                    num_rounds=rounds,
                    local_epochs=local_epochs,
                    max_samples=max_samples,
                    progress_callback=progress_callback,
                )
                st.success("FedAvg training complete!")
                
            elif method == "Fed-FibAvg (EXPERIMENTAL)":
                from training.fed_fibavg import run_fed_fibavg
                results = run_fed_fibavg(
                    num_rounds=rounds,
                    local_epochs=local_epochs,
                    max_samples=max_samples,
                    progress_callback=progress_callback,
                )
                st.success("Fed-FibAvg training complete!")
                
            elif method == "Both (Comparison)":
                status_text.markdown("**Running FedAvg...**")
                from training.fedavg import run_fedavg
                from training.fed_fibavg import run_fed_fibavg
                from experiments.run_experiment import compare_experiments
                
                fedavg_results = run_fedavg(
                    num_rounds=rounds,
                    local_epochs=local_epochs,
                    max_samples=max_samples,
                )
                progress_bar.progress(0.5)
                
                status_text.markdown("**Running Fed-FibAvg...**")
                fibavg_results = run_fed_fibavg(
                    num_rounds=rounds,
                    local_epochs=local_epochs,
                    max_samples=max_samples,
                )
                progress_bar.progress(1.0)
                
                comparison = compare_experiments(fedavg_results, fibavg_results)
                comp_path = os.path.join(config.RESULTS_DIR, "comparison.json")
                with open(comp_path, "w") as f:
                    json.dump(comparison, f, indent=2, default=str)
                
                st.success("Both experiments complete! See Results page.")
            
            progress_bar.progress(1.0)
            status_text.markdown("**Training complete.**")
            
        except Exception as e:
            st.error(f"Training failed: {str(e)}")
            import traceback
            st.code(traceback.format_exc())
    
    # Show existing results if available
    st.markdown("---")
    st.subheader("Previous Results")
    
    for method_key, method_name in [("fedavg", "FedAvg"), ("fed_fibavg", "Fed-FibAvg")]:
        results = load_experiment_results(method_key)
        if results:
            with st.expander(f"{method_name} - Last Run"):
                fm = results.get("final_metrics", {})
                col1, col2, col3, col4 = st.columns(4)
                col1.metric("F1 (macro)", f"{fm.get('f1_macro', 0):.4f}")
                col2.metric("ROC-AUC", f"{fm.get('roc_auc_macro', 0):.4f}" 
                           if not np.isnan(fm.get('roc_auc_macro', float('nan'))) else "N/A")
                col3.metric("Time", f"{results.get('total_time_s', 0):.1f}s")
                col4.metric("Rounds", results.get("num_rounds", "?"))
                
                # Convergence plot
                rounds_data = results.get("rounds", [])
                if rounds_data:
                    f1_values = [r["global_metrics"]["f1_macro"] for r in rounds_data]
                    fig, ax = plt.subplots(figsize=(6, 3))
                    ax.plot(range(1, len(f1_values) + 1), f1_values,
                           marker='o', linewidth=2, color='#2c5282')
                    ax.set_xlabel("Round")
                    ax.set_ylabel("F1 (macro)")
                    ax.set_title(f"{method_name} Convergence")
                    ax.grid(True, alpha=0.3)
                    plt.tight_layout()
                    st.pyplot(fig)
                    plt.close()


# ============================================================
# Page: Results
# ============================================================
elif page == "Results":
    st.title("Experiment Results")
    
    comparison = load_comparison()
    fedavg_results = load_experiment_results("fedavg")
    fibavg_results = load_experiment_results("fed_fibavg")
    
    if comparison:
        st.header("FedAvg vs Fed-FibAvg Comparison")
        st.caption("EXPERIMENTAL comparison — single prototype run")
        
        fa = comparison.get("fedavg", {})
        fb = comparison.get("fed_fibavg", {})
        diff = comparison.get("difference", {})
        
        # Metrics table
        data = []
        metrics = [
            ("F1 (macro)", "f1_macro"),
            ("F1 (micro)", "f1_micro"),
            ("ROC-AUC (macro)", "roc_auc_macro"),
            ("Precision (macro)", "precision_macro"),
            ("Recall (macro)", "recall_macro"),
        ]
        
        for label, key in metrics:
            va = fa.get(key)
            vb = fb.get(key)
            va_str = f"{va:.4f}" if va is not None and not np.isnan(va) else "N/A"
            vb_str = f"{vb:.4f}" if vb is not None and not np.isnan(vb) else "N/A"
            
            d = diff.get(f"{key}_diff")
            d_str = f"{d:+.4f}" if d is not None else ""
            
            data.append({"Metric": label, "FedAvg": va_str,
                        "Fed-FibAvg": vb_str, "Difference": d_str})
        
        # Add non-metric rows
        ta = fa.get("total_time_s")
        tb = fb.get("total_time_s")
        data.append({
            "Metric": "Training Time",
            "FedAvg": f"{ta:.1f}s" if ta else "N/A",
            "Fed-FibAvg": f"{tb:.1f}s" if tb else "N/A",
            "Difference": f"{diff.get('time_diff_s', 0):+.1f}s" if diff.get('time_diff_s') else "",
        })
        
        ca = fa.get("total_communication_bytes")
        cb = fb.get("total_communication_bytes")
        saved_pct = diff.get("communication_saved_pct", 0)
        data.append({
            "Metric": "Communication",
            "FedAvg": f"{ca/(1024**2):.1f} MB" if ca else "N/A",
            "Fed-FibAvg": f"{cb/(1024**2):.1f} MB" if cb else "N/A",
            "Difference": f"{saved_pct:+.1f}%" if saved_pct else "",
        })
        
        data.append({
            "Metric": "Participation Rate",
            "FedAvg": f"{fa.get('participation_rate', 1)*100:.0f}%",
            "Fed-FibAvg": f"{fb.get('participation_rate', 1)*100:.0f}%",
            "Difference": "",
        })
        
        st.table(pd.DataFrame(data))
        
        st.markdown(
            '<div class="disclaimer">'
            'Fed-FibAvg is EXPERIMENTAL. These results are from a single prototype '
            'run and should not be treated as validated research findings.'
            '</div>',
            unsafe_allow_html=True,
        )
    
    # Convergence comparison plot
    if fedavg_results and fibavg_results:
        st.header("Convergence Comparison")
        
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        
        # F1 convergence
        fa_f1 = [r["global_metrics"]["f1_macro"] for r in fedavg_results.get("rounds", [])]
        fb_f1 = [r["global_metrics"]["f1_macro"] for r in fibavg_results.get("rounds", [])]
        
        axes[0].plot(range(1, len(fa_f1)+1), fa_f1, 'o-', label="FedAvg", color="#2c5282")
        axes[0].plot(range(1, len(fb_f1)+1), fb_f1, 's-', label="Fed-FibAvg", color="#c53030")
        axes[0].set_xlabel("Round")
        axes[0].set_ylabel("F1 (macro)")
        axes[0].set_title("Model Quality Convergence")
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)
        
        # Communication cumulative
        fa_comm = np.cumsum([r.get("communication_bytes", 0) for r in fedavg_results.get("rounds", [])])
        fb_comm = np.cumsum([r.get("communication_bytes", 0) for r in fibavg_results.get("rounds", [])])
        
        axes[1].plot(range(1, len(fa_comm)+1), fa_comm/(1024**2), 'o-', label="FedAvg", color="#2c5282")
        axes[1].plot(range(1, len(fb_comm)+1), fb_comm/(1024**2), 's-', label="Fed-FibAvg", color="#c53030")
        axes[1].set_xlabel("Round")
        axes[1].set_ylabel("Cumulative MB")
        axes[1].set_title("Communication Volume")
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()
        
        # Participation timeline for Fed-FibAvg
        st.header("Fed-FibAvg Participation Schedule")
        sched = fibavg_results.get("scheduler_summary", {})
        history = sched.get("history", [])
        
        if history:
            participation_data = []
            for entry in history:
                round_num = entry["round"]
                for h in config.HOSPITAL_NAMES:
                    participated = any(
                        p["name"] == h for p in entry.get("participants", [])
                    )
                    participation_data.append({
                        "Round": round_num,
                        "Hospital": h.replace("_", " ").title(),
                        "Participated": 1 if participated else 0,
                    })
            
            pdf = pd.DataFrame(participation_data)
            pivot = pdf.pivot(index="Hospital", columns="Round", values="Participated")
            
            fig, ax = plt.subplots(figsize=(10, 2.5))
            im = ax.imshow(pivot.values, cmap="RdYlGn", aspect="auto", vmin=0, vmax=1)
            ax.set_yticks(range(len(pivot.index)))
            ax.set_yticklabels(pivot.index)
            ax.set_xticks(range(len(pivot.columns)))
            ax.set_xticklabels(pivot.columns)
            ax.set_xlabel("Round")
            ax.set_title("Client Participation (Green = Active, Red = Skipped)")
            
            for i in range(pivot.shape[0]):
                for j in range(pivot.shape[1]):
                    v = pivot.values[i, j]
                    ax.text(j, i, "Y" if v else "N",
                           ha="center", va="center", fontsize=9,
                           color="white" if v else "black")
            
            plt.tight_layout()
            st.pyplot(fig)
            plt.close()
    
    elif not comparison and not fedavg_results and not fibavg_results:
        st.info(
            "No experiment results yet. Go to the **Federated Training** page "
            "and run an experiment first."
        )


# ============================================================
# Page: X-Ray Demo
# ============================================================
elif page == "X-Ray Demo":
    st.title("X-Ray Prediction Demo")
    
    st.markdown(
        '<div class="disclaimer">'
        '<strong>Research prototype.</strong> Not for clinical diagnosis. '
        'Model explanation only.'
        '</div>',
        unsafe_allow_html=True,
    )
    
    # Load model
    model_loaded = False
    model = None
    
    # Try to load the best available checkpoint
    ckpt_candidates = [
        os.path.join(config.CHECKPOINTS_DIR, "fedavg_global.pt"),
        os.path.join(config.CHECKPOINTS_DIR, "fed_fibavg_global.pt"),
    ]
    # Also check for local hospital checkpoints
    for h_name in config.HOSPITAL_NAMES:
        ckpt_candidates.append(
            os.path.join(config.CHECKPOINTS_DIR, f"{h_name}_local.pt")
        )
    
    ckpt_path = None
    for candidate in ckpt_candidates:
        if os.path.exists(candidate):
            ckpt_path = candidate
            break
    
    if ckpt_path:
        try:
            model = create_model(config.NUM_CLASSES, config.MODEL_NAME, pretrained=False)
            checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=False)
            model.load_state_dict(checkpoint["model_state_dict"])
            model.eval()
            model_loaded = True
            st.success(f"Model loaded: {os.path.basename(ckpt_path)}")
        except Exception as e:
            st.error(f"Failed to load model: {e}")
    else:
        st.warning(
            "No trained model checkpoint found. "
            "Run training first (Federated Training page or CLI)."
        )
    
    # Image upload
    uploaded_file = st.file_uploader(
        "Upload a chest X-ray image",
        type=["png", "jpg", "jpeg"],
    )
    
    # Or use a sample image
    use_sample = st.checkbox("Use a sample image from the dataset")
    
    image = None
    
    if use_sample:
        # Find a sample image
        for img_dir in config.IMAGE_DIRS:
            if os.path.exists(img_dir):
                imgs = os.listdir(img_dir)
                if imgs:
                    sample_path = os.path.join(img_dir, imgs[0])
                    image = Image.open(sample_path).convert("RGB")
                    st.caption(f"Sample: {imgs[0]}")
                    break
    elif uploaded_file:
        image = Image.open(uploaded_file).convert("RGB")
    
    if image is not None:
        col1, col2 = st.columns(2)
        
        with col1:
            st.image(image, caption="Input X-ray", use_container_width=True)
        
        if model_loaded and model is not None:
            with col2:
                with st.spinner("Analyzing..."):
                    # Preprocess
                    transform = get_eval_transforms(config.IMAGE_SIZE)
                    input_tensor = transform(image).unsqueeze(0)
                    
                    # Predict
                    with torch.no_grad():
                        output = model(input_tensor)
                        probs = torch.sigmoid(output).squeeze().numpy()
                    
                    st.subheader("Predictions")
                    for i, (label, prob) in enumerate(zip(config.TARGET_LABELS, probs)):
                        bar_color = "#28a745" if prob > 0.5 else "#6c757d"
                        st.markdown(
                            f"**{label}**: {prob:.3f}",
                        )
                        st.progress(float(prob))
                    
                    # Grad-CAM
                    st.subheader("Grad-CAM Explanation")
                    try:
                        gradcam = GradCAM(model, config.GRADCAM_TARGET_LAYER)
                        input_grad = transform(image).unsqueeze(0)
                        
                        # Get heatmap for top prediction
                        top_class = int(probs.argmax())
                        heatmap, _ = gradcam.generate(input_grad, class_idx=top_class)
                        
                        # Create overlay
                        overlay = create_gradcam_overlay(image, heatmap, alpha=0.4)
                        
                        st.image(overlay, caption=f"Grad-CAM: {config.TARGET_LABELS[top_class]}",
                                use_container_width=True)
                        
                        st.caption(
                            "Warm regions indicate areas that influenced the model's prediction. "
                            "This is a model explanation, not a clinical finding."
                        )
                        
                        gradcam.cleanup()
                    except Exception as e:
                        st.warning(f"Grad-CAM unavailable: {e}")
        else:
            with col2:
                st.info("Load a trained model to see predictions and Grad-CAM.")
