"""
FL-FedFib Fed-FibAvg
=====================
EXPERIMENTAL Fibonacci-inspired client scheduling for federated learning.

STATUS: EXPERIMENTAL — This is a research hypothesis, not a validated method.

Core Concept:
  - Classify clients into performance tiers (FAST, MEDIUM, SLOW) based on
    simulated latency and training time.
  - Use a Fibonacci-inspired participation cadence:
    FAST clients participate every round,
    MEDIUM clients participate according to Fibonacci pattern,
    SLOW clients participate less frequently.
  - This may reduce straggler effects and total wall-clock training time
    while maintaining global model quality.

Comparison:
  FedAvg: All clients participate every round.
  Fed-FibAvg: Clients participate according to Fibonacci schedule.

The SAME model, dataset, classes, optimizer, and evaluation set are used
for both methods to enable fair comparison.
"""
import os
import sys
import time
import json
import copy
import numpy as np
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from models.model import create_model, get_model_state_size
from training.local_train import (
    HospitalClient, load_test_data, evaluate, set_seed
)
from training.fedavg import fedavg_aggregate
from utils.metrics import compute_metrics, format_metrics


class FibonacciScheduler:
    """
    Fibonacci-inspired client participation scheduler.
    
    Each client is assigned to a tier. The tier determines the participation
    cadence using the Fibonacci sequence:
    
      FAST:   participates every round       (cadence = 1)
      MEDIUM: participates every 2nd round   (cadence = 2)
      SLOW:   participates every 3rd round   (cadence = 3)
    
    The Fibonacci connection: the cadence values (1, 2, 3) are early
    Fibonacci numbers. For more clients/tiers, this extends to (1, 2, 3, 5, 8).
    
    When a client does NOT participate:
      - It does not train locally
      - Its previous model weights are still used in aggregation (stale)
      - Its simulated latency does not contribute to round wall-clock time
    """
    
    def __init__(self, client_tiers):
        """
        Args:
            client_tiers: dict mapping hospital_name -> tier string.
        """
        self.client_tiers = client_tiers
        
        # Map tier to Fibonacci-based participation cadence
        self.cadence_map = {
            "fast": 1,    # Every round (Fib: 1)
            "medium": 2,  # Every 2nd round (Fib: 2)
            "slow": 3,    # Every 3rd round (Fib: 3)
        }
        
        # Track last participation round for each client
        self.last_participation = {name: 0 for name in client_tiers}
        
        # Track participation history
        self.history = []
    
    def get_participants(self, round_num):
        """
        Determine which clients participate in this round.
        
        Returns:
            list of hospital names that should participate.
        """
        participants = []
        round_info = {"round": round_num, "participants": [], "skipped": []}
        
        for name, tier in self.client_tiers.items():
            cadence = self.cadence_map.get(tier, 1)
            
            # Participate if enough rounds have elapsed since last participation
            rounds_since = round_num - self.last_participation[name]
            
            if rounds_since >= cadence or round_num == 1:
                # Always participate in round 1
                participants.append(name)
                self.last_participation[name] = round_num
                round_info["participants"].append({
                    "name": name,
                    "tier": tier,
                    "cadence": cadence,
                })
            else:
                round_info["skipped"].append({
                    "name": name,
                    "tier": tier,
                    "reason": f"cadence={cadence}, last={self.last_participation[name]}",
                })
        
        self.history.append(round_info)
        return participants
    
    def get_summary(self):
        """Return scheduler summary."""
        return {
            "tiers": dict(self.client_tiers),
            "cadences": {name: self.cadence_map[tier] 
                        for name, tier in self.client_tiers.items()},
            "history": self.history,
        }


def simulate_latency(hospital_name, training_time_s):
    """
    Simulate network/compute latency for a hospital.
    
    Returns:
        dict with timing information.
        
    NOTE: This is SIMULATED latency, not measured infrastructure latency.
    """
    tier = config.HOSPITAL_TIERS.get(hospital_name, "medium")
    tier_config = config.FIBAVG_TIERS.get(tier, {"simulated_latency_ms": 100})
    latency_ms = tier_config["simulated_latency_ms"]
    
    # Simulate: actual training time + network latency
    simulated_total = training_time_s + (latency_ms / 1000.0)
    
    return {
        "tier": tier,
        "simulated_latency_ms": latency_ms,
        "actual_training_s": training_time_s,
        "simulated_total_s": simulated_total,
    }


def run_fed_fibavg(num_rounds=None, local_epochs=None, max_samples=None,
                   progress_callback=None):
    """
    Run Fed-FibAvg EXPERIMENTAL experiment.
    
    Uses identical setup to FedAvg except for the client scheduling.
    
    Args:
        num_rounds: Number of federation rounds.
        local_epochs: Local training epochs per round.
        max_samples: Max samples per hospital (for demo mode).
        progress_callback: Optional callable(round, total, metrics_dict).
    
    Returns:
        dict: Complete experiment results.
    """
    num_rounds = num_rounds or config.FED_ROUNDS
    local_epochs = local_epochs or config.LOCAL_EPOCHS
    
    set_seed(config.SEED)
    device = config.DEVICE
    
    print("=" * 70)
    print("Fed-FibAvg EXPERIMENTAL Experiment")
    print("=" * 70)
    print(config.get_hardware_summary())
    print(f"Rounds: {num_rounds}")
    print(f"Local epochs: {local_epochs}")
    print(f"Demo mode: {max_samples is not None}")
    
    # Create global model (SAME architecture as FedAvg)
    global_model = create_model(
        config.NUM_CLASSES, config.MODEL_NAME, config.PRETRAINED
    )
    model_size = get_model_state_size(global_model)
    
    # Create Fibonacci scheduler
    scheduler = FibonacciScheduler(config.HOSPITAL_TIERS)
    print(f"\nScheduler tiers: {config.HOSPITAL_TIERS}")
    print(f"Cadences: {scheduler.cadence_map}")
    
    # Create hospital clients
    clients = {}
    for h_name in config.HOSPITAL_NAMES:
        print(f"\nInitializing {h_name} (tier: {config.HOSPITAL_TIERS[h_name]})...")
        clients[h_name] = HospitalClient(
            h_name,
            model=global_model,
            device=device,
            max_samples=max_samples,
        )
        print(f"  Train: {clients[h_name].num_samples} samples")
    
    # Load global test set
    test_max = max_samples * 2 if max_samples else None
    test_dataset, label_names = load_test_data(max_samples=test_max)
    test_loader = DataLoader(
        test_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=False,
        num_workers=config.NUM_WORKERS,
        pin_memory=config.PIN_MEMORY,
    )
    
    # Track stale model params for non-participating clients
    latest_client_params = {}
    
    # Experiment tracking
    experiment = {
        "method": "Fed-FibAvg (EXPERIMENTAL)",
        "config": config.get_config_dict(),
        "num_rounds": num_rounds,
        "local_epochs": local_epochs,
        "max_samples_per_hospital": max_samples,
        "model_size_bytes": model_size,
        "hospital_tiers": config.HOSPITAL_TIERS,
        "scheduler_cadences": scheduler.cadence_map,
        "rounds": [],
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    
    total_communication = 0
    total_training_time = 0
    total_simulated_wall_clock = 0
    experiment_start = time.time()
    
    # ================================================================
    # Federation Rounds
    # ================================================================
    for round_num in range(1, num_rounds + 1):
        round_start = time.time()
        print(f"\n{'='*50}")
        print(f"Round {round_num}/{num_rounds} (Fed-FibAvg)")
        print(f"{'='*50}")
        
        # Determine participants for this round
        participants = scheduler.get_participants(round_num)
        non_participants = [n for n in config.HOSPITAL_NAMES if n not in participants]
        
        print(f"  Participants: {participants}")
        if non_participants:
            print(f"  Skipped (stale): {non_participants}")
        
        round_data = {
            "round": round_num,
            "participants": participants,
            "non_participants": non_participants,
            "clients": {},
            "global_metrics": None,
            "communication_bytes": 0,
            "round_time_s": 0,
            "simulated_wall_clock_s": 0,
        }
        
        # Distribute global model
        global_state = global_model.state_dict()
        
        # Train participating clients SEQUENTIALLY
        round_max_simulated_time = 0
        
        for h_name in participants:
            client = clients[h_name]
            print(f"\n  [{h_name}] Training (tier: {config.HOSPITAL_TIERS[h_name]})...")
            
            client.set_model_params(copy.deepcopy(global_state))
            client.to_device()
            
            results = client.train(epochs=local_epochs)
            
            # Collect model update
            params = client.get_model_params()
            latest_client_params[h_name] = params
            
            # Simulate latency
            timing = simulate_latency(h_name, results["training_time_s"])
            round_max_simulated_time = max(
                round_max_simulated_time, timing["simulated_total_s"]
            )
            
            print(f"  [{h_name}] Loss: {results['losses'][-1]:.4f} | "
                  f"Val F1: {results['metrics']['f1_macro']:.4f} | "
                  f"Time: {results['training_time_s']:.1f}s | "
                  f"Sim latency: {timing['simulated_latency_ms']}ms")
            
            round_data["clients"][h_name] = {
                "participated": True,
                "train_loss": results["losses"][-1],
                "val_loss": results["val_loss"],
                "val_f1": results["metrics"]["f1_macro"],
                "training_time_s": results["training_time_s"],
                "simulated_latency_ms": timing["simulated_latency_ms"],
                "simulated_total_s": timing["simulated_total_s"],
                "num_samples": client.num_samples,
                "tier": config.HOSPITAL_TIERS[h_name],
            }
            
            client.release_gpu()
        
        # Non-participants use stale params
        for h_name in non_participants:
            if h_name not in latest_client_params:
                # First round: use initial global model
                latest_client_params[h_name] = copy.deepcopy(global_state)
            
            round_data["clients"][h_name] = {
                "participated": False,
                "tier": config.HOSPITAL_TIERS[h_name],
                "using": "stale params",
            }
        
        # Aggregate using all latest params (including stale)
        all_params = [latest_client_params[h] for h in config.HOSPITAL_NAMES]
        all_weights = [clients[h].num_samples for h in config.HOSPITAL_NAMES]
        
        print(f"\n  Aggregating ({len(participants)} active + "
              f"{len(non_participants)} stale)...")
        global_state = fedavg_aggregate(all_params, all_weights)
        global_model.load_state_dict(global_state)
        
        # Communication: only participating clients send/receive
        round_comm = model_size * len(participants) * 2
        total_communication += round_comm
        round_data["communication_bytes"] = round_comm
        
        # Simulated wall-clock: max of participating clients
        round_data["simulated_wall_clock_s"] = round_max_simulated_time
        total_simulated_wall_clock += round_max_simulated_time
        
        # Evaluate global model
        print(f"  Evaluating global model...")
        global_model_eval = copy.deepcopy(global_model).to(device)
        criterion = torch.nn.BCEWithLogitsLoss()
        use_amp = config.USE_AMP and device.type == 'cuda'
        test_loss, test_preds, test_labels = evaluate(
            global_model_eval, test_loader, criterion, device, use_amp=use_amp,
        )
        test_metrics = compute_metrics(test_labels, test_preds)
        
        del global_model_eval
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        round_data["global_metrics"] = {
            "test_loss": test_loss,
            **{k: v for k, v in test_metrics.items() if k != "per_class_auc"},
            "per_class_auc": [
                float(x) if not np.isnan(x) else None
                for x in test_metrics.get("per_class_auc", [])
            ],
        }
        
        round_time = time.time() - round_start
        round_data["round_time_s"] = round_time
        
        print(f"\n  Global Test Metrics:")
        print(format_metrics(test_metrics, label_names))
        print(f"  Actual round time: {round_time:.1f}s")
        print(f"  Simulated wall-clock: {round_max_simulated_time:.1f}s")
        print(f"  Communication: {round_comm / (1024**2):.1f} MB")
        
        experiment["rounds"].append(round_data)
        
        if progress_callback:
            progress_callback(round_num, num_rounds, round_data)
    
    # ================================================================
    # Final summary
    # ================================================================
    total_time = time.time() - experiment_start
    experiment["total_time_s"] = total_time
    experiment["total_communication_bytes"] = total_communication
    experiment["total_simulated_wall_clock_s"] = total_simulated_wall_clock
    experiment["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
    experiment["scheduler_summary"] = scheduler.get_summary()
    
    final_metrics = experiment["rounds"][-1]["global_metrics"]
    experiment["final_metrics"] = final_metrics
    
    print(f"\n{'='*70}")
    print(f"Fed-FibAvg EXPERIMENTAL Complete")
    print(f"{'='*70}")
    print(f"Total time: {total_time:.1f}s")
    print(f"Total communication: {total_communication / (1024**2):.1f} MB")
    print(f"Total simulated wall-clock: {total_simulated_wall_clock:.1f}s")
    print(f"Final F1 (macro): {final_metrics['f1_macro']:.4f}")
    roc = final_metrics.get('roc_auc_macro', float('nan'))
    if not np.isnan(roc):
        print(f"Final ROC-AUC (macro): {roc:.4f}")
    
    # Participation summary
    total_possible = num_rounds * len(config.HOSPITAL_NAMES)
    total_actual = sum(len(r["participants"]) for r in experiment["rounds"])
    print(f"\nParticipation: {total_actual}/{total_possible} "
          f"({100*total_actual/total_possible:.0f}%)")
    
    # Save results
    config.ensure_dirs()
    results_path = os.path.join(config.RESULTS_DIR, "fed_fibavg", "experiment.json")
    with open(results_path, "w") as f:
        json.dump(experiment, f, indent=2, default=str)
    print(f"\nResults saved: {results_path}")
    
    # Save checkpoint
    ckpt_path = os.path.join(config.CHECKPOINTS_DIR, "fed_fibavg_global.pt")
    torch.save({
        "model_state_dict": global_model.state_dict(),
        "config": config.get_config_dict(),
        "final_metrics": final_metrics,
        "num_rounds": num_rounds,
    }, ckpt_path)
    print(f"Checkpoint saved: {ckpt_path}")
    
    return experiment


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run Fed-FibAvg experiment")
    parser.add_argument("--rounds", type=int, default=config.FED_ROUNDS)
    parser.add_argument("--epochs", type=int, default=config.LOCAL_EPOCHS)
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    
    max_samples = config.DEMO_MAX_SAMPLES_PER_HOSPITAL if args.demo else None
    run_fed_fibavg(
        num_rounds=args.rounds,
        local_epochs=args.epochs,
        max_samples=max_samples,
    )
