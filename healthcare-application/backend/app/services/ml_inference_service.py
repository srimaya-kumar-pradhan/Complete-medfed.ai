"""MedFed AI Model Inference & Grad-CAM Service.

Consumes the trained MedFed DenseNet121 multi-label medical image classification
model produced by the federated learning pipeline in Repository B.

Key Architectural Guarantees:
1. Real Model Only: Never silently substitutes random weights or fake static predictions.
2. In-Memory Lifecycle: Loads model weights once at application startup.
3. Strict Preprocessing: Exact normalization and resizing matching federated training.
4. Explainable AI: Grad-CAM attribution generated directly on the final convolutional layer.
5. Clinical Safety: Multi-label probabilities returned as non-mutually exclusive decision support.
"""
from __future__ import annotations

import base64
import io
import logging
import os
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger("dori.ml_inference")
settings = get_settings()

# Standard 14 Pathology Classes for NIH Chest X-Ray Multi-Label Classification
# Order must exactly match model head outputs (indices 0 to 13)
DEFAULT_CHEST_XRAY_CLASSES = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Effusion",
    "Emphysema",
    "Fibrosis",
    "Hernia",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pleural_Thickening",
    "Pneumonia",
    "Pneumothorax",
]

NUM_CLASSES = len(DEFAULT_CHEST_XRAY_CLASSES)


class MedFedDenseNet(nn.Module):
    """DenseNet121 architecture matching Repository B (MedFed.ai-main/model.py).

    Multi-label classification head with Dropout + Linear(1024, 14).
    Outputs raw logits; Sigmoid activation produces independent class probabilities.
    """

    def __init__(self, num_classes: int = 14, dropout_rate: float = 0.2):
        super().__init__()
        self.num_classes = num_classes
        # DenseNet121 backbone without pretrained weights initially
        self.densenet = models.densenet121(weights=None)
        num_features = self.densenet.classifier.in_features  # 1024

        self.densenet.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(num_features, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass returning raw logits [batch_size, num_classes]."""
        return self.densenet(x)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Multi-label class probabilities via Sigmoid activation."""
        logits = self.forward(x)
        return torch.sigmoid(logits)

    def get_last_conv_layer(self) -> nn.Module:
        """Returns the final convolutional layer of denseblock4 for Grad-CAM."""
        return self.densenet.features.denseblock4.denselayer16.conv2


class GradCAM:
    """Grad-CAM implementation tailored for MedFed DenseNet121.

    Extracts gradients and activations from the final denseblock layer.
    """

    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()

        if target_layer is None:
            if hasattr(model, "get_last_conv_layer"):
                self.target_layer = model.get_last_conv_layer()
            else:
                self.target_layer = model.densenet.features.denseblock4.denselayer16.conv2
        else:
            self.target_layer = target_layer

        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None
        self._hooks: List[Any] = []
        self._register_hooks()

    def _register_hooks(self) -> None:
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        h1 = self.target_layer.register_forward_hook(forward_hook)
        h2 = self.target_layer.register_full_backward_hook(backward_hook)
        self._hooks.extend([h1, h2])

    def cleanup(self) -> None:
        """Remove hooks to prevent memory leaks."""
        for h in self._hooks:
            try:
                h.remove()
            except Exception:
                pass
        self._hooks.clear()

    def generate_heatmap(
        self, input_tensor: torch.Tensor, class_idx: int
    ) -> Tuple[np.ndarray, float]:
        """Generate 2D Grad-CAM heatmap for input tensor and target class index.

        Args:
            input_tensor: Tensor of shape [1, 3, H, W] with requires_grad=True.
            class_idx: Integer index of target pathology class (0 to 13).

        Returns:
            heatmap: 2D numpy array [H, W] normalized to [0, 1].
            predicted_prob: Sigmoid probability of the target class.
        """
        self.model.zero_grad()
        logits = self.model(input_tensor)
        probs = torch.sigmoid(logits)

        target_score = logits[0, class_idx]
        target_score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            raise RuntimeError("Grad-CAM hooks failed to capture activations or gradients.")

        gradients = self.gradients[0]     # [C, H_feat, W_feat]
        activations = self.activations[0] # [C, H_feat, W_feat]

        # Global average pooling of gradients
        weights = torch.mean(gradients, dim=(1, 2))  # [C]

        cam = torch.zeros(activations.shape[1:], dtype=torch.float32, device=activations.device)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = F.relu(cam)
        cam_np = cam.cpu().numpy()
        cam_min, cam_max = np.min(cam_np), np.max(cam_np)
        if cam_max > cam_min:
            cam_np = (cam_np - cam_min) / (cam_max - cam_min + 1e-8)
        else:
            cam_np = np.zeros_like(cam_np)

        input_h, input_w = input_tensor.shape[2], input_tensor.shape[3]
        cam_pil = Image.fromarray((cam_np * 255).astype(np.uint8))
        cam_resized = cam_pil.resize((input_w, input_h), Image.BILINEAR)
        heatmap = np.array(cam_resized) / 255.0

        predicted_prob = float(probs[0, class_idx].item())
        return heatmap, predicted_prob

    def overlay_heatmap(
        self, original_image: Image.Image, heatmap: np.ndarray, alpha: float = 0.45, colormap: str = "jet"
    ) -> Image.Image:
        """Overlays heatmap on top of original PIL image."""
        orig_img = original_image.convert("RGB")
        w, h = orig_img.size

        if heatmap.shape != (h, w):
            heat_pil = Image.fromarray((heatmap * 255).astype(np.uint8))
            heatmap = np.array(heat_pil.resize((w, h), Image.BILINEAR)) / 255.0

        import matplotlib.pyplot as plt
        cmap = plt.get_cmap(colormap)
        color_heatmap = cmap(heatmap)[:, :, :3]
        color_heatmap = (color_heatmap * 255).astype(np.uint8)

        orig_np = np.array(orig_img)
        blended = (orig_np * (1.0 - alpha) + color_heatmap * alpha).astype(np.uint8)
        return Image.fromarray(blended)


class MLInferenceService:
    """Singleton service managing trained model weights, preprocessing, and inference."""

    def __init__(self):
        self._lock = threading.RLock()
        self.model: Optional[MedFedDenseNet] = None
        self.device: torch.device = torch.device("cpu")
        self.is_initialized: bool = False
        self.is_available: bool = False
        self.error_message: Optional[str] = None
        self.checkpoint_metadata: Dict[str, Any] = {}
        self.classes: List[str] = DEFAULT_CHEST_XRAY_CLASSES

        # Standard NIH Chest X-Ray Preprocessing Pipeline
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def discover_checkpoint(self) -> Optional[Path]:
        """Discover the best available trained model checkpoint."""
        backend_dir = Path(__file__).resolve().parent.parent.parent
        repo_root = backend_dir.parent
        workspace_root = repo_root.parent

        candidate_paths = [
            Path(settings.medfed_model_path) if settings.medfed_model_path else None,
            workspace_root / "model-artifacts" / "best_global_model.pth",
            workspace_root / "model-artifacts" / "model.pth",
            repo_root / "model-artifacts" / "best_global_model.pth",
            workspace_root / "federated-learning" / "models" / "global" / "current" / "model.pth",
            workspace_root / "federated-learning" / "runs" / "fed-fibavg_none" / "best_global_model.pth",
            workspace_root / "MedFed.ai-main" / "MedFed.ai-main" / "models" / "global" / "current" / "model.pth",
            workspace_root / "MedFed.ai-main" / "MedFed.ai-main" / "runs" / "fed-fibavg_none" / "best_global_model.pth",
            Path("C:/Users/srinu/Music/master fed/MedFed.ai-main/MedFed.ai-main/models/global/current/model.pth"),
            Path("C:/megafedallmodels/fedv2/runs/fed-fibavg_none/best_global_model.pth"),
            Path("C:/megafedallmodels/fedv2/models/global/current/model.pth"),
        ]

        for p in candidate_paths:
            if p is None:
                continue
            try:
                if p.is_file() and p.stat().st_size > 1024 * 1024:
                    return p
            except Exception:
                continue
        return None

    def initialize(self) -> None:
        """Loads model weights once at startup into memory."""
        with self._lock:
            if self.is_initialized:
                return
            self.is_initialized = True

            # Device selection
            if settings.medfed_device == "cuda" and torch.cuda.is_available():
                self.device = torch.device("cuda")
            elif settings.medfed_device == "auto":
                self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            else:
                self.device = torch.device("cpu")

            ckpt_path = self.discover_checkpoint()
            if ckpt_path is None:
                self.is_available = False
                self.error_message = (
                    "No valid trained checkpoint found in MedFed models or runs directories. "
                    "Inference service cannot make clinical predictions without trained weights."
                )
                logger.error(self.error_message)
                return

            try:
                logger.info("Loading MedFed DenseNet121 from: %s on device: %s", ckpt_path, self.device)
                ckpt = torch.load(str(ckpt_path), map_location="cpu", weights_only=False)

                state_dict = None
                if isinstance(ckpt, dict):
                    if "model_state_dict" in ckpt:
                        state_dict = ckpt["model_state_dict"]
                    else:
                        state_dict = ckpt

                    self.checkpoint_metadata = {
                        "path": str(ckpt_path),
                        "round": ckpt.get("round", 1),
                        "strategy": ckpt.get("strategy", "fed-fibavg"),
                        "privacy": ckpt.get("privacy", "none"),
                        "global_macro_f1": ckpt.get("global_macro_f1"),
                        "global_roc_auc": ckpt.get("global_roc_auc"),
                        "file_size_bytes": ckpt_path.stat().st_size,
                    }
                else:
                    self.checkpoint_metadata = {"path": str(ckpt_path), "type": str(type(ckpt))}

                if state_dict is None:
                    raise ValueError(f"Checkpoint at {ckpt_path} did not contain valid model weights.")

                model = MedFedDenseNet(num_classes=NUM_CLASSES)
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()

                self.model = model
                self.is_available = True
                self.error_message = None
                logger.info(
                    "MedFed model loaded successfully! Checkpoint metadata: %s",
                    self.checkpoint_metadata,
                )

            except Exception as e:
                self.is_available = False
                self.error_message = f"Failed to load checkpoint at {ckpt_path}: {e}"
                logger.error(self.error_message, exc_info=True)

    def validate_image(self, image: Image.Image) -> None:
        """Validates input image dimensions and properties."""
        if not isinstance(image, Image.Image):
            raise ValueError("Input must be a valid PIL Image.")
        w, h = image.size
        if w < 64 or h < 64:
            raise ValueError(f"Image resolution {w}x{h} is too small. Minimum resolution is 64x64.")
        if w > 4096 or h > 4096:
            raise ValueError(f"Image resolution {w}x{h} exceeds maximum supported limit (4096x4096).")

    def predict(
        self,
        image: Image.Image,
        target_class: Optional[str] = None,
        generate_gradcam: bool = True,
        positive_threshold: float = 0.35,
    ) -> Dict[str, Any]:
        """Runs multi-label classification and Grad-CAM explainability on an input image.

        Args:
            image: PIL Image of chest radiograph.
            target_class: Optional specific class name to explain with Grad-CAM.
            generate_gradcam: Whether to generate Grad-CAM visualization.
            positive_threshold: Multi-label probability threshold for clinical significance.

        Returns:
            Structured dictionary conforming to target API contracts.
        """
        if not self.is_initialized:
            self.initialize()

        if not self.is_available or self.model is None:
            raise RuntimeError(
                f"MedFed Inference Engine unavailable: {self.error_message or 'Model not loaded.'}"
            )

        self.validate_image(image)
        img_rgb = image.convert("RGB")

        # Preprocess input tensor
        input_tensor = self.transform(img_rgb).unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True

        # Forward pass
        logits = self.model(input_tensor)
        probs = torch.sigmoid(logits)[0].detach().cpu().numpy()

        # Build multi-label findings
        findings: List[Dict[str, Any]] = []
        for idx, label in enumerate(self.classes):
            prob = float(probs[idx])
            findings.append({
                "finding": label,
                "confidence": round(prob, 4),
                "percentage": round(prob * 100.0, 2),
                "is_positive": bool(prob >= positive_threshold),
            })

        # Sort findings descending by probability
        findings_sorted = sorted(findings, key=lambda x: x["confidence"], reverse=True)
        top_finding = findings_sorted[0]["finding"]
        top_confidence = findings_sorted[0]["confidence"]

        # Determine target class for Grad-CAM
        explained_class = top_finding
        if target_class and target_class in self.classes:
            explained_class = target_class
        explained_idx = self.classes.index(explained_class)

        # Grad-CAM Explainability
        gradcam_b64: Optional[str] = None
        explainability_meta: Dict[str, Any] = {
            "method": "Grad-CAM",
            "available": False,
            "target_layer": "features.denseblock4.denselayer16.conv2",
            "explained_class": explained_class,
            "visualization": None,
        }

        if generate_gradcam:
            try:
                cam_engine = GradCAM(self.model)
                heatmap, _ = cam_engine.generate_heatmap(input_tensor, class_idx=explained_idx)
                overlay = cam_engine.overlay_heatmap(img_rgb, heatmap, alpha=0.45, colormap="jet")
                cam_engine.cleanup()

                buf = io.BytesIO()
                overlay.save(buf, format="PNG")
                gradcam_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

                explainability_meta["available"] = True
                explainability_meta["visualization"] = gradcam_b64
            except Exception as cam_err:
                logger.warning("Grad-CAM generation failed: %s. Returning prediction without heatmap.", cam_err)
                explainability_meta["error"] = str(cam_err)

        # Encode original image to data URL
        buf_orig = io.BytesIO()
        img_rgb.save(buf_orig, format="PNG")
        orig_b64 = f"data:image/png;base64,{base64.b64encode(buf_orig.getvalue()).decode('ascii')}"

        request_id = str(uuid.uuid4())
        model_name = settings.medfed_model_name
        model_version = settings.medfed_model_version

        return {
            "request_id": request_id,
            "model_name": model_name,
            "model_version": model_version,
            "device": str(self.device),
            "checkpoint_metadata": self.checkpoint_metadata,
            "prediction": {
                "labels": [f["finding"] for f in findings_sorted],
                "scores": [f["confidence"] for f in findings_sorted],
            },
            "findings": findings_sorted,
            "top_finding": top_finding,
            "top_confidence": top_confidence,
            "explainability": explainability_meta,
            "original_image_base64": orig_b64,
            "gradcam_overlay_base64": gradcam_b64 or orig_b64,
            "explanation_notes": (
                f"Highlighted regions represent radiographic spatial feature attributions "
                f"computed by Grad-CAM for '{explained_class}'. Hotter colors indicate higher attention."
            ),
            "safety_disclaimer": (
                "AI-ASSISTED CLINICAL DECISION SUPPORT. NOT A STANDALONE DIAGNOSIS. "
                "Final clinical interpretation and decision remain with the qualified clinician."
            ),
            "status": "completed",
            "requires_clinician_review": True,
        }

    def get_status(self) -> Dict[str, Any]:
        """Returns the current model status and metadata."""
        if not self.is_initialized:
            self.initialize()
        return {
            "available": self.is_available,
            "model_name": settings.medfed_model_name,
            "model_version": settings.medfed_model_version,
            "device": str(self.device),
            "classes": self.classes,
            "num_classes": NUM_CLASSES,
            "checkpoint_metadata": self.checkpoint_metadata,
            "error": self.error_message,
        }


# Global singleton instance
_inference_service: Optional[MLInferenceService] = None


def get_inference_service() -> MLInferenceService:
    """Dependency injector / factory for MLInferenceService singleton."""
    global _inference_service
    if _inference_service is None:
        _inference_service = MLInferenceService()
        _inference_service.initialize()
    return _inference_service

