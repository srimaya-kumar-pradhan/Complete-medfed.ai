"""DORI Backend Services Package."""
from app.services.email_service import get_email_service, EmailService

__all__ = ["get_email_service", "EmailService"]
