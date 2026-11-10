"""Central API router combining all domain routers."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    auth,
    patients,
    care_passports,
    consents,
    emergency,
    referrals,
    encounters,
    care_gaps,
    public_health,
    federated,
    sync,
    audit,
    notifications,
    admin,
    chest_xray,
    ml_inference,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(
    care_passports.router, prefix="/care-passports", tags=["Care Passport"]
)
api_router.include_router(consents.router, prefix="/consents", tags=["Consent"])
api_router.include_router(emergency.router, prefix="/emergency-access", tags=["Emergency"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["Referrals"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["Clinical"])
api_router.include_router(care_gaps.router, prefix="/care-gaps", tags=["Care Gaps"])
api_router.include_router(
    public_health.router, prefix="/public-health", tags=["Public Health"]
)
api_router.include_router(federated.router, prefix="/federated", tags=["Federated"])
api_router.include_router(sync.router, prefix="/sync", tags=["Sync"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["Audit"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["Notifications"]
)
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(chest_xray.router, prefix="/xray", tags=["Chest X-Ray AI"])
api_router.include_router(ml_inference.router, prefix="/ml", tags=["ML Inference"])
