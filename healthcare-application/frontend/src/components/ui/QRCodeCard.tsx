import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DecorativeBorder } from './DecorativeBorder';
import { Badge } from './Badge';
import './QRCodeCard.css';

interface QRCodeCardProps {
  pseudonymousId: string;
  patientName?: string;
  qrPayload: string;
  bloodGroup?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  issuedAt?: string;
  version?: number;
  status?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  pseudonymousId,
  patientName,
  qrPayload,
  bloodGroup,
  allergies,
  conditions,
  issuedAt,
  version = 1,
  status = 'ACTIVE',
}) => {
  return (
    <DecorativeBorder variant="gold" className="dori-qr-card-container" motifSize={36}>
      <div className="dori-qr-card">
        <div className="qr-card-header">
          <div>
            <span className="qr-card-tag">DORI CARE PASSPORT</span>
            <h3 className="qr-patient-name">{patientName || 'Verified Holder'}</h3>
            <div className="qr-pseudo-id">
              <code>{pseudonymousId}</code>
            </div>
          </div>
          <Badge variant="success" dot>
            {status}
          </Badge>
        </div>

        <div className="qr-code-wrapper">
          <div className="qr-inner-frame">
            <QRCodeSVG
              value={qrPayload || pseudonymousId}
              size={180}
              level="H"
              includeMargin={true}
              fgColor="#1b2a4a"
            />
          </div>
          <div className="qr-scan-hint">
            Scan via DORI Frontline App or ABDM QR Reader for Offline Verification
          </div>
        </div>

        <div className="qr-critical-summary">
          <div className="critical-item">
            <span className="critical-label">Blood Group</span>
            <span className="critical-val">{bloodGroup || 'Not Recorded'}</span>
          </div>
          <div className="critical-item">
            <span className="critical-label">Allergies</span>
            <span className="critical-val">{allergies || 'None Known'}</span>
          </div>
          <div className="critical-item">
            <span className="critical-label">Active Conditions</span>
            <span className="critical-val">{conditions || 'None'}</span>
          </div>
        </div>

        <div className="qr-card-footer">
          <span>v{version}.0 Cryptographically Signed</span>
          {issuedAt && <span>Issued: {new Date(issuedAt).toLocaleDateString()}</span>}
        </div>
      </div>
    </DecorativeBorder>
  );
};
