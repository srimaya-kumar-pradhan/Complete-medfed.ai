"""Seed script: creates synthetic demo data for DORI.

ALL DATA IS SYNTHETIC. No real patient data is used.
Run: python -m app.seed.seed_data
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.core.database import SessionLocal, engine, Base
from app.core.security import generate_pseudonymous_id, hash_password
from app.models.audit import Anomaly, PublicHealthEvent
from app.models.care_gap import CareGap, RiskPrediction, HealthWorkerTask
from app.models.clinical import ClinicalEncounter, Medication, Allergy, Immunization, LabResult
from app.models.consent import Consent
from app.models.enums import (
    BloodGroup,
    CareGapSeverity,
    CareGapStatus,
    ConsentPurpose,
    ConsentStatus,
    EncounterType,
    FacilityType,
    Gender,
    ReferralPriority,
    ReferralStatus,
    UserRole,
)
from app.models.federated import FederatedNode, FederatedRound, ModelVersion
from app.models.patient import CarePassport, Patient
from app.models.referral import Referral, ReferralEvent
from app.models.sync import Device
from app.models.user import District, Facility, State, User
from app.models.xray import ChestXRayStudy


def seed(force: bool = False):
    """Create all synthetic demo data."""
    if force:
        Base.metadata.drop_all(bind=engine)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if not force and db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding DORI database with SYNTHETIC demo data...")

        # ─── States & Districts ──────────────────────────────────
        state = State(name="Madhya Pradesh", code="MP")
        db.add(state)
        db.flush()

        district = District(name="Shivpuri", code="MP-SHIV", state_id=state.id)
        db.add(district)
        db.flush()

        district2 = District(name="Guna", code="MP-GUNA", state_id=state.id)
        db.add(district2)
        db.flush()

        # ─── Facilities ─────────────────────────────────────────
        sub_centre = Facility(
            name="Karera Sub-Centre", facility_type=FacilityType.SUB_CENTRE.value,
            code="MP-SHIV-SC-001", district_id=district.id,
            latitude=25.4615, longitude=77.6271,
        )
        phc = Facility(
            name="Shivpuri PHC", facility_type=FacilityType.PHC.value,
            code="MP-SHIV-PHC-001", district_id=district.id,
            latitude=25.4231, longitude=77.6561,
        )
        chc = Facility(
            name="Shivpuri CHC", facility_type=FacilityType.CHC.value,
            code="MP-SHIV-CHC-001", district_id=district.id,
            latitude=25.4311, longitude=77.6512,
        )
        dh = Facility(
            name="Shivpuri District Hospital", facility_type=FacilityType.DISTRICT_HOSPITAL.value,
            code="MP-SHIV-DH-001", district_id=district.id,
            latitude=25.4278, longitude=77.6608,
        )
        db.add_all([sub_centre, phc, chc, dh])
        db.flush()

        # ─── Demo Users ─────────────────────────────────────────
        # Password for all demo users: "dori2024demo"
        demo_pw = hash_password("dori2024demo")

        user_asha = User(
            username="demo_asha", password_hash=demo_pw,
            full_name="Sunita Devi", role=UserRole.ASHA,
            phone="+919876543210", language="hi",
        )
        user_asha.facilities = [sub_centre]

        user_anm = User(
            username="demo_anm", password_hash=demo_pw,
            full_name="Rekha Sharma", role=UserRole.ANM,
            phone="+919876543211", language="hi",
        )
        user_anm.facilities = [sub_centre, phc]

        user_mo = User(
            username="demo_mo", password_hash=demo_pw,
            full_name="Dr. Rajesh Kumar", role=UserRole.MEDICAL_OFFICER,
            email="dr.rajesh@demo.dori.health", language="en",
        )
        user_mo.facilities = [phc, chc]

        user_dho = User(
            username="demo_dho", password_hash=demo_pw,
            full_name="Dr. Priya Verma", role=UserRole.DISTRICT_OFFICER,
            email="priya.verma@demo.dori.health", language="en",
            assigned_district_id=district.id,
        )

        user_state = User(
            username="demo_state", password_hash=demo_pw,
            full_name="Anil Mishra", role=UserRole.STATE_ADMIN,
            email="anil.mishra@demo.dori.health", language="en",
            assigned_state_id=state.id,
        )

        user_ref = User(
            username="demo_referral", password_hash=demo_pw,
            full_name="Dr. Meena Singh", role=UserRole.REFERRAL_FACILITY,
            email="meena.singh@demo.dori.health", language="en",
        )
        user_ref.facilities = [dh]

        user_admin = User(
            username="demo_admin", password_hash=demo_pw,
            full_name="System Administrator", role=UserRole.SYSTEM_ADMIN,
            email="admin@demo.dori.health", language="en",
        )

        user_patient = User(
            username="demo_patient", password_hash=demo_pw,
            full_name="Lakshmi Bai", role=UserRole.PATIENT,
            phone="+919876543299", language="hi",
        )

        all_users = [user_asha, user_anm, user_mo, user_dho, user_state, user_ref, user_admin, user_patient]
        db.add_all(all_users)
        db.flush()

        # ─── Demo Patients ───────────────────────────────────────
        # ANC Patient (flagship workflow)
        p_anc = Patient(
            pseudonymous_id=generate_pseudonymous_id(),
            full_name="Lakshmi Bai", user_id=user_patient.id,
            date_of_birth=datetime(1998, 5, 15),
            gender=Gender.FEMALE, blood_group=BloodGroup.B_POSITIVE,
            phone="+919876543299", village="Karera",
            district_id=district.id, facility_id=sub_centre.id,
            emergency_contact_name="Raju Bai",
            emergency_contact_phone="+919876543298",
        )

        p_tb = Patient(
            pseudonymous_id=generate_pseudonymous_id(),
            full_name="Mohan Lal", date_of_birth=datetime(1975, 3, 20),
            gender=Gender.MALE, blood_group=BloodGroup.O_POSITIVE,
            phone="+919876543301", village="Pohri",
            district_id=district.id, facility_id=phc.id,
        )

        p_chronic = Patient(
            pseudonymous_id=generate_pseudonymous_id(),
            full_name="Kamla Devi", date_of_birth=datetime(1960, 11, 10),
            gender=Gender.FEMALE, blood_group=BloodGroup.A_POSITIVE,
            phone="+919876543302", village="Narwar",
            district_id=district.id, facility_id=phc.id,
        )

        p_child = Patient(
            pseudonymous_id=generate_pseudonymous_id(),
            full_name="Ravi Kumar", date_of_birth=datetime(2024, 1, 15),
            gender=Gender.MALE, blood_group=BloodGroup.B_POSITIVE,
            village="Karera", district_id=district.id, facility_id=sub_centre.id,
        )

        # Flagship SIH Presentation Patient: Ramesh Kumar
        p_ramesh = Patient(
            pseudonymous_id="PID-2026-RAMESH-4412",
            full_name="Ramesh Kumar",
            date_of_birth=datetime(1982, 4, 10),
            gender=Gender.MALE,
            blood_group=BloodGroup.B_POSITIVE,
            phone="+919876543212",
            email="sihdori7@gmail.com",
            village="Karera",
            district_id=district.id,
            facility_id=phc.id,
            emergency_contact_name="Sunita Kumar",
            emergency_contact_phone="+919876543213",
        )

        db.add_all([p_anc, p_tb, p_chronic, p_child, p_ramesh])
        db.flush()

        # ─── ANC Encounters ─────────────────────────────────────
        now = datetime.now(UTC)
        enc1 = ClinicalEncounter(
            patient_id=p_anc.id, facility_id=sub_centre.id, provider_id=user_asha.id,
            encounter_type=EncounterType.ANC_VISIT,
            encounter_date=now - timedelta(days=90),
            chief_complaint="First ANC registration",
            anc_visit_number=1, gestational_weeks=12,
            expected_delivery_date=(now + timedelta(days=180)).date(),
            risk_category="normal",
            vitals={"bp_systolic": 120, "bp_diastolic": 80, "weight_kg": 55, "hemoglobin": 11.2},
        )
        enc2 = ClinicalEncounter(
            patient_id=p_anc.id, facility_id=sub_centre.id, provider_id=user_anm.id,
            encounter_type=EncounterType.ANC_VISIT,
            encounter_date=now - timedelta(days=60),
            chief_complaint="Second ANC visit",
            anc_visit_number=2, gestational_weeks=16,
            risk_category="normal",
            vitals={"bp_systolic": 118, "bp_diastolic": 78, "weight_kg": 57, "hemoglobin": 10.8},
        )
        enc3 = ClinicalEncounter(
            patient_id=p_anc.id, facility_id=phc.id, provider_id=user_mo.id,
            encounter_type=EncounterType.ANC_VISIT,
            encounter_date=now - timedelta(days=20),
            chief_complaint="Third ANC visit — elevated BP noted",
            diagnosis="Mild pre-eclampsia suspected",
            anc_visit_number=3, gestational_weeks=22,
            risk_category="high",
            vitals={"bp_systolic": 145, "bp_diastolic": 95, "weight_kg": 60, "hemoglobin": 10.2},
        )

        # TB encounters
        enc_tb1 = ClinicalEncounter(
            patient_id=p_tb.id, facility_id=phc.id, provider_id=user_mo.id,
            encounter_type=EncounterType.TB_VISIT,
            encounter_date=now - timedelta(days=120),
            chief_complaint="TB diagnosis, starting DOTS",
            diagnosis="Pulmonary TB", diagnosis_code="A15.0",
            tb_treatment_phase="intensive", tb_treatment_month=1,
        )
        enc_tb2 = ClinicalEncounter(
            patient_id=p_tb.id, facility_id=phc.id, provider_id=user_mo.id,
            encounter_type=EncounterType.TB_VISIT,
            encounter_date=now - timedelta(days=60),
            chief_complaint="TB follow-up month 2",
            tb_treatment_phase="intensive", tb_treatment_month=2,
        )

        # Chronic disease
        enc_chronic = ClinicalEncounter(
            patient_id=p_chronic.id, facility_id=phc.id, provider_id=user_mo.id,
            encounter_type=EncounterType.CHRONIC_DISEASE,
            encounter_date=now - timedelta(days=45),
            chief_complaint="Hypertension follow-up",
            diagnosis="Essential hypertension",
            chronic_condition_type="hypertension",
            vitals={"bp_systolic": 155, "bp_diastolic": 100},
        )

        db.add_all([enc1, enc2, enc3, enc_tb1, enc_tb2, enc_chronic])
        db.flush()

        # ─── Medications ─────────────────────────────────────────
        med1 = Medication(
            patient_id=p_anc.id, name="Iron Folic Acid",
            dosage="1 tablet", frequency="Daily",
            start_date=now - timedelta(days=90), prescribed_by=user_mo.id,
        )
        med2 = Medication(
            patient_id=p_anc.id, name="Calcium supplement",
            dosage="500mg", frequency="Twice daily",
            start_date=now - timedelta(days=60), prescribed_by=user_mo.id,
        )
        med_tb = Medication(
            patient_id=p_tb.id, name="DOTS regimen (HRZE)",
            dosage="Fixed dose combination", frequency="Daily",
            start_date=now - timedelta(days=120), prescribed_by=user_mo.id,
        )
        med_bp = Medication(
            patient_id=p_chronic.id, name="Amlodipine",
            dosage="5mg", frequency="Once daily",
            start_date=now - timedelta(days=180), prescribed_by=user_mo.id,
        )
        db.add_all([med1, med2, med_tb, med_bp])

        # ─── Allergies ───────────────────────────────────────────
        allergy1 = Allergy(
            patient_id=p_anc.id, allergen="Sulfonamides",
            reaction="Skin rash", severity="moderate",
            recorded_by=user_mo.id,
        )
        db.add(allergy1)

        # ─── Immunizations ──────────────────────────────────────
        imm1 = Immunization(
            patient_id=p_anc.id, vaccine_name="Tetanus Toxoid",
            dose_number=1, administered_date=(now - timedelta(days=80)).date(),
            facility_id=sub_centre.id, administered_by=user_anm.id,
        )
        imm2 = Immunization(
            patient_id=p_child.id, vaccine_name="BCG",
            dose_number=1, administered_date=datetime(2024, 1, 16).date(),
            facility_id=sub_centre.id, administered_by=user_anm.id,
        )
        db.add_all([imm1, imm2])

        # ─── Lab Results ─────────────────────────────────────────
        lab1 = LabResult(
            patient_id=p_anc.id, test_name="Hemoglobin",
            result_value="10.2", result_unit="g/dL",
            reference_range="12-16", is_abnormal=True,
            test_date=(now - timedelta(days=20)).date(),
            facility_id=phc.id,
        )
        lab2 = LabResult(
            patient_id=p_anc.id, test_name="Urine Protein",
            result_value="1+", result_unit="",
            reference_range="Negative", is_abnormal=True,
            test_date=(now - timedelta(days=20)).date(),
            facility_id=phc.id,
        )
        db.add_all([lab1, lab2])

        # ─── Care Passport ───────────────────────────────────────
        import json
        passport = CarePassport(
            patient_id=p_anc.id,
            pseudonymous_id=p_anc.pseudonymous_id,
            qr_data=json.dumps({
                "pid": p_anc.pseudonymous_id,
                "ver": 1,
                "iss": now.isoformat(),
                "type": "DORI_CARE_PASSPORT",
            }),
            expires_at=now + timedelta(days=365),
            emergency_blood_group=BloodGroup.B_POSITIVE.value,
            emergency_allergies="Sulfonamides",
            emergency_medications="Iron Folic Acid, Calcium supplement",
            emergency_conditions="Pregnancy (high-risk, suspected pre-eclampsia)",
        )
        db.add(passport)
        db.flush()

        # ─── Consent ─────────────────────────────────────────────
        consent1 = Consent(
            patient_id=p_anc.id,
            purpose=ConsentPurpose.TREATMENT,
            scope="clinical_summary,medications,allergies,lab_results",
            recipient_facility_id=phc.id,
            expires_at=now + timedelta(days=180),
        )
        consent2 = Consent(
            patient_id=p_anc.id,
            purpose=ConsentPurpose.REFERRAL,
            scope="clinical_summary,medications,allergies",
            recipient_facility_id=chc.id,
            expires_at=now + timedelta(days=30),
        )
        db.add_all([consent1, consent2])
        db.flush()

        # ─── Referral ────────────────────────────────────────────
        referral = Referral(
            referral_token="REF-DEMO0001",
            patient_id=p_anc.id,
            referring_facility_id=phc.id,
            receiving_facility_id=chc.id,
            referred_by_id=user_mo.id,
            consent_id=consent2.id,
            status=ReferralStatus.ISSUED,
            priority=ReferralPriority.URGENT,
            reason="Suspected pre-eclampsia — needs specialist evaluation",
            clinical_summary="G1P0, 22 weeks, BP 145/95, proteinuria 1+, Hb 10.2",
            diagnosis="Suspected pre-eclampsia",
        )
        db.add(referral)
        db.flush()

        # Referral events
        ref_ev1 = ReferralEvent(
            referral_id=referral.id,
            from_status=None, to_status=ReferralStatus.CREATED,
            actor_id=user_mo.id, notes="Referral created",
            created_at=now - timedelta(hours=2),
        )
        ref_ev2 = ReferralEvent(
            referral_id=referral.id,
            from_status=ReferralStatus.CREATED, to_status=ReferralStatus.ISSUED,
            actor_id=user_mo.id, notes="Referral token issued to patient",
            created_at=now - timedelta(hours=1),
        )
        db.add_all([ref_ev1, ref_ev2])

        # ─── Ramesh Kumar Care Passport & Closed-Loop Referral ───
        passport_ramesh = CarePassport(
            patient_id=p_ramesh.id,
            pseudonymous_id=p_ramesh.pseudonymous_id,
            qr_data=json.dumps({
                "pid": p_ramesh.pseudonymous_id,
                "name": p_ramesh.full_name,
                "ver": 1,
                "iss": now.isoformat(),
                "conditions": "Suspected Pulmonary Infiltration / Persistent Cough",
                "type": "DORI_CARE_PASSPORT",
            }),
            expires_at=now + timedelta(days=365),
            emergency_blood_group=BloodGroup.B_POSITIVE.value,
            emergency_conditions="Persistent dry cough 4w, fever, weight loss",
            emergency_medications="None",
            emergency_allergies="None known",
        )
        db.add(passport_ramesh)

        enc_ramesh = ClinicalEncounter(
            patient_id=p_ramesh.id, facility_id=phc.id, provider_id=user_mo.id,
            encounter_type=EncounterType.CONSULTATION,
            encounter_date=now - timedelta(hours=5),
            chief_complaint="Persistent dry cough > 3 weeks, evening low-grade fever, weight loss",
            diagnosis="Suspected Pulmonary Infiltration / Tuberculosis",
            treatment_plan="Urgent referral to District Hospital Pulmonology for Chest X-Ray & Sputum AFB.",
            vitals={"bp_systolic": 128, "bp_diastolic": 82, "weight_kg": 58, "spo2": 96},
        )
        db.add(enc_ramesh)
        db.flush()

        # Ramesh Kumar Referral (In Transit → Arrived → Accepted at District Hospital)
        referral_ramesh = Referral(
            referral_token="REF-RAMESH-2026",
            patient_id=p_ramesh.id,
            referring_facility_id=phc.id,
            receiving_facility_id=dh.id,
            referred_by_id=user_mo.id,
            status=ReferralStatus.ACCEPTED,
            priority=ReferralPriority.URGENT,
            reason="Persistent dry cough > 3 weeks, evening low-grade fever — urgent CXR & Pulmonology triage",
            clinical_summary="42M, productive cough 4 weeks, right apical crepitations. Sputum AFB pending. Needs Chest PA radiograph.",
            diagnosis="Suspected Pulmonary Infiltration",
        )
        db.add(referral_ramesh)
        db.flush()

        ref_ram_ev1 = ReferralEvent(
            referral_id=referral_ramesh.id,
            from_status=None, to_status=ReferralStatus.CREATED,
            actor_id=user_asha.id,
            notes="Registered at Karera Sub-Centre & PHC. Initial vitals logged.",
            created_at=now - timedelta(hours=6),
            metadata_json={"stage": "REGISTERED", "facility": "Karera PHC", "role": "ASHA / MO"}
        )
        ref_ram_ev2 = ReferralEvent(
            referral_id=referral_ramesh.id,
            from_status=ReferralStatus.CREATED, to_status=ReferralStatus.ISSUED,
            actor_id=user_mo.id,
            notes="Doctor consultation completed. Urgent secondary referral issued to District Hospital.",
            created_at=now - timedelta(hours=4, minutes=30),
            metadata_json={"stage": "CONSULTED", "facility": "Karera PHC", "role": "Medical Officer"}
        )
        ref_ram_ev3 = ReferralEvent(
            referral_id=referral_ramesh.id,
            from_status=ReferralStatus.ISSUED, to_status=ReferralStatus.IN_TRANSIT,
            actor_id=user_asha.id,
            notes="Patient boarded Janani Express / 108 Emergency Transit to District Hospital.",
            created_at=now - timedelta(hours=2, minutes=45),
            metadata_json={"stage": "IN_TRANSIT", "facility": "108 Ambulance", "role": "Paramedic"}
        )
        ref_ram_ev4 = ReferralEvent(
            referral_id=referral_ramesh.id,
            from_status=ReferralStatus.IN_TRANSIT, to_status=ReferralStatus.ARRIVED,
            actor_id=user_ref.id,
            notes="Patient arrived at Shivpuri District Hospital Intake Desk.",
            created_at=now - timedelta(hours=1, minutes=15),
            metadata_json={"stage": "ARRIVED", "facility": "Shivpuri District Hospital", "role": "Triage Desk"}
        )
        ref_ram_ev5 = ReferralEvent(
            referral_id=referral_ramesh.id,
            from_status=ReferralStatus.ARRIVED, to_status=ReferralStatus.ACCEPTED,
            actor_id=user_ref.id,
            notes="Specialist Dr. Meena Singh accepted referral. Queueing for Chest PA Radiograph.",
            created_at=now - timedelta(minutes=45),
            metadata_json={"stage": "ACCEPTED", "facility": "Shivpuri District Hospital", "role": "Specialist"}
        )
        db.add_all([ref_ram_ev1, ref_ram_ev2, ref_ram_ev3, ref_ram_ev4, ref_ram_ev5])

        # Pre-seed sample X-Ray study for Ramesh Kumar
        study_ramesh = ChestXRayStudy(
            patient_id=p_ramesh.id,
            referral_id=referral_ramesh.id,
            encounter_id=enc_ramesh.id,
            study_date=now - timedelta(minutes=25),
            image_filename="00000013_005.png",
            model_name="MedFed Global DenseNet121",
            model_version="v1.3",
            predictions=[
                {"finding": "Infiltration", "confidence": 0.824, "percentage": 82.4, "is_positive": True},
                {"finding": "Effusion", "confidence": 0.382, "percentage": 38.2, "is_positive": False},
                {"finding": "Atelectasis", "confidence": 0.245, "percentage": 24.5, "is_positive": False},
                {"finding": "Nodule", "confidence": 0.178, "percentage": 17.8, "is_positive": False},
                {"finding": "No Finding", "confidence": 0.115, "percentage": 11.5, "is_positive": False},
            ],
            top_finding="Infiltration",
            top_confidence=0.824,
            review_status="pending",
        )
        db.add(study_ramesh)

        # ─── Care Gap ────────────────────────────────────────────
        # TB patient hasn't visited in 60 days
        prediction = RiskPrediction(
            patient_id=p_tb.id,
            prediction_type="tb_treatment_dropout",
            risk_probability=0.72,
            threshold=0.5,
            is_above_threshold=True,
            input_features={
                "days_since_last_visit": 60,
                "tb_treatment_month": 2,
                "missed_visits": 1,
            },
            explanation="DECISION SUPPORT ONLY. Risk factors: No visit in 60 days; TB treatment month 2 (intensive phase incomplete)",
        )
        db.add(prediction)
        db.flush()

        care_gap = CareGap(
            patient_id=p_tb.id,
            gap_type="tb_treatment_dropout",
            description="Patient has not attended TB DOTS follow-up for 60 days during intensive phase",
            severity=CareGapSeverity.HIGH,
            status=CareGapStatus.ALERTED,
            prediction_id=prediction.id,
            assigned_worker_id=user_asha.id,
        )
        db.add(care_gap)
        db.flush()

        task = HealthWorkerTask(
            worker_id=user_asha.id,
            patient_id=p_tb.id,
            care_gap_id=care_gap.id,
            task_type="outreach",
            title="Follow up with Mohan Lal — TB treatment dropout risk",
            description="Visit patient at home in Pohri village. Assess TB treatment adherence.",
            priority="high",
            due_date=now + timedelta(days=3),
        )
        db.add(task)

        # ─── Federated / MedFed ──────────────────────────────────
        model_v = ModelVersion(
            model_name="care_gap_predictor",
            version="0.1.0-dev",
            model_type="rule_based_deterministic",
            description="Deterministic care-gap prediction model (development). NOT a trained ML model.",
            is_active=True,
            is_simulation=True,
            metrics={"accuracy": "N/A - rule-based", "type": "deterministic"},
        )
        db.add(model_v)
        db.flush()

        node1 = FederatedNode(
            node_name="Shivpuri-Node-01",
            facility_id=phc.id,
            district_id=district.id,
            local_data_count=47,
            last_heartbeat=now - timedelta(minutes=30),
        )
        node2 = FederatedNode(
            node_name="Guna-Node-01",
            district_id=district2.id,
            local_data_count=32,
            last_heartbeat=now - timedelta(hours=2),
        )
        db.add_all([node1, node2])
        db.flush()

        fed_round = FederatedRound(
            round_number=1,
            model_version_id=model_v.id,
            participating_nodes=2,
            completed_nodes=2,
            is_simulation=True,
            started_at=now - timedelta(days=1),
            completed_at=now - timedelta(hours=12),
            aggregation_metrics={"note": "SIMULATION ONLY — not real federated training"},
        )
        db.add(fed_round)

        # ─── Public Health Events / Anomalies ────────────────────
        anomaly = Anomaly(
            anomaly_type="treatment_default_spike",
            description="TB treatment default rate in Shivpuri increased 15% above expected baseline",
            severity="medium",
            district_id=district.id,
            indicator_name="TB treatment default rate",
            expected_value="8%",
            observed_value="23%",
            confidence=0.78,
        )
        db.add(anomaly)

        ph_event = PublicHealthEvent(
            event_type="maternal_risk_cluster",
            title="Elevated pre-eclampsia indicators in Karera cluster",
            description="3 of 12 registered ANC patients show elevated BP and proteinuria in Karera sub-centre catchment area",
            severity="medium",
            district_id=district.id,
            facility_id=sub_centre.id,
        )
        db.add(ph_event)

        # ─── Devices ─────────────────────────────────────────────
        device = Device(
            user_id=user_asha.id,
            device_name="ASHA Sunita — Android Phone",
            device_type="android",
            last_sync_at=now - timedelta(hours=4),
        )
        db.add(device)

        db.commit()
        print("[OK] Seed data created successfully.")
        print("  Demo credentials:")
        print("    All users password: dori2024demo")
        print("    ASHA:     demo_asha")
        print("    ANM:      demo_anm")
        print("    MO:       demo_mo")
        print("    DHO:      demo_dho")
        print("    State:    demo_state")
        print("    Referral: demo_referral")
        print("    Admin:    demo_admin")
        print("    Patient:  demo_patient")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
