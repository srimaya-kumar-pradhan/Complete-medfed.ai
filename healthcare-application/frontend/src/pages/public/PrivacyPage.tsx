import React from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { Navbar } from '../../components/layout/Navbar';
import { DecorativeBorder } from '../../components/ui/DecorativeBorder';
import { Badge } from '../../components/ui/Badge';
import './PolicyPages.css';

export const PrivacyPage: React.FC = () => {
  usePageTitle('Privacy Architecture & DPDP Policy');

  return (
    <div className="policy-page">
      <Navbar />
      <div className="container policy-container">
        <DecorativeBorder variant="card" motifSize={40} className="policy-card">
          <div className="policy-inner">
            <span className="policy-kicker">DATA PROTECTION & PRIVACY ARCHITECTURE</span>
            <h1 className="policy-title">DORI Privacy Policy & Data Governance</h1>
            <p className="policy-subtitle">
              Compliant with the Digital Personal Data Protection (DPDP) Act 2023 and Ayushman Bharat Digital Mission (ABDM) guidelines.
            </p>

            <div className="policy-sections">
              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>1. Core Architectural Privacy Principles</h2>
                  <Badge variant="success">IMPLEMENTED</Badge>
                </div>
                <p>
                  DORI treats patient data sovereignty as a primary security constraint. Unlike centralized health platforms,
                  DORI does not construct monolithic longitudinal profiles in the cloud. Data is minimized and bound to cryptographic Care Passports.
                </p>
                <ul>
                  <li><strong>Data Minimization:</strong> Only essential clinical indicators required for immediate triage are stored on frontline edge devices.</li>
                  <li><strong>Pseudonymous Identifiers (PID):</strong> All public and inter-tier records reference rotating random PIDs instead of Aadhaar or raw biometric numbers.</li>
                  <li><strong>Purpose-Bound Consent:</strong> Patients specify recipient doctor and purpose (Treatment, Referral, Emergency) before access is granted.</li>
                </ul>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>2. Cryptographic Offline Storage & Verification</h2>
                  <Badge variant="success">IMPLEMENTED</Badge>
                </div>
                <p>
                  Frontline health tablets store data in encrypted local IndexedDB storage. Care Passports are digitally signed
                  using Ed25519 asymmetric cryptography. When medical officers scan QR codes offline, signatures are verified
                  locally without transmitting queries across the public internet.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>3. Emergency Break-Glass Governance</h2>
                  <Badge variant="success">IMPLEMENTED</Badge>
                </div>
                <p>
                  In acute trauma or maternal emergencies where patient consent cannot be actively obtained, certified clinical providers
                  may invoke the Emergency Break-Glass protocol. This unlocks critical vitals (blood group, severe allergies) while
                  automatically writing an immutable, non-repudiable entry to the system audit trail.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>4. Federated AI & Non-Disclosure</h2>
                  <Badge variant="success">IMPLEMENTED</Badge>
                </div>
                <p>
                  Predictive care-gap and disease anomaly detection models are trained across decentralized facility nodes using
                  differential-privacy (Laplace noise injection, ε=0.5). Raw patient medical touchpoints never leave local facility boundaries.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>5. Contact Data Protection Officer</h2>
                  <Badge variant="teal">CONFIGURATION</Badge>
                </div>
                <p>
                  For grievance redressal, consent audit inquiries, or data deletion requests under the DPDP Act 2023, contact our designated Data Protection Officer:
                </p>
                <div className="contact-box">
                  <p><strong>Email:</strong> <a href="mailto:privacy@dori.health" className="contact-link">privacy@dori.health</a></p>
                  <p><strong>Toll-Free Helpline:</strong> <a href="tel:1800114477" className="contact-link">1800-11-4477 (National Health Tele-Desk)</a></p>
                </div>
              </section>
            </div>
          </div>
        </DecorativeBorder>
      </div>
    </div>
  );
};
