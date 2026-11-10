"""Authentication routes: login, register, refresh, logout."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.audit import AuditLog
from app.models.enums import AuditAction, UserRole
from app.models.user import User
from app.schemas import (
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)

router = APIRouter()
settings = get_settings()


def _log_audit(
    db: Session,
    action: AuditAction,
    actor_id: uuid.UUID | None,
    resource_type: str,
    resource_id: str | None = None,
    result: str = "success",
    request: Request | None = None,
) -> None:
    """Create an audit log entry."""
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500] if request else None,
    )
    db.add(log)
    db.commit()


ALIAS_MAP = {
    "asha_priya": "demo_asha",
    "patient_sunita": "demo_patient",
    "mo_sharma": "demo_mo",
    "specialist_aiims": "demo_referral",
    "dho_verma": "demo_dho",
    "admin": "demo_admin",
    "state_director": "demo_state",
}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    lookup_name = ALIAS_MAP.get(body.username, body.username)
    user = db.query(User).filter(User.username == lookup_name).first()
    if not user and lookup_name != body.username:
        user = db.query(User).filter(User.username == body.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check lockout
    if user.is_locked and user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account temporarily locked due to too many failed attempts",
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.max_login_attempts:
            user.is_locked = True
            user.locked_until = datetime.now(UTC) + timedelta(
                minutes=settings.lockout_duration_minutes
            )
        db.commit()

        _log_audit(
            db, AuditAction.LOGIN_FAILED, None, "auth",
            resource_id=body.username, result="failed", request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Successful login
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    user.last_login = datetime.now(UTC)
    db.commit()

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    _log_audit(db, AuditAction.LOGIN, user.id, "auth", request=request)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (system admin or self-registration for patients)."""
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

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

    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(body: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(current_user)
