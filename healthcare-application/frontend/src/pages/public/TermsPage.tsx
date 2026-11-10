import React from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { Navbar } from '../../components/layout/Navbar';
import { DecorativeBorder } from '../../components/ui/DecorativeBorder';
import { Badge } from '../../components/ui/Badge';
import './PolicyPages.css';

export const TermsPage: React.FC = () => {
  usePageTitle('Terms of Infrastructure Use');

  return (
    <div className="policy-page">
      <Navbar />
      <div className="container policy-container">
        <DecorativeBorder variant="card" motifSize={40} className="policy-card">
          <div className="policy-inner">
            <span className="policy-kicker">TERMS OF USE & DEPLOYMENT FRAMEWORK</span>
            <h1 className="policy-title">DORI Infrastructure Terms of Service</h1>
            <p className="policy-subtitle">
              Operational guidelines and clinical decision support boundaries for healthcare providers, administrators, and field workers.
            </p>

            <div className="policy-sections">
              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>1. Scope of Digital Infrastructure</h2>
                  <Badge variant="success">OPERATIONAL</Badge>
                </div>
                <p>
                  DORI provides continuity of care orchestration, referral tracking, cryptographic Care Passport credentials,
                  and edge decision support algorithms. It is designed to assist registered medical practitioners, ANMs, and ASHA workers.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>2. Clinical Decision Support Disclaimer</h2>
                  <Badge variant="warning">MANDATORY NOTICE</Badge>
                </div>
                <p>
                  DORI predictive care-gap indicators and risk scores (e.g., Antenatal Care dropout risk, TB default risk)
                  are assistive probabilistic tools intended solely for clinical triaging and outreach prioritization.
                  They do <strong>NOT</strong> constitute an automated medical diagnosis or replace licensed clinical judgment.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>3. Provider & Worker Responsibilities</h2>
                  <Badge variant="teal">STANDARDS</Badge>
                </div>
                <ul>
                  <li>Health workers must verify patient identity and respect selective consent flags before examining records.</li>
                  <li>Emergency break-glass access must only be utilized during acute life-threatening situations and will be audited.</li>
                  <li>Credential keys and authentication tokens must never be shared across individuals or unauthorized devices.</li>
                </ul>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>4. Service Level & Offline Resilience</h2>
                  <Badge variant="success">OFFLINE FIRST</Badge>
                </div>
                <p>
                  DORI is engineered for 0kbps offline operation. Frontline tablet data persists in local cryptographic storage and
                  synchronizes automatically upon reconnecting to network relays.
                </p>
              </section>

              <section className="policy-sec">
                <div className="sec-heading-row">
                  <h2>5. Administrative Contact</h2>
                  <Badge variant="teal">SUPPORT</Badge>
                </div>
                <p>
                  For institutional deployment inquiries or technical support, contact:
                </p>
                <div className="contact-box">
                  <p><strong>Support Email:</strong> <a href="mailto:support@dori.health" className="contact-link">support@dori.health</a></p>
                  <p><strong>District Escalation:</strong> <a href="tel:1800114477" className="contact-link">1800-11-4477</a></p>
                </div>
              </section>
            </div>
          </div>
        </DecorativeBorder>
      </div>
    </div>
  );
};
