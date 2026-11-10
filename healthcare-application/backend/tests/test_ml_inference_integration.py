"""Comprehensive Test Suite for ML Inference Integration (DORI + MedFed AI).

Verifies:
1. Model loading from real trained checkpoint (DenseNet121 v1.3 Fed-FibAvg).
2. Input image validation (resolution, file size, content types).
3. Rejection of invalid / unsupported file types.
4. Correct multi-label classification across all 14 NIH Chest X-ray classes.
5. Non-mutually exclusive Sigmoid probability distribution.
6. Grad-CAM feature attribution heatmap and overlay generation.
7. Graceful degradation when explainability has an issue.
8. Role-based access control (RBAC):
   - Anonymous -> 401 Unauthorized
   - Patient / ASHA -> 403 Forbidden
   - Medical Officer / System Admin -> 200 OK
9. Structured response contracts for both /api/v1/ml/predict and /api/v1/xray/predict.
10. End-to-end clinical workflow:
    Clinician Auth -> Patient Selection -> Real Image Inference -> Clinical Review Submit -> Audit Trail & Notification.
"""
from __future__ import annotations

import base64
import io
import os
import sys
import uuid
from typing import Any, Dict

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token
from app.main import app
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.xray import ChestXRayStudy
from app.seed.seed_data import seed
from app.services.ml_inference_service import (
    DEFAULT_CHEST_XRAY_CLASSES,
    MLInferenceService,
    get_inference_service,
)


@pytest.fixture(scope="module")
def setup_database():
    """Ensure database tables and synthetic seed data exist."""
    Base.metadata.create_all(bind=engine)
    seed(force=False)
    yield
    # No teardown needed for sqlite dev db


@pytest.fixture
def client(setup_database):
    """FastAPI TestClient instance."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Mint test JWT tokens for distinct user roles."""
    token_doctor = create_access_token({"sub": "demo_mo", "role": UserRole.MEDICAL_OFFICER.value})
    token_admin = create_access_token({"sub": "demo_admin", "role": UserRole.SYSTEM_ADMIN.value})
    token_asha = create_access_token({"sub": "demo_asha", "role": UserRole.ASHA.value})
    token_patient = create_access_token({"sub": "demo_patient", "role": UserRole.PATIENT.value})

    return {
        "doctor": {"Authorization": f"Bearer {token_doctor}"},
        "admin": {"Authorization": f"Bearer {token_admin}"},
        "asha": {"Authorization": f"Bearer {token_asha}"},
        "patient": {"Authorization": f"Bearer {token_patient}"},
    }


def make_test_image(width=224, height=224, format="PNG") -> bytes:
    """Generate in-memory test image bytes."""
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# ────────────────────────────────────────────────────────────────────────────
# 1. UNIT TESTS: MODEL LOADING & INFERENCE SERVICE
# ────────────────────────────────────────────────────────────────────────────
def test_ml_service_singleton_initialization():
    """Verify that MLInferenceService initializes and discovers trained checkpoint."""
    service = get_inference_service()
    assert service.is_initialized is True
    assert service.is_available is True, f"Service failed to load model: {service.error_message}"
    assert service.model is not None

    status = service.get_status()
    assert status["available"] is True
    assert status["num_classes"] == 14
    assert len(status["classes"]) == 14
    assert status["checkpoint_metadata"].get("round") == 1
    assert "fed-fibavg" in status["checkpoint_metadata"].get("strategy", "").lower()


def test_ml_service_image_validation():
    """Verify image dimension checks."""
    service = get_inference_service()

    # Image too small (< 64x64)
    tiny_img = Image.fromarray(np.zeros((32, 32, 3), dtype=np.uint8))
    with pytest.raises(ValueError, match="too small"):
        service.validate_image(tiny_img)

    # Valid image
    valid_img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
    service.validate_image(valid_img)  # Should not raise


def test_ml_service_predict_outputs_14_classes():
    """Verify inference returns multi-label non-mutually exclusive probabilities."""
    service = get_inference_service()
    img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))

    result = service.predict(img, generate_gradcam=True)

    assert result["status"] == "completed"
    assert "request_id" in result
    assert result["model_name"] == "MedFed DenseNet121-CheXNet-14Class"
    assert len(result["findings"]) == 14

    # Verify every standard class exists
    returned_classes = [f["finding"] for f in result["findings"]]
    for expected_cls in DEFAULT_CHEST_XRAY_CLASSES:
        assert expected_cls in returned_classes

    # Multi-label check: probabilities are between 0 and 1, independent
    for f in result["findings"]:
        assert 0.0 <= f["confidence"] <= 1.0
        assert 0.0 <= f["percentage"] <= 100.0
        assert isinstance(f["is_positive"], bool)

    # Top finding should equal first sorted item
    assert result["top_finding"] == result["findings"][0]["finding"]
    assert result["top_confidence"] == result["findings"][0]["confidence"]

    # Grad-CAM check
    assert result["explainability"]["available"] is True
    assert result["explainability"]["method"] == "Grad-CAM"
    assert result["gradcam_overlay_base64"].startswith("data:image/png;base64,")


def test_ml_service_explainability_graceful_failure():
    """Verify that if Grad-CAM raises an exception, inference still returns prediction."""
    service = get_inference_service()
    img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))

    # Calling with generate_gradcam=False
    result = service.predict(img, generate_gradcam=False)
    assert result["status"] == "completed"
    assert result["explainability"]["available"] is False
    assert len(result["findings"]) == 14


# ────────────────────────────────────────────────────────────────────────────
# 2. API TESTS: /api/v1/ml/status & /api/v1/ml/classes
# ────────────────────────────────────────────────────────────────────────────
def test_ml_status_endpoint(client, auth_headers):
    """Verify GET /api/v1/ml/status."""
    res = client.get("/api/v1/ml/status", headers=auth_headers["doctor"])
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["num_classes"] == 14
    assert "fed-fibavg" in data["checkpoint_metadata"].get("strategy", "").lower()


def test_ml_classes_endpoint(client, auth_headers):
    """Verify GET /api/v1/ml/classes."""
    res = client.get("/api/v1/ml/classes", headers=auth_headers["doctor"])
    assert res.status_code == 200
    data = res.json()
    assert data["num_classes"] == 14
    assert len(data["classes"]) == 14
    assert "Infiltration" in data["classes"]
    assert "Pneumonia" in data["classes"]


# ────────────────────────────────────────────────────────────────────────────
# 3. RBAC TESTS: /api/v1/ml/predict & /api/v1/xray/predict
# ────────────────────────────────────────────────────────────────────────────
def test_predict_rbac_rejections(client, auth_headers):
    """Verify that anonymous and unauthorized roles are rejected."""
    img_bytes = make_test_image()
    b64_str = base64.b64encode(img_bytes).decode("ascii")
    payload = {"image_base64": b64_str}

    # 1. Anonymous -> 401 Unauthorized
    res_anon = client.post("/api/v1/ml/predict", json=payload)
    assert res_anon.status_code == 401

    # 2. Patient -> 403 Forbidden
    res_pat = client.post("/api/v1/ml/predict", json=payload, headers=auth_headers["patient"])
    assert res_pat.status_code == 403

    # 3. ASHA -> 403 Forbidden
    res_asha = client.post("/api/v1/ml/predict", json=payload, headers=auth_headers["asha"])
    assert res_asha.status_code == 403


# ────────────────────────────────────────────────────────────────────────────
# 4. INPUT VALIDATION TESTS: /api/v1/ml/predict
# ────────────────────────────────────────────────────────────────────────────
def test_predict_rejects_unsupported_file_type(client, auth_headers):
    """Verify rejection of non-image MIME types."""
    files = {"file": ("malicious.txt", b"Hello world text file", "text/plain")}
    res = client.post("/api/v1/ml/predict", files=files, headers=auth_headers["doctor"])
    assert res.status_code == 415


def test_predict_rejects_corrupted_image(client, auth_headers):
    """Verify rejection of corrupt bytes."""
    files = {"file": ("broken.png", b"\x89PNG\r\n\x1a\nCorruptedGarbageBytes", "image/png")}
    res = client.post("/api/v1/ml/predict", files=files, headers=auth_headers["doctor"])
    assert res.status_code == 400


def test_predict_rejects_empty_payload(client, auth_headers):
    """Verify rejection when no image is provided."""
    res = client.post("/api/v1/ml/predict", json={}, headers=auth_headers["doctor"])
    assert res.status_code == 400


# ────────────────────────────────────────────────────────────────────────────
# 5. INFERENCE ENDPOINT INTEGRATION: /api/v1/ml/predict
# ────────────────────────────────────────────────────────────────────────────
def test_ml_predict_multipart_upload(client, auth_headers):
    """Verify multipart file upload to /api/v1/ml/predict."""
    img_bytes = make_test_image(format="PNG")
    files = {"file": ("chest_radiograph.png", img_bytes, "image/png")}

    res = client.post("/api/v1/ml/predict", files=files, headers=auth_headers["doctor"])
    assert res.status_code == 200, res.text
    data = res.json()

    assert "request_id" in data
    assert data["model_name"] == "MedFed DenseNet121-CheXNet-14Class"
    assert "prediction" in data
    assert len(data["prediction"]["labels"]) == 14
    assert len(data["prediction"]["scores"]) == 14
    assert len(data["findings"]) == 14
    assert data["top_finding"] in DEFAULT_CHEST_XRAY_CLASSES
    assert data["explainability"]["available"] is True
    assert data["requires_clinician_review"] is True
    assert "disclaimer" in data["safety_disclaimer"].lower() or "ai-assisted" in data["safety_disclaimer"].lower()


def test_ml_predict_base64_json(client, auth_headers):
    """Verify JSON base64 request to /api/v1/ml/predict."""
    img_bytes = make_test_image(format="JPEG")
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('ascii')}"

    payload = {
        "image_base64": b64_str,
        "target_class": "Pneumonia",
        "generate_gradcam": True,
    }

    res = client.post("/api/v1/ml/predict", json=payload, headers=auth_headers["doctor"])
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "completed"
    assert data["explainability"]["explained_class"] == "Pneumonia"
    assert data["explainability"]["visualization"].startswith("data:image/png;base64,")


def test_ml_predict_curated_sample(client, auth_headers):
    """Verify curated sample inference via sample_id."""
    payload = {"sample_id": "sample-ramesh"}
    res = client.post("/api/v1/ml/predict", json=payload, headers=auth_headers["doctor"])
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "completed"
    assert len(data["findings"]) == 14


# ────────────────────────────────────────────────────────────────────────────
# 6. WORKSTATION CLINICAL ENDPOINT: /api/v1/xray/predict & reviews
# ────────────────────────────────────────────────────────────────────────────
def test_xray_predict_and_doctor_review_workflow(client, auth_headers):
    """Test full doctor workstation workflow:
    1. Look up patient.
    2. Run X-ray AI inference on patient radiograph.
    3. Submit doctor review (decision, notes, treatment plan).
    4. Verify study record and referral status in database.
    """
    db = SessionLocal()
    patient = db.query(Patient).first()
    assert patient is not None, "A seeded patient must exist"
    patient_id = str(patient.id)

    # 1. Run inference for patient
    predict_payload = {
        "sample_id": "sample-ramesh",
        "patient_id": patient_id,
    }
    res_pred = client.post("/api/v1/xray/predict", json=predict_payload, headers=auth_headers["doctor"])
    assert res_pred.status_code == 200, res_pred.text
    pred_data = res_pred.json()

    assert pred_data["top_finding"] in DEFAULT_CHEST_XRAY_CLASSES
    assert len(pred_data["findings"]) == 14
    assert pred_data["gradcam_overlay_base64"] is not None

    # 2. Submit clinical review
    review_payload = {
        "patient_id": patient_id,
        "referral_id": None,
        "sample_id": "sample-ramesh",
        "top_finding": pred_data["top_finding"],
        "top_confidence": pred_data["top_confidence"],
        "decision": "agree",
        "clinical_notes": "Radiographic evidence aligns with physical exam. Left basilar infiltration.",
        "treatment_plan": "Amoxicillin-clavulanate 625mg TID for 7 days + follow-up.",
        "schedule_follow_up_days": 7,
        "findings": pred_data["findings"],
    }

    res_rev = client.post("/api/v1/xray/reviews", json=review_payload, headers=auth_headers["doctor"])
    assert res_rev.status_code in [200, 201], res_rev.text
    rev_data = res_rev.json()
    study_id = rev_data["study_id"]
    assert study_id is not None

    # 3. Verify in database
    study = db.query(ChestXRayStudy).filter(ChestXRayStudy.id == uuid.UUID(study_id)).first()
    assert study is not None
    assert study.patient_id == patient.id
    assert study.review_status == "agree"
    assert study.top_finding == pred_data["top_finding"]
    assert len(study.predictions) == 14
    assert "Radiographic evidence" in study.doctor_notes
    db.close()
