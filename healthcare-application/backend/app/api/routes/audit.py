"""Audit log routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.enums import AuditAction, UserRole
from app.models.user import User
from app.schemas import AuditLogResponse

router = APIRouter()


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    action: AuditAction | None = None,
    resource_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(
        require_roles(UserRole.SYSTEM_ADMIN, UserRole.DISTRICT_OFFICER)
    ),
    db: Session = Depends(get_db),
):
    """List audit logs (admin and district officers only)."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    offset = (page - 1) * page_size
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()
    return [AuditLogResponse.model_validate(log) for log in logs]
