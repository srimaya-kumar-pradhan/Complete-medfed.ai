"""
FL-FedFib Metrics
==================
Metric computation utilities for multi-label classification.
"""
import numpy as np
from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    accuracy_score,
)


def compute_metrics(y_true, y_pred_proba, threshold=0.5):
    """
    Compute classification metrics for multi-label classification.
    
    Args:
        y_true: numpy array of shape (N, C) with binary ground truth.
        y_pred_proba: numpy array of shape (N, C) with predicted probabilities.
        threshold: Classification threshold.
    
    Returns:
        dict: Dictionary of metrics.
    """
    y_pred = (y_pred_proba >= threshold).astype(int)
    
    metrics = {}
    
    # Per-sample metrics (macro average across classes)
    try:
        metrics["f1_macro"] = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    except Exception:
        metrics["f1_macro"] = 0.0
    
    try:
        metrics["f1_micro"] = float(f1_score(y_true, y_pred, average="micro", zero_division=0))
    except Exception:
        metrics["f1_micro"] = 0.0
    
    try:
        metrics["precision_macro"] = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    except Exception:
        metrics["precision_macro"] = 0.0
    
    try:
        metrics["recall_macro"] = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    except Exception:
        metrics["recall_macro"] = 0.0
    
    # ROC-AUC (only if both classes present)
    try:
        metrics["roc_auc_macro"] = float(roc_auc_score(y_true, y_pred_proba, average="macro"))
    except ValueError:
        metrics["roc_auc_macro"] = float("nan")
    
    # Per-class ROC-AUC
    per_class_auc = []
    for i in range(y_true.shape[1]):
        try:
            auc = roc_auc_score(y_true[:, i], y_pred_proba[:, i])
            per_class_auc.append(float(auc))
        except ValueError:
            per_class_auc.append(float("nan"))
    metrics["per_class_auc"] = per_class_auc
    
    return metrics


def format_metrics(metrics, label_names=None):
    """Format metrics dictionary as a readable string."""
    lines = []
    lines.append(f"  F1 (macro):        {metrics.get('f1_macro', 0):.4f}")
    lines.append(f"  F1 (micro):        {metrics.get('f1_micro', 0):.4f}")
    lines.append(f"  Precision (macro): {metrics.get('precision_macro', 0):.4f}")
    lines.append(f"  Recall (macro):    {metrics.get('recall_macro', 0):.4f}")
    
    roc = metrics.get("roc_auc_macro", float("nan"))
    lines.append(f"  ROC-AUC (macro):   {roc:.4f}" if not np.isnan(roc) else "  ROC-AUC (macro):   N/A")
    
    if label_names and "per_class_auc" in metrics:
        lines.append("  Per-class AUC:")
        for name, auc in zip(label_names, metrics["per_class_auc"]):
            auc_str = f"{auc:.4f}" if not np.isnan(auc) else "N/A"
            lines.append(f"    {name:20s}: {auc_str}")
    
    return "\n".join(lines)
