"""MedFed Chest X-Ray AI Inference & Grad-CAM Service.
Integrates the trained MedFed DenseNet121 federated model into DORI clinical workflows.
Delegates inference to the centralized MLInferenceService for strict single-point model lifecycle management.
"""
from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from PIL import Image

from app.core.config import get_settings
from app.services.ml_inference_service import (
    DEFAULT_CHEST_XRAY_CLASSES,
    get_inference_service,
)

logger = logging.getLogger("dori.medfed")
settings = get_settings()


class MedFedService:
    """High-level clinical service for Chest X-Ray AI workflows in DORI."""

    def __init__(self):
        self.ml_service = get_inference_service()

    def analyze_image(
        self,
        image: Image.Image,
        patient_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute real DenseNet121 multi-label inference and Grad-CAM generation.

        Returns explainable probabilities, heatmap overlay, and clinical safety disclaimers.
        """
        # Run real inference via the singleton ML service
        result = self.ml_service.predict(
            image=image,
            target_class=None,  # Automatically targets highest probability class
            generate_gradcam=True,
        )

        # Context-aware clinical note enhancements
        explanation_note = result.get("explanation_notes", "")
        if patient_context and patient_context.get("reason"):
            explanation_note += (
                f" Evaluated in clinical context of referral: '{patient_context['reason']}'."
            )

        return {
            "request_id": result["request_id"],
            "model_name": result["model_name"],
            "model_version": result["model_version"],
            "target_nodes": 3,
            "differential_privacy_epsilon": 0.5,
            "findings": result["findings"],
            "top_finding": result["top_finding"],
            "top_confidence": result["top_confidence"],
            "original_image_base64": result["original_image_base64"],
            "gradcam_overlay_base64": result["gradcam_overlay_base64"],
            "explanation_notes": explanation_note,
            "safety_disclaimer": result["safety_disclaimer"],
            "status": "success",
            "checkpoint_metadata": result.get("checkpoint_metadata"),
        }

    def _discover_image_directories(self) -> List[Path]:
        """Locate directories containing physical NIH chest X-ray images."""
        backend_dir = Path(__file__).resolve().parent.parent.parent
        repo_root = backend_dir.parent
        workspace_root = repo_root.parent

        candidates = [
            Path(settings.medfed_dataset_path) if settings.medfed_dataset_path else None,
            workspace_root / "federated-learning" / "Hospital_A" / "runs" / "gradcam_samples",
            workspace_root / "federated-learning" / "dataset",
            workspace_root / "MedFed.ai-main" / "MedFed.ai-main" / "Hospital_A" / "runs" / "gradcam_samples",
            Path("C:/Users/srinu/Music/fedlearning/DataSET"),
            Path("C:/megafedallmodels/fedv2/Hospital_A/runs/gradcam_samples"),
        ]

        valid_dirs: List[Path] = []
        for c in candidates:
            if c is not None and c.is_dir():
                valid_dirs.append(c)
                # Check for images_001 .. images_012
                for i in range(1, 13):
                    sub = c / f"images_{i:03d}" / "images"
                    if sub.is_dir():
                        valid_dirs.append(sub)
        return valid_dirs

    def get_curated_samples(self) -> List[Dict[str, Any]]:
        """Return curated sample chest X-rays from the physical dataset for live clinical demos."""
        sample_configs = [
            {
                "id": "sample-ramesh",
                "title": "Ramesh Kumar — Pre-Op Chest PA (Referral REF-RAMESH-2026)",
                "category": "Infiltration & Apical Opacity",
                "filename": "00000013_005.png",
                "description": "Patient Ramesh Kumar, 42M, chronic cough 4 weeks, referred from Karera PHC to District Hospital.",
                "expected_top": "Infiltration",
            },
            {
                "id": "sample-effusion",
                "title": "Clinical Sample — Costophrenic Blunting (Effusion)",
                "category": "Pleural Effusion",
                "filename": "00000013_010.png",
                "description": "Secondary screening with right lower lung zone blunting and fluid meniscus sign.",
                "expected_top": "Effusion",
            },
            {
                "id": "sample-clear",
                "title": "Baseline Normal — Screening Negative",
                "category": "Clear Fields / No Finding",
                "filename": "00000001_000.png",
                "description": "Routine pre-employment screening, clear bilateral lung fields, normal cardiothoracic ratio.",
                "expected_top": "No Finding",
            },
        ]

        img_dirs = self._discover_image_directories()
        samples = []

        for cfg in sample_configs:
            found_path: Optional[Path] = None
            for d in img_dirs:
                candidate = d / cfg["filename"]
                if candidate.is_file():
                    found_path = candidate
                    break

            base64_thumb = None
            if found_path:
                try:
                    with Image.open(str(found_path)) as img:
                        thumb = img.convert("RGB")
                        thumb.thumbnail((400, 400))
                        b = io.BytesIO()
                        thumb.save(b, format="JPEG", quality=85)
                        base64_thumb = f"data:image/jpeg;base64,{base64.b64encode(b.getvalue()).decode('utf-8')}"
                except Exception as e:
                    logger.warning("Error reading sample thumbnail for %s: %s", found_path, e)

            # If no physical image was found in dataset folders, check Hospital_A samples
            if not base64_thumb:
                for d in img_dirs:
                    for f in d.glob("*.png"):
                        if cfg["expected_top"].lower() in f.name.lower():
                            try:
                                with Image.open(str(f)) as img:
                                    thumb = img.convert("RGB")
                                    thumb.thumbnail((400, 400))
                                    b = io.BytesIO()
                                    thumb.save(b, format="JPEG", quality=85)
                                    base64_thumb = f"data:image/jpeg;base64,{base64.b64encode(b.getvalue()).decode('utf-8')}"
                                    found_path = f
                                    break
                            except Exception:
                                pass
                    if found_path:
                        break

            samples.append({
                "id": cfg["id"],
                "title": cfg["title"],
                "category": cfg["category"],
                "filename": cfg["filename"],
                "description": cfg["description"],
                "expected_top": cfg["expected_top"],
                "has_physical_file": found_path is not None,
                "thumbnail_base64": base64_thumb,
            })

        return samples

    def get_sample_image(self, sample_id: str) -> Optional[Image.Image]:
        """Load a full resolution physical sample image by ID."""
        filename_map = {
            "sample-ramesh": "00000013_005.png",
            "sample-effusion": "00000013_010.png",
            "sample-clear": "00000001_000.png",
        }
        filename = filename_map.get(sample_id, "00000013_005.png")

        img_dirs = self._discover_image_directories()
        for d in img_dirs:
            candidate = d / filename
            if candidate.is_file():
                try:
                    return Image.open(str(candidate))
                except Exception as e:
                    logger.error("Failed to open physical sample image %s: %s", candidate, e)

        # Fallback to any matching sample in Hospital_A gradcam_samples
        for d in img_dirs:
            for f in d.glob("*.png"):
                try:
                    return Image.open(str(f))
                except Exception:
                    pass

        return None


_medfed_service_instance: Optional[MedFedService] = None


def get_medfed_service() -> MedFedService:
    global _medfed_service_instance
    if _medfed_service_instance is None:
        _medfed_service_instance = MedFedService()
    return _medfed_service_instance
