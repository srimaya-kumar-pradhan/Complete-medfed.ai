"""Admin routes: user management, facilities, system config."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import District, Facility, State, User
from app.schemas import FacilityCreate, FacilityResponse, UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: UserRole | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """List all users (system admin only)."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    offset = (page - 1) * page_size
    users = query.offset(offset).limit(page_size).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new user (system admin only)."""
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        role=body.role,
        language=body.language,
        assigned_district_id=body.assigned_district_id,
        assigned_state_id=body.assigned_state_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign facilities
    if body.facility_ids:
        facilities = db.query(Facility).filter(Facility.id.in_(body.facility_ids)).all()
        user.facilities = facilities
        db.commit()

    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update user details (system admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/facilities", response_model=list[FacilityResponse])
async def list_facilities(
    district_id: uuid.UUID | None = None,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.DISTRICT_OFFICER)),
    db: Session = Depends(get_db),
):
    """List facilities."""
    query = db.query(Facility)
    if district_id:
        query = query.filter(Facility.district_id == district_id)
    facilities = query.all()
    return [FacilityResponse.model_validate(f) for f in facilities]


@router.post("/facilities", response_model=FacilityResponse, status_code=201)
async def create_facility(
    body: FacilityCreate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new facility."""
    facility = Facility(
        name=body.name,
        facility_type=body.facility_type,
        code=body.code,
        address=body.address,
        latitude=body.latitude,
        longitude=body.longitude,
        phone=body.phone,
        district_id=body.district_id,
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return FacilityResponse.model_validate(facility)


@router.get("/districts")
async def list_districts(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.DISTRICT_OFFICER, UserRole.STATE_ADMIN)),
    db: Session = Depends(get_db),
):
    """List districts."""
    districts = db.query(District).all()
    return [
        {"id": str(d.id), "name": d.name, "code": d.code, "state_id": str(d.state_id)}
        for d in districts
    ]


@router.get("/states")
async def list_states(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.STATE_ADMIN)),
    db: Session = Depends(get_db),
):
    """List states."""
    states = db.query(State).all()
    return [{"id": str(s.id), "name": s.name, "code": s.code} for s in states]


@router.get("/storage-status")
async def get_storage_status(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.DISTRICT_OFFICER, UserRole.MEDICAL_OFFICER)),
    db: Session = Depends(get_db),
):
    """
    Technical indicator for local database and vector storage status.
    Demonstration and fast local retrieval metrics without exposing raw PII.
    """
    from app.services.vector_store import get_vector_store
    store = get_vector_store()
    return store.get_status(db)


@router.post("/reset-demo")
async def reset_demo_scenario(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    """Reset the SIH demonstration data and restore seeded patients and workflows."""
    from app.seed.seed_data import seed
    try:
        # Re-run seed
        seed()
        return {"status": "success", "message": "Demo data successfully reset to baseline scenario."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reset error: {exc}")

