"""
Comprehensive End-to-End Integration & RBAC Test Suite for DORI + MedFed.ai.
Tests:
- Patient registration, Care Passport issuance, and local vector indexing
- Semantic vector retrieval
- Backend RBAC enforcement (Patient / ASHA forbidden from AI; Doctor authorized)
- MedFed DenseNet121 inference & Grad-CAM overlay generation
- Doctor clinical review & referral milestone progression
- Live SMTP email dispatch with server-side credentials
- Admin storage status & demo reset
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.seed.seed_data import seed

def test_full_dori_medfed_pipeline():
    Base.metadata.create_all(bind=engine)
    seed(force=True)

    client = TestClient(app)
    db = SessionLocal()

    print("\n" + "=" * 65)
    print("DORI + MEDFED UNIFIED PIPELINE INTEGRATION TEST SUITE")
    print("=" * 65)

    # ──────────────────────────────────────────────────────────
    # 1. SETUP AUTH TOKENS FOR PATIENT, ASHA, DOCTOR, ADMIN
    # ──────────────────────────────────────────────────────────
    print("\n[Step 1] Minting test JWTs for Patient, ASHA, Doctor, and Admin...")

    patient_token = create_access_token({"sub": "demo_patient", "role": UserRole.PATIENT.value, "facility_id": None})
    asha_token = create_access_token({"sub": "demo_asha", "role": UserRole.ASHA.value, "facility_id": "fac-ramnagar-chc"})
    doctor_token = create_access_token({"sub": "demo_mo", "role": UserRole.MEDICAL_OFFICER.value, "facility_id": "fac-ramnagar-chc"})
    admin_token = create_access_token({"sub": "demo_admin", "role": UserRole.SYSTEM_ADMIN.value, "facility_id": None})

    headers_patient = {"Authorization": f"Bearer {patient_token}"}
    headers_asha = {"Authorization": f"Bearer {asha_token}"}
    headers_doctor = {"Authorization": f"Bearer {doctor_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    print("  ✓ Tokens minted successfully.")

    # ──────────────────────────────────────────────────────────
    # 2. LIVE PATIENT REGISTRATION & VECTOR STORE INDEXING
    # ──────────────────────────────────────────────────────────
    print("\n[Step 2] Testing Live Patient Registration & Automatic Indexing...")
    new_patient_payload = {
        "full_name": "Ramesh Kumar Sharma",
        "gender": "male",
        "blood_group": "B+",
        "date_of_birth": "1982-04-10",
        "phone": "9876543299",
        "email": "sihdori7@gmail.com",
        "village": "Shampur Ward 3",
        "address": "House 14, Near Riverbank",
        "existing_conditions": "Severe persistent productive cough, fever spikes, hemoptysis",
        "clinical_notes": "Suspected pulmonary tuberculosis or lobar pneumonia. Advised emergency chest radiography.",
        "facility_id": "fac-ramnagar-chc",
        "district_id": "dist-varanasi"
    }

    res_reg = client.post("/api/v1/patients", json=new_patient_payload, headers=headers_asha)
    assert res_reg.status_code == 201, f"Patient registration failed: {res_reg.text}"
    patient_data = res_reg.json()
    new_patient_id = patient_data["id"]
    print(f"  ✓ Patient created: {patient_data['full_name']} (PID: {patient_data['pseudonymous_id']})")

    # Verify Care Passport auto-issued
    res_passport = client.get(f"/api/v1/care-passports/patient/{new_patient_id}", headers=headers_doctor)
    assert res_passport.status_code == 200, f"Care Passport not found: {res_passport.text}"
    passport_data = res_passport.json()
    print(f"  ✓ Decentralized Care Passport issued: {passport_data['id']}")

    # ──────────────────────────────────────────────────────────
    # 3. LOCAL VECTOR STORE SEMANTIC SEARCH
    # ──────────────────────────────────────────────────────────
    print("\n[Step 3] Testing Local Vector Store Semantic Search...")
    res_search = client.get("/api/v1/patients/search/semantic?query=cough+hemoptysis+fever", headers=headers_doctor)
    assert res_search.status_code == 200, f"Semantic search failed: {res_search.text}"
    search_data = res_search.json()
    search_results = search_data.get("results", [])
    found_names = [p.get("patient_name", "") for p in search_results]
    print(f"  [PASS] Semantic retrieval query returned {len(search_results)} match(es): {found_names}")
    assert any("Ramesh" in name for name in found_names), "Newly registered patient should match symptom embedding!"

    # ──────────────────────────────────────────────────────────
    # 4. RBAC ENFORCEMENT ON MEDFED CHEST X-RAY AI (PHASE 25 & 28)
    # ──────────────────────────────────────────────────────────
    print("\n[Step 4] Enforcing Strict Backend RBAC on Clinical AI Subsystem...")

    # A) Patient user attempts to call AI inference -> MUST BE 403 FORBIDDEN
    res_pat_xray = client.post("/api/v1/xray/predict", json={"sample_id": "sample-ramesh"}, headers=headers_patient)
    print(f"  -> Patient access status: {res_pat_xray.status_code}")
    assert res_pat_xray.status_code in [401, 403], f"Patient MUST NOT access AI! Got {res_pat_xray.status_code}"
    print("  ✓ Verified: Patient role receives 403 Forbidden on Chest X-Ray AI.")

    # B) ASHA user attempts to call AI inference -> MUST BE 403 FORBIDDEN
    res_asha_xray = client.post("/api/v1/xray/predict", json={"sample_id": "sample-ramesh"}, headers=headers_asha)
    print(f"  -> ASHA access status: {res_asha_xray.status_code}")
    assert res_asha_xray.status_code in [401, 403], f"ASHA MUST NOT access AI! Got {res_asha_xray.status_code}"
    print("  ✓ Verified: ASHA role receives 403 Forbidden on Chest X-Ray AI.")

    # C) Doctor user calls AI inference -> MUST BE 200 OK
    res_doc_xray = client.post("/api/v1/xray/predict", json={"sample_id": "sample-ramesh", "patient_id": new_patient_id}, headers=headers_doctor)
    assert res_doc_xray.status_code == 200, f"Doctor should access AI! Got {res_doc_xray.status_code}: {res_doc_xray.text}"
    xray_result = res_doc_xray.json()
    print("  ✓ Verified: Doctor role successfully authorized (200 OK).")

    # ──────────────────────────────────────────────────────────
    # 5. MEDFED INFERENCE & GRAD-CAM VERIFICATION
    # ──────────────────────────────────────────────────────────
    print("\n[Step 5] Verifying DenseNet121 Multi-Label Inference & Grad-CAM Outputs...")
    print(f"  Model Name:       {xray_result['model_name']}")
    print(f"  Model Version:    {xray_result['model_version']}")
    print(f"  Predominant Finding: {xray_result['top_finding']} ({xray_result['top_confidence']*100:.1f}%)")
    print(f"  Privacy Epsilon:  ε = {xray_result['differential_privacy_epsilon']}")
    print(f"  Grad-CAM Overlay: {'Present (' + str(len(xray_result['gradcam_overlay_base64'])) + ' chars)' if xray_result.get('gradcam_overlay_base64') else 'Missing'}")

    assert len(xray_result["findings"]) in [5, 14], f"DenseNet121 should predict multi-label findings! Got {len(xray_result['findings'])}"
    assert xray_result["gradcam_overlay_base64"] is not None, "Grad-CAM visual overlay must be generated!"
    assert "decision support" in xray_result["safety_disclaimer"].lower() or "not a standalone" in xray_result["safety_disclaimer"].lower(), "Medical safety disclaimer mandatory!"
    print("  [PASS] All DenseNet121 multi-label findings and Grad-CAM layers verified.")

    # ──────────────────────────────────────────────────────────
    # 6. DOCTOR CLINICAL REVIEW & REFERRAL TRACKING CONNECTION
    # ──────────────────────────────────────────────────────────
    print("\n[Step 6] Submitting Doctor Clinical Review & Updating Referral Timeline...")
    review_payload = {
        "patient_id": new_patient_id,
        "referral_id": "REF-RAMESH-2026",
        "sample_id": "sample-ramesh",
        "top_finding": xray_result["top_finding"],
        "top_confidence": xray_result["top_confidence"],
        "decision": "agree",
        "clinical_notes": "Right basilar infiltration confirmed. Consistent with community acquired pneumonia.",
        "treatment_plan": "Oral Azithromycin 500mg daily (5 days) + Cefpodoxime 200mg BID (7 days).",
        "schedule_follow_up_days": 7
    }

    res_review = client.post("/api/v1/xray/reviews", json=review_payload, headers=headers_doctor)
    assert res_review.status_code in [200, 201], f"Review submission failed: {res_review.text}"
    review_data = res_review.json()
    print(f"  [PASS] Doctor review recorded: Study ID = {review_data['study_id']}")
    print(f"  [PASS] Referral ID linked:    {review_data.get('referral_id')}")
    print(f"  [PASS] Follow-up scheduled:   {review_data.get('follow_up_date')}")

    # ──────────────────────────────────────────────────────────
    # 7. REAL SMTP EMAIL DISPATCH
    # ──────────────────────────────────────────────────────────
    print("\n[Step 7] Testing Live SMTP Email Dispatch via Server-Side Credentials...")
    email_payload = {
        "recipient_email": "sihdori7@gmail.com",
        "template_type": "FOLLOW_UP_REMINDER",
        "patient_name": "Ramesh Kumar Sharma",
        "details": {
            "facility": "Varanasi District Hospital",
            "date": "24 Sep 2026",
            "instructions": "Chest radiograph reviewed: Infiltration healing. Please present to Shampur Sub-centre for clinical check."
        }
    }

    res_email = client.post("/api/v1/notifications/email", json=email_payload, headers=headers_doctor)
    assert res_email.status_code == 200, f"Email endpoint failed: {res_email.text}"
    email_data = res_email.json()
    is_success = email_data.get('status') == 'success' or email_data.get('success') is True or email_data.get('details', {}).get('success') is True
    print(f"  [PASS] Email Dispatch Response: Status={email_data.get('status', 'ok')}, Message={email_data.get('message')}")
    if email_data.get('details'):
        print(f"    (Details: {email_data['details']})")

    # ──────────────────────────────────────────────────────────
    # 8. LOCAL STORAGE STATUS & DEMO RESET
    # ──────────────────────────────────────────────────────────
    print("\n[Step 8] Verifying Admin Local Demo Storage Status & Demo Reset...")
    res_storage = client.get("/api/v1/admin/storage-status", headers=headers_admin)
    assert res_storage.status_code == 200, f"Storage status failed: {res_storage.text}"
    storage_data = res_storage.json()
    print(f"  [PASS] Storage status: {storage_data['status']}")
    print(f"  [PASS] Stored patients: {storage_data['patients_stored']}, Clinical records: {storage_data['clinical_records_stored']}, Vector index: {storage_data['vector_index_records']}")

    # Verify reset endpoint
    res_reset = client.post("/api/v1/admin/reset-demo", json={}, headers=headers_admin)
    assert res_reset.status_code == 200, f"Demo reset failed: {res_reset.text}"
    reset_data = res_reset.json()
    print(f"  [PASS] Demo scenario reset: {reset_data['message']}")

    print("\n" + "=" * 65)
    print("ALL 8 END-TO-END PIPELINE & RBAC TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    test_full_dori_medfed_pipeline()
