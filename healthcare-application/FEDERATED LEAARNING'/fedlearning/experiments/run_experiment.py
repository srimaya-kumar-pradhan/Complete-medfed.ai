"""
FL-FedFib Experiment Runner
=============================
Runs FedAvg and Fed-FibAvg experiments and generates comparison results.

Usage:
    python -m experiments.run_experiment --method fedavg --demo
    python -m experiments.run_experiment --method fed_fibavg --demo
    python -m experiments.run_experiment --method both --demo
"""
import os
import sys
import json
import argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from training.fedavg import run_fedavg
from training.fed_fibavg import run_fed_fibavg


def compare_experiments(fedavg_results, fibavg_results):
    """
    Generate a comparison between FedAvg and Fed-FibAvg.
    
    Returns:
        dict with comparison metrics.
    """
    comparison = {
        "fedavg": {},
        "fed_fibavg": {},
        "difference": {},
    }
    
    # Extract final metrics
    for method, results, key in [
        ("FedAvg", fedavg_results, "fedavg"),
        ("Fed-FibAvg", fibavg_results, "fed_fibavg"),
    ]:
        fm = results.get("final_metrics", {})
        comparison[key] = {
            "f1_macro": fm.get("f1_macro", None),
            "f1_micro": fm.get("f1_micro", None),
            "roc_auc_macro": fm.get("roc_auc_macro", None),
            "precision_macro": fm.get("precision_macro", None),
            "recall_macro": fm.get("recall_macro", None),
            "total_time_s": results.get("total_time_s", None),
            "total_communication_bytes": results.get("total_communication_bytes", None),
            "num_rounds": results.get("num_rounds", None),
        }
        
        if key == "fed_fibavg":
            total_possible = results["num_rounds"] * len(config.HOSPITAL_NAMES)
            total_actual = sum(
                len(r.get("participants", config.HOSPITAL_NAMES))
                for r in results.get("rounds", [])
            )
            comparison[key]["participation_rate"] = total_actual / max(total_possible, 1)
            comparison[key]["total_simulated_wall_clock_s"] = results.get(
                "total_simulated_wall_clock_s", None
            )
        else:
            comparison[key]["participation_rate"] = 1.0
    
    # Compute differences
    fa = comparison["fedavg"]
    fb = comparison["fed_fibavg"]
    
    for metric in ["f1_macro", "f1_micro", "roc_auc_macro"]:
        if fa.get(metric) is not None and fb.get(metric) is not None:
            diff = fb[metric] - fa[metric]
            comparison["difference"][f"{metric}_diff"] = diff
            comparison["difference"][f"{metric}_pct"] = (
                100 * diff / max(abs(fa[metric]), 1e-8)
            )
    
    # Communication savings
    if fa.get("total_communication_bytes") and fb.get("total_communication_bytes"):
        comm_saved = fa["total_communication_bytes"] - fb["total_communication_bytes"]
        comparison["difference"]["communication_saved_bytes"] = comm_saved
        comparison["difference"]["communication_saved_pct"] = (
            100 * comm_saved / max(fa["total_communication_bytes"], 1)
        )
    
    # Time comparison
    if fa.get("total_time_s") and fb.get("total_time_s"):
        comparison["difference"]["time_diff_s"] = fb["total_time_s"] - fa["total_time_s"]
    
    return comparison


def print_comparison(comparison):
    """Print formatted comparison table."""
    print("\n" + "=" * 70)
    print("EXPERIMENTAL COMPARISON: FedAvg vs Fed-FibAvg")
    print("=" * 70)
    print(f"\n{'Metric':<30} {'FedAvg':>12} {'Fed-FibAvg':>12} {'Diff':>10}")
    print("-" * 70)
    
    fa = comparison["fedavg"]
    fb = comparison["fed_fibavg"]
    diff = comparison["difference"]
    
    metrics = [
        ("F1 (macro)", "f1_macro", "f1_macro_diff"),
        ("F1 (micro)", "f1_micro", "f1_micro_diff"),
        ("ROC-AUC (macro)", "roc_auc_macro", "roc_auc_macro_diff"),
        ("Precision (macro)", "precision_macro", None),
        ("Recall (macro)", "recall_macro", None),
    ]
    
    for label, key, diff_key in metrics:
        va = fa.get(key)
        vb = fb.get(key)
        va_str = f"{va:.4f}" if va is not None and not np.isnan(va) else "N/A"
        vb_str = f"{vb:.4f}" if vb is not None and not np.isnan(vb) else "N/A"
        
        d_str = ""
        if diff_key and diff_key in diff:
            d = diff[diff_key]
            d_str = f"{d:+.4f}"
        
        print(f"  {label:<28} {va_str:>12} {vb_str:>12} {d_str:>10}")
    
    print()
    
    # Time
    ta = fa.get("total_time_s")
    tb = fb.get("total_time_s")
    ta_str = f"{ta:.1f}s" if ta else "N/A"
    tb_str = f"{tb:.1f}s" if tb else "N/A"
    print(f"  {'Training time':<28} {ta_str:>12} {tb_str:>12}")
    
    # Communication
    ca = fa.get("total_communication_bytes")
    cb = fb.get("total_communication_bytes")
    ca_str = f"{ca/(1024**2):.1f} MB" if ca else "N/A"
    cb_str = f"{cb/(1024**2):.1f} MB" if cb else "N/A"
    saved = diff.get("communication_saved_pct", 0)
    saved_str = f"{saved:.1f}%" if saved else ""
    print(f"  {'Communication':<28} {ca_str:>12} {cb_str:>12} {saved_str:>10}")
    
    # Participation
    pa = fa.get("participation_rate", 1.0)
    pb = fb.get("participation_rate", 1.0)
    print(f"  {'Participation rate':<28} {pa*100:>11.0f}% {pb*100:>11.0f}%")
    
    print("\n  NOTE: Fed-FibAvg is EXPERIMENTAL. These results are from a")
    print("  single prototype run and should not be treated as validated.")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Run FL-FedFib experiments")
    parser.add_argument("--method", type=str, default="both",
                        choices=["fedavg", "fed_fibavg", "both"])
    parser.add_argument("--rounds", type=int, default=config.FED_ROUNDS)
    parser.add_argument("--epochs", type=int, default=config.LOCAL_EPOCHS)
    parser.add_argument("--demo", action="store_true",
                        help="Use small demo subset for quick testing")
    args = parser.parse_args()
    
    max_samples = config.DEMO_MAX_SAMPLES_PER_HOSPITAL if args.demo else None
    
    config.ensure_dirs()
    
    fedavg_results = None
    fibavg_results = None
    
    if args.method in ("fedavg", "both"):
        print("\n>>> Running FedAvg experiment...\n")
        fedavg_results = run_fedavg(
            num_rounds=args.rounds,
            local_epochs=args.epochs,
            max_samples=max_samples,
        )
    
    if args.method in ("fed_fibavg", "both"):
        print("\n>>> Running Fed-FibAvg experiment...\n")
        fibavg_results = run_fed_fibavg(
            num_rounds=args.rounds,
            local_epochs=args.epochs,
            max_samples=max_samples,
        )
    
    # Generate comparison if both ran
    if fedavg_results and fibavg_results:
        comparison = compare_experiments(fedavg_results, fibavg_results)
        print_comparison(comparison)
        
        # Save comparison
        comp_path = os.path.join(config.RESULTS_DIR, "comparison.json")
        with open(comp_path, "w") as f:
            json.dump(comparison, f, indent=2, default=str)
        print(f"\nComparison saved: {comp_path}")


if __name__ == "__main__":
    main()
