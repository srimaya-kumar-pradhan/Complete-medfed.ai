"""
Comprehensive exploration script simulating real user interactions
across all roles on http://localhost:8000.
"""
import requests
import json
import base64

BASE_URL = "http://127.0.0.1:8000/api/v1"

ROLES = [
    ("Patient", "demo_patient", "dori2024demo"),
    ("ASHA Worker", "demo_asha", "dori2024demo"),
    ("Medical Officer / Doctor", "demo_mo", "dori2024demo"),
    ("District Health Officer", "demo_dho", "dori2024demo"),
    ("Administrator", "demo_admin", "dori2024demo"),
]

def print_section(title):
    print(f"\n{'='*70}\n{title}\n{'='*70}")

tokens = {}

print_section("PHASE 1: AUTHENTICATION & TOKEN ACQUISITION FOR ALL ROLES")
for role_name, username, password in ROLES:
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        data = res.json()
        tokens[username] = data["access_token"]
        print(f"[OK] [{role_name}] Login Successful: user='{username}', role='{data.get('user', {}).get('role')}'")
    else:
        print(f"[FAIL] [{role_name}] Login Failed ({res.status_code}): {res.text}")

print_section("PHASE 2: ROLE-BASED ACCESS CONTROL (RBAC) PROBING")
# Probing Chest X-Ray AI Endpoint across all roles
for role_name, username, _ in ROLES:
    if username not in tokens:
        continue
    headers = {"Authorization": f"Bearer {tokens[username]}"}
    res = requests.get(f"{BASE_URL}/xray/samples", headers=headers)
    print(f"[{role_name} -> GET /xray/samples] Status: {res.status_code} ({res.reason})")

print_section("PHASE 3: ASHA WORKFLOW (PATIENT LIST & REGISTRATION)")
headers_asha = {"Authorization": f"Bearer {tokens['demo_asha']}"}

# List patients
res = requests.get(f"{BASE_URL}/patients", headers=headers_asha)
print(f"ASHA Patient List Status: {res.status_code}")
if res.status_code == 200:
    patients = res.json()
    print(f"Total Patients in Registry: {len(patients)}")
    if patients:
        print(f"Sample Patient: ID={patients[0].get('id')}, Name={patients[0].get('full_name')}, Village={patients[0].get('village')}")

# Register a test patient
reg_payload = {
    "full_name": "Kavita Devi",
    "date_of_birth": "1994-08-15",
    "gender": "female",
    "blood_group": "A+",
    "phone": "9876543210",
    "email": "kavita.devi@example.in",
    "village": "Karera Village",
    "address": "House 12, Main Street, Karera",
    "emergency_contact_name": "Suresh Devi",
    "emergency_contact_phone": "9876543211",
    "clinical_notes": "ANC 2nd trimester check-up. Mild anemia, BP 118/76.",
    "existing_conditions": "Mild nutritional anemia",
    "consent_teleconsultation": True,
    "consent_data_sharing": True,
    "consent_research": False
}
res_reg = requests.post(f"{BASE_URL}/patients", json=reg_payload, headers=headers_asha)
print(f"Patient Registration Status: {res_reg.status_code}")
if res_reg.status_code == 201:
    created_patient = res_reg.json()
    print(f"[OK] Newly Registered Patient: ID={created_patient.get('id')}, Name={created_patient.get('full_name')}")

print_section("PHASE 4: CARE PASSPORT & LOCAL VECTOR STORE RETRIEVAL")
res_pass = requests.get(f"{BASE_URL}/care-passports", headers=headers_asha)
print(f"Care Passports List Status: {res_pass.status_code}")
if res_pass.status_code == 200:
    passports = res_pass.json()
    print(f"Total Care Passports: {len(passports)}")
    if passports:
        p = passports[0]
        print(f"Sample Passport: ID={p.get('id')}, Passport Number={p.get('passport_number')}, Patient ID={p.get('patient_id')}")

print_section("PHASE 5: REFERRALS & CARE GAPS")
res_ref = requests.get(f"{BASE_URL}/referrals", headers=headers_asha)
print(f"Referrals List Status: {res_ref.status_code}")
if res_ref.status_code == 200:
    refs = res_ref.json()
    print(f"Total Referrals: {len(refs)}")
    for r in refs[:2]:
        print(f"  Referral: ID={r.get('id')}, From={r.get('from_facility_id')}, To={r.get('to_facility_id')}, Status={r.get('status')}, Priority={r.get('priority')}")

res_gaps = requests.get(f"{BASE_URL}/care-gaps", headers=headers_asha)
print(f"Care Gaps List Status: {res_gaps.status_code}")
if res_gaps.status_code == 200:
    gaps = res_gaps.json()
    print(f"Total Care Gaps: {len(gaps)}")
    for g in gaps[:2]:
        print(f"  Care Gap: ID={g.get('id')}, Category={g.get('gap_category')}, Priority={g.get('priority')}, Action={g.get('action_required')}")

print_section("PHASE 6: DOCTOR WORKFLOW (CHEST X-RAY AI & GRAD-CAM)")
headers_mo = {"Authorization": f"Bearer {tokens['demo_mo']}"}

# Get curated samples
res_samples = requests.get(f"{BASE_URL}/xray/samples", headers=headers_mo)
print(f"X-Ray Samples Status: {res_samples.status_code}")
sample_id = "sample-ramesh"
if res_samples.status_code == 200:
    samples = res_samples.json()
    print(f"Curated Samples Count: {len(samples)}")
    if samples:
        sample_id = samples[0]["id"]
        print(f"Selected Sample: ID='{sample_id}', Title='{samples[0]['title']}', Category='{samples[0]['category']}'")

# Run inference
predict_payload = {
    "sample_id": sample_id,
    "patient_id": str(created_patient.get("id")) if 'created_patient' in locals() else None,
    "referral_id": None
}
res_pred = requests.post(f"{BASE_URL}/xray/predict", json=predict_payload, headers=headers_mo)
print(f"Inference Status: {res_pred.status_code}")
if res_pred.status_code == 200:
    pred_data = res_pred.json()
    print(f"[OK] Model Version: {pred_data.get('model_version')}")
    print(f"[OK] Federated Round: {pred_data.get('federated_round')}")
    print(f"[OK] Top Finding: {pred_data.get('top_finding')} ({pred_data.get('top_confidence')}%)")
    print(f"[OK] Findings Distribution:")
    for item in pred_data.get("findings", []):
        print(f"    - {item.get('finding')}: {item.get('percentage')}% (Conf: {item.get('confidence')})")
    gradcam_len = len(pred_data.get("gradcam_overlay_base64", ""))
    print(f"[OK] Grad-CAM Heatmap Base64 Length: {gradcam_len} bytes")

    # Submit doctor review
    review_payload = {
        "patient_id": created_patient.get("id"),
        "sample_id": sample_id,
        "top_finding": pred_data.get("top_finding", "Infiltration"),
        "top_confidence": pred_data.get("top_confidence", 0.82),
        "decision": "agree",
        "clinical_notes": "Radiological presentation consistent with early infiltration. Commenced on oral azithromycin.",
        "treatment_plan": "Oral Azithromycin 500mg OD x 5d; steam inhalation; pulse oximetry monitoring.",
        "schedule_follow_up_days": 7
    }
    res_rev = requests.post(f"{BASE_URL}/xray/reviews", json=review_payload, headers=headers_mo)
    print(f"Doctor Review Submission Status: {res_rev.status_code}")
    if res_rev.status_code == 200:
        rev_data = res_rev.json()
        print(f"[OK] Clinical Decision Saved: Study ID={rev_data.get('study_id')}, Status={rev_data.get('status')}")

print_section("PHASE 7: NOTIFICATIONS & LIVE EMAIL DISPATCH")
res_notifs = requests.get(f"{BASE_URL}/notifications", headers=headers_mo)
print(f"In-App Notifications Status: {res_notifs.status_code}")
if res_notifs.status_code == 200:
    notifs = res_notifs.json()
    print(f"Notifications Count: {len(notifs)}")
    for n in notifs[:3]:
        print(f"  - [{n.get('type')}] {n.get('title')}: {n.get('message')}")

email_payload = {
    "to_email": "sihdori7@gmail.com",
    "template_name": "FOLLOW_UP_REMINDER",
    "context": {
        "patient_name": "Kavita Devi",
        "facility_name": "Shivpuri District Hospital",
        "scheduled_date": "26 Sep 2026",
        "reason": "Chest X-Ray and ANC follow-up review",
        "doctor_name": "Dr. Rajesh Sharma, Medical Officer"
    }
}
res_email = requests.post(f"{BASE_URL}/notifications/email", json=email_payload, headers=headers_mo)
print(f"Email Dispatch Status: {res_email.status_code}")
print(f"Email Response: {res_email.text}")

print_section("PHASE 8: ADMIN STORAGE STATUS & AUDIT LOGS")
headers_admin = {"Authorization": f"Bearer {tokens['demo_admin']}"}
res_storage = requests.get(f"{BASE_URL}/admin/storage-status", headers=headers_admin)
print(f"Admin Storage Status Code: {res_storage.status_code}")
if res_storage.status_code == 200:
    print(f"Storage Telemetry: {json.dumps(res_storage.json(), indent=2)}")

res_audit = requests.get(f"{BASE_URL}/audit/events", headers=headers_admin)
print(f"Audit Logs Status: {res_audit.status_code}")
if res_audit.status_code == 200:
    audits = res_audit.json()
    print(f"Audit Logs Count: {len(audits)}")
    for a in audits[:3]:
        print(f"  - [{a.get('timestamp')}] Actor: {a.get('actor_username')} | Action: {a.get('action')} | Status: {a.get('status')}")

print("\nEXPLORATION COMPLETE.")
