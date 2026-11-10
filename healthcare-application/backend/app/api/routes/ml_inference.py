"""Dedicated ML Model Inference Routes.
Protected with strict role-based access control (Clinicians & System Admins only).

Exposes the federated-trained MedFed DenseNet121 model through a clean REST interface.
"""
from __future__ import annotations

import base64
import io
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from PIL import Image

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.enums import AuditAction, UserRole
from app.models.patient import Patient
from app.models.user import User
from app.services.ml_inference_service import DEFAULT_CHEST_XRAY_CLASSES, get_inference_service

router = APIRouter()
settings = get_settings()

SUPPORTED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
    "image/bmp",
    "application/octet-stream",  # Raw bytes upload
}


class MLPredictJsonRequest(BaseModel):
    image_base64: Optional[str] = None
    sample_id: Optional[str] = None
    target_class: Optional[str] = None
    patient_id: Optional[uuid.UUID] = None
    generate_gradcam: bool = True

    @field_validator("patient_id", mode="before")
    @classmethod
    def parse_optional_uuid(cls, v):
        if not v:
            return None
        if isinstance(v, uuid.UUID):
            return v
        try:
            return uuid.UUID(str(v))
        except (ValueError, AttributeError):
            return None


class PredictionScores(BaseModel):
    labels: List[str]
    scores: List[float]


class ExplainabilityPayload(BaseModel):
    method: str
    available: bool
    target_layer: Optional[str] = None
    explained_class: Optional[str] = None
    visualization: Optional[str] = None
    error: Optional[str] = None


class FindingItem(BaseModel):
    finding: str
    confidence: float
    percentage: float
    is_positive: bool


class MLPredictResponse(BaseModel):
    request_id: str
    model_name: str
    model_version: str
    device: str
    prediction: PredictionScores
    findings: List[FindingItem]
    top_finding: str
    top_confidence: float
    explainability: ExplainabilityPayload
    status: str
    requires_clinician_review: bool
    safety_disclaimer: str
    patient_id: Optional[str] = None
    checkpoint_metadata: Optional[Dict[str, Any]] = None


@router.get("/status")
def get_model_status(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve runtime status of the MedFed ML Inference Engine."""
    service = get_inference_service()
    return service.get_status()


@router.get("/classes")
def get_pathology_classes(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve the standard 14 NIH Chest X-ray pathology classes."""
    return {
        "classes": DEFAULT_CHEST_XRAY_CLASSES,
        "num_classes": len(DEFAULT_CHEST_XRAY_CLASSES),
        "task": "multi_label_classification",
        "reference_standard": "NIH ChestX-ray14",
    }


@router.post("/predict", response_model=MLPredictResponse)
async def predict_medical_image(
    request: Request,
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    sample_id: Optional[str] = Form(None),
    target_class: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    generate_gradcam: bool = Form(True),
    current_user: User = Depends(
        require_roles(UserRole.MEDICAL_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.REFERRAL_FACILITY)
    ),
    db: Session = Depends(get_db),
):
    """Run medical-image classification using the trained MedFed DenseNet121 model.

    Requirements enforced:
    1. Authentication & Role Check: Clinicians and Admins only.
    2. Input Validation: Content-Type, file-size floor/ceiling, image dimensions.
    3. Multi-label inference: All 14 NIH pathology classes evaluated independently.
    4. Explainability: Grad-CAM heatmap generated on denseblock4.
    5. Auditability: Logged with actor, resource, and prediction results.
    """
    service = get_inference_service()
    if not service.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MedFed Inference Service unavailable: {service.error_message or 'Model checkpoint missing.'}",
        )

    image: Optional[Image.Image] = None
    target_pid: Optional[uuid.UUID] = None

    content_type = request.headers.get("content-type", "")

    # Handle JSON Request
    if "application/json" in content_type:
        try:
            body = await request.json()
            json_req = MLPredictJsonRequest(**body)
            target_class = json_req.target_class
            target_pid = json_req.patient_id
            generate_gradcam = json_req.generate_gradcam

            if json_req.image_base64:
                raw_b64 = json_req.image_base64
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                img_bytes = base64.b64decode(raw_b64)
                if len(img_bytes) > settings.medfed_max_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Image exceeds maximum upload limit of {settings.medfed_max_upload_bytes // (1024*1024)}MB.",
                    )
                image = Image.open(io.BytesIO(img_bytes))

            elif json_req.sample_id:
                # Import sample resolver from medfed_service
                from app.services.medfed_service import get_medfed_service
                medfed_svc = get_medfed_service()
                image = medfed_svc.get_sample_image(json_req.sample_id)
                if image is None:
                    raise HTTPException(status_code=404, detail=f"Sample '{json_req.sample_id}' not found.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON request: {e}")

    # Handle Multipart File Upload or Form Data
    elif file is not None and hasattr(file, "read"):
        if file.content_type and file.content_type not in SUPPORTED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported image type: '{file.content_type}'. Supported formats: PNG, JPEG, WEBP, TIFF, BMP.",
            )
        data = await file.read()
        if len(data) > settings.medfed_max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum upload size of {settings.medfed_max_upload_bytes // (1024*1024)}MB.",
            )
        try:
            image = Image.open(io.BytesIO(data))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not decode image file: {e}")

    elif image_base64:
        raw_b64 = image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(raw_b64)
            if len(img_bytes) > settings.medfed_max_upload_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Image exceeds maximum upload limit of {settings.medfed_max_upload_bytes // (1024*1024)}MB.",
                )
            image = Image.open(io.BytesIO(img_bytes))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 payload: {e}")

    elif sample_id:
        from app.services.medfed_service import get_medfed_service
        medfed_svc = get_medfed_service()
        image = medfed_svc.get_sample_image(sample_id)
        if image is None:
            raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image provided. Provide a multipart file upload, 'image_base64', or 'sample_id'.",
        )

    # Validate image dimensions
    try:
        service.validate_image(image)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    # Parse patient_id if present
    if patient_id and target_pid is None:
        try:
            target_pid = uuid.UUID(str(patient_id))
        except Exception:
            target_pid = None

    # Verify patient existence if ID was supplied
    if target_pid:
        patient_exists = db.query(Patient.id).filter(Patient.id == target_pid).first()
        if not patient_exists:
            target_pid = None

    # Execute inference
    try:
        result = service.predict(
            image=image,
            target_class=target_class,
            generate_gradcam=generate_gradcam,
        )
    except Exception as exc:
        logger.error("Inference execution failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {exc}",
        )

    # Audit logging
    audit = AuditLog(
        actor_id=current_user.id,
        action=AuditAction.CLINICAL_ACCESS,
        resource_type="ml_inference",
        resource_id=str(target_pid) if target_pid else result["request_id"],
        result="success",
        ip_address=request.client.host if request.client else None,
        metadata_json={
            "request_id": result["request_id"],
            "top_finding": result["top_finding"],
            "top_confidence": result["top_confidence"],
            "model_version": result["model_version"],
            "has_gradcam": result["explainability"]["available"],
        },
    )
    db.add(audit)
    db.commit()

    return {
        "request_id": result["request_id"],
        "model_name": result["model_name"],
        "model_version": result["model_version"],
        "device": result["device"],
        "checkpoint_metadata": result["checkpoint_metadata"],
        "prediction": result["prediction"],
        "findings": result["findings"],
        "top_finding": result["top_finding"],
        "top_confidence": result["top_confidence"],
        "explainability": result["explainability"],
        "status": "completed",
        "requires_clinician_review": True,
        "safety_disclaimer": result["safety_disclaimer"],
        "patient_id": str(target_pid) if target_pid else None,
    }

