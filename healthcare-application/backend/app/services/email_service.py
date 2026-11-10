"""DORI Backend SMTP Email Service
Sends transactional notifications for Care Gaps, Referrals, Follow-ups, and Patient Registration.
Credentials are kept strictly server-side.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Optional

from app.core.config import get_settings

logger = logging.getLogger("dori.email")

EMAIL_TEMPLATES = {
    "CARE_GAP_ALERT": {
        "subject": "DORI Health Alert: Care Gap Identified for {patient_name}",
        "template": """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: #003366; padding: 24px; color: #ffffff; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 20px; letter-spacing: 0.5px; }}
    .header p {{ margin: 6px 0 0 0; font-size: 13px; color: #cbd5e0; }}
    .content {{ padding: 28px; color: #2d3748; line-height: 1.6; }}
    .alert-banner {{ background: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }}
    .details-table td.label {{ color: #718096; font-weight: 500; width: 35%; }}
    .details-table td.value {{ color: #1a202c; font-weight: 600; }}
    .footer {{ background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DORI CONTINUITY OF CARE</h1>
      <p>National Public Health AI Decision Support</p>
    </div>
    <div class="content">
      <div class="alert-banner">
        <strong>Attention: Clinical Care-Gap Flagged</strong>
      </div>
      <p>Dear {recipient_name},</p>
      <p>A priority healthcare intervention gap has been identified in the DORI care continuum for patient <strong>{patient_name}</strong> (ID: {patient_id}).</p>
      
      <table class="details-table">
        <tr><td class="label">Patient Name</td><td class="value">{patient_name}</td></tr>
        <tr><td class="label">Patient ID</td><td class="value">{patient_id}</td></tr>
        <tr><td class="label">Category</td><td class="value">{gap_category}</td></tr>
        <tr><td class="label">Facility</td><td class="value">{facility_name}</td></tr>
        <tr><td class="label">Due Date</td><td class="value">{due_date}</td></tr>
        <tr><td class="label">Priority Level</td><td class="value">{priority}</td></tr>
      </table>

      <p><strong>Action Required:</strong> {action_required}</p>
      <p>Please log in to the DORI clinical portal to view the care passport and complete the encounter.</p>
    </div>
    <div class="footer">
      This is an automated clinical notification from the DORI Healthcare Network.<br>
      Please contact your local PHC/ASHA worker if immediate assistance is required.
    </div>
  </div>
</body>
</html>
"""
    },
    "REFERRAL_UPDATE": {
        "subject": "DORI Care Pathway: Referral Status Updated for {patient_name}",
        "template": """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: #003366; padding: 24px; color: #ffffff; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 20px; }}
    .content {{ padding: 28px; color: #2d3748; line-height: 1.6; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }}
    .details-table td.label {{ color: #718096; width: 35%; }}
    .details-table td.value {{ color: #1a202c; font-weight: 600; }}
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; background: #ebf8ff; color: #2b6cb0; font-weight: 600; }}
    .footer {{ background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DORI REFERRAL NETWORK</h1>
      <p>Care Continuity Tracker</p>
    </div>
    <div class="content">
      <p>Dear {recipient_name},</p>
      <p>The status of clinical referral <strong>#{referral_id}</strong> has been updated in the DORI referral continuum.</p>
      
      <table class="details-table">
        <tr><td class="label">Patient Name</td><td class="value">{patient_name}</td></tr>
        <tr><td class="label">From Facility</td><td class="value">{from_facility}</td></tr>
        <tr><td class="label">Target Facility</td><td class="value">{to_facility}</td></tr>
        <tr><td class="label">Current Stage</td><td class="value"><span class="badge">{status}</span></td></tr>
        <tr><td class="label">Specialty</td><td class="value">{specialty}</td></tr>
      </table>

      <p><strong>Clinical Notes:</strong> {clinical_notes}</p>
    </div>
    <div class="footer">
      Automated update from DORI Referral System • Confidential Health Communication
    </div>
  </div>
</body>
</html>
"""
    },
    "FOLLOW_UP_REMINDER": {
        "subject": "DORI Care Alert: Follow-up Scheduled for {patient_name}",
        "template": """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: #1b4d3e; padding: 24px; color: #ffffff; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 20px; }}
    .content {{ padding: 28px; color: #2d3748; line-height: 1.6; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }}
    .footer {{ background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DORI CARE CONTINUITY ALERT</h1>
      <p>Follow-up & Monitoring Notification</p>
    </div>
    <div class="content">
      <p>Dear {recipient_name},</p>
      <p>This is a notification that a clinical follow-up is scheduled for <strong>{patient_name}</strong>.</p>
      
      <table class="details-table">
        <tr><td><strong>Patient:</strong></td><td>{patient_name} (ID: {patient_id})</td></tr>
        <tr><td><strong>Facility:</strong></td><td>{facility_name}</td></tr>
        <tr><td><strong>Scheduled Date:</strong></td><td>{scheduled_date}</td></tr>
        <tr><td><strong>Reason:</strong></td><td>{reason}</td></tr>
        <tr><td><strong>Treating Clinician:</strong></td><td>{doctor_name}</td></tr>
      </table>

      <p>Please ensure the patient visits the clinic or is contacted by their designated ASHA worker.</p>
    </div>
    <div class="footer">
      DORI Healthcare Decision Support System • Keep this reference handy
    </div>
  </div>
</body>
</html>
"""
    },
    "PATIENT_REGISTRATION_CONFIRMATION": {
        "subject": "DORI: Patient Registration Confirmed for {patient_name}",
        "template": """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: #003366; padding: 24px; color: #ffffff; text-align: center; }}
    .content {{ padding: 28px; color: #2d3748; line-height: 1.6; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }}
    .footer {{ background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>PATIENT CARE PASSPORT INITIATED</h1>
      <p>DORI Health Record System</p>
    </div>
    <div class="content">
      <p>Dear {recipient_name},</p>
      <p>Patient <strong>{patient_name}</strong> has been successfully registered into the DORI Continuity of Care platform.</p>
      
      <table class="details-table">
        <tr><td><strong>Patient ID:</strong></td><td>{patient_id}</td></tr>
        <tr><td><strong>Age / Gender:</strong></td><td>{age} / {gender}</td></tr>
        <tr><td><strong>Village:</strong></td><td>{village}</td></tr>
        <tr><td><strong>District:</strong></td><td>{district}</td></tr>
        <tr><td><strong>Registered Facility:</strong></td><td>{facility_name}</td></tr>
      </table>

      <p>A digital Care Passport has been created with local cryptographic storage and offline-first synchronization enabled.</p>
    </div>
    <div class="footer">
      DORI Public Health Network • Official Communication
    </div>
  </div>
</body>
</html>
"""
    }
}


class EmailService:
    """Manages transactional email delivery via standard SMTP."""

    def __init__(self):
        self.settings = get_settings()

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None
    ) -> dict[str, Any]:
        """Send an HTML email via SMTP server."""
        if not to_email:
            return {"success": False, "error": "Recipient email address is required"}

        sender = from_email or self.settings.smtp_from or self.settings.smtp_user or "sihdori7@gmail.com"
        host = self.settings.smtp_host or "smtp.gmail.com"
        port = int(self.settings.smtp_port or 587)
        user = self.settings.smtp_user or self.settings.email or "sihdori7@gmail.com"
        password = self.settings.smtp_password or self.settings.app_psw or "zmay dnzr ktgx mrab"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"DORI Healthcare Alerts <{sender}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        try:
            logger.info("Connecting to SMTP server %s:%s for %s", host, port, to_email)
            if port == 465 or self.settings.smtp_secure:
                server = smtplib.SMTP_SSL(host, port, timeout=10)
            else:
                server = smtplib.SMTP(host, port, timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()

            if user and password:
                server.login(user, password)

            server.sendmail(sender, [to_email], msg.as_string())
            server.quit()
            logger.info("Email successfully delivered to %s", to_email)
            return {"success": True, "recipient": to_email, "subject": subject}
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_email, exc)
            return {
                "success": False,
                "error": str(exc),
                "recipient": to_email,
                "note": "Email sending failed; credentials or network connection issue"
            }

    def send_template_email(
        self,
        template_name: str,
        to_email: str,
        context: dict[str, Any]
    ) -> dict[str, Any]:
        """Format a template and send to recipient."""
        template_data = EMAIL_TEMPLATES.get(template_name)
        if not template_data:
            return {"success": False, "error": f"Unknown template: {template_name}"}

        try:
            subject = template_data["subject"].format(**context)
            html_content = template_data["template"].format(**context)
            return self.send_email(to_email=to_email, subject=subject, html_content=html_content)
        except KeyError as e:
            logger.error("Missing template variable: %s", e)
            return {"success": False, "error": f"Missing template parameter: {e}"}


_email_service_instance: Optional[EmailService] = None


def get_email_service() -> EmailService:
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = EmailService()
    return _email_service_instance
