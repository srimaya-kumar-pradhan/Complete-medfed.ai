"""Sync routes for offline-first architecture."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import SyncStatus
from app.models.sync import Device, SyncRecord
from app.models.user import User
from app.schemas import (
    SyncPullRequest,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
    SyncStatusResponse,
)

router = APIRouter()


@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    body: SyncPushRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Push offline records to server. Handles conflicts via versioning."""
    device = db.query(Device).filter(Device.id == body.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not registered")

    accepted = 0
    rejected = 0
    conflicts = []

    for record in body.records:
        entity_type = record.get("entity_type", "unknown")
        entity_id = record.get("entity_id")
        version = record.get("version", 1)

        # Check for existing sync record with same entity
        existing = (
            db.query(SyncRecord)
            .filter(
                SyncRecord.entity_type == entity_type,
                SyncRecord.entity_id == entity_id,
                SyncRecord.status == SyncStatus.SYNCED,
            )
            .first()
        )

        if existing and existing.version >= version:
            # Server has same or newer version — conflict
            conflicts.append({
                "entity_type": entity_type,
                "entity_id": entity_id,
                "server_version": existing.version,
                "client_version": version,
                "resolution": "server_wins",
            })
            rejected += 1
            continue

        # Accept record
        sync_rec = SyncRecord(
            device_id=device.id,
            user_id=current_user.id,
            sync_type="push",
            status=SyncStatus.SYNCED,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=record.get("data"),
            version=version,
            synced_at=datetime.now(UTC),
        )
        db.add(sync_rec)
        accepted += 1

    device.last_sync_at = datetime.now(UTC)
    db.commit()

    return SyncPushResponse(accepted=accepted, rejected=rejected, conflicts=conflicts)


@router.post("/pull", response_model=SyncPullResponse)
async def sync_pull(
    body: SyncPullRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pull records updated since last sync."""
    query = db.query(SyncRecord).filter(
        SyncRecord.status == SyncStatus.SYNCED,
    )

    if body.last_sync_at:
        query = query.filter(SyncRecord.synced_at > body.last_sync_at)

    if body.entity_types:
        query = query.filter(SyncRecord.entity_type.in_(body.entity_types))

    records = query.order_by(SyncRecord.synced_at).limit(100).all()

    return SyncPullResponse(
        records=[
            {
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "data": r.payload,
                "version": r.version,
                "synced_at": r.synced_at.isoformat() if r.synced_at else None,
            }
            for r in records
        ],
        sync_timestamp=datetime.now(UTC),
    )


@router.get("/status", response_model=SyncStatusResponse)
async def sync_status(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get sync status for a device."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not registered")

    pending = (
        db.query(SyncRecord)
        .filter(
            SyncRecord.device_id == device_id,
            SyncRecord.status == SyncStatus.PENDING,
        )
        .count()
    )

    return SyncStatusResponse(
        device_id=device.id,
        last_sync_at=device.last_sync_at,
        pending_count=pending,
        status="synced" if pending == 0 else "pending",
    )
