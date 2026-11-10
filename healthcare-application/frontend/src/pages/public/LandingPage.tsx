import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePageTitle } from '../../utils/usePageTitle';
import { Navbar } from '../../components/layout/Navbar';
import { DoriWordmark } from '../../components/ui/DoriWordmark';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  usePageTitle('Predictive Continuity of Care Infrastructure — DORI');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemoLaunch = async (username: string, path: string) => {
    try {
      await login(username, 'dori2024demo');
      navigate(path);
    } catch {
      navigate(path);
    }
  };

  return (
    <div className="dori-landing-page">
      <Navbar />

      {/* ─── HERO SECTION ─── */}
      <section className="landing-hero-section">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-left-col">
              <h1 className="hero-main-title">
                Predictive Continuity of Care & Decentralized Health Intelligence
              </h1>

              <p className="hero-main-desc">
                Connecting rural clinics to district hospitals with verifiable Care Passports, closed-loop referrals, and privacy-first clinical AI.
              </p>

              {/* Persona Quick Launch */}
              <div className="hero-roles-bar">
                <span className="roles-bar-label">Direct Portal Access:</span>
                <div className="roles-pill-grid">
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_asha', '/asha')}
                  >
                    ASHA Worker
                  </button>
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_mo', '/mo')}
                  >
                    Medical Officer
                  </button>
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_mo', '/doctor/chest-xray')}
                  >
                    AI PACS Workstation
                  </button>
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_dho', '/dho')}
                  >
                    District Health Officer
                  </button>
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_patient', '/patient')}
                  >
                    Citizen Care Passport
                  </button>
                  <button
                    className="role-pill-btn"
                    onClick={() => handleQuickDemoLaunch('demo_admin', '/admin/federated-learning')}
                  >
                    Federated AI Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Doctor Illustration */}
            <div className="hero-right-col">
              <div className="hero-illustration-container">
                <img
                  src="/hand-drawn-cartoon-doctor-stethoscope-waving-hello-male-369721436.webp"
                  alt="DORI Healthcare Continuity Doctor"
                  className="hero-doctor-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: 4 CORE CLINICAL PILLARS ─── */}
      <section className="landing-section bg-white" id="architecture">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">Enterprise Architecture</span>
            <h2 className="section-heading">Four Pillars of Rural Care Continuity</h2>
            <p className="section-subheading">
              Purpose-built for offline village outreach, multi-tier hospital handoffs, and privacy-first clinical decision support.
            </p>
          </div>

          <div className="pillars-grid">
            {/* Pillar 1 */}
            <Card variant="bordered" padding="lg" className="pillar-card">
              <h3 className="pillar-title">1. Decentralized Care Passport</h3>
              <p className="pillar-desc">
                Cryptographically signed offline QR credentials encoding emergency vitals and continuity metadata without leaking unconsented medical records.
              </p>
              <ul className="pillar-feature-list">
                <li>DPDP Act 2023 Digital Consent</li>
                <li>Offline validation without internet connectivity</li>
                <li>Selective disclosure for specialist review</li>
              </ul>
            </Card>

            {/* Pillar 2 */}
            <Card variant="bordered" padding="lg" className="pillar-card">
              <h3 className="pillar-title">2. 12-Stage Visual Referral Tracker</h3>
              <p className="pillar-desc">
                Real-time milestone tracking following patient journeys from village dispatch and transit to district hospital admission and closed-loop follow-up.
              </p>
              <ul className="pillar-feature-list">
                <li>Eliminates rural referral drop-offs</li>
                <li>Visual inter-facility routing</li>
                <li>Automated counter-referral guidance</li>
              </ul>
            </Card>

            {/* Pillar 3 */}
            <Card variant="bordered" padding="lg" className="pillar-card">
              <h3 className="pillar-title">3. Algorithmic Care-Gap Engine</h3>
              <p className="pillar-desc">
                Predictive models that analyze visit intervals to flag high-risk pregnant mothers overdue for ANC checkups and TB patients missing medication refills.
              </p>
              <ul className="pillar-feature-list">
                <li>Automated ASHA home outreach tasks</li>
                <li>Clinical risk stratification (Critical / High)</li>
                <li>Real-time alert dispatch</li>
              </ul>
            </Card>

            {/* Pillar 4 */}
            <Card variant="bordered" padding="lg" className="pillar-card">
              <h3 className="pillar-title">4. MedFed.ai Chest X-Ray AI</h3>
              <p className="pillar-desc">
                DenseNet121 multi-label pulmonary classification with Grad-CAM heatmaps. Patient privacy preserved via decentralized Fed-FibAvg aggregation.
              </p>
              <ul className="pillar-feature-list">
                <li>Grad-CAM anatomical explainability</li>
                <li>Doctor Agree / Modify / Reject workflow</li>
                <li>Raw patient radiographs never leave local nodes</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: COMPLIANCE ─── */}
      <section className="landing-section bg-light" id="compliance">
        <div className="container">
          <div className="compliance-banner-card">
            <div className="compliance-left">
              <span className="compliance-tag">Sovereign Data Governance</span>
              <h3 className="compliance-title">Compliant with National Digital Health Standards</h3>
              <p className="compliance-desc">
                DORI enforces data minimization, pseudonymous identifier generation, and strict role-based access control. All AI models operate strictly as clinical decision support.
              </p>
              <div className="compliance-badges-row">
                <span className="compliance-pill">DPDP Act 2023</span>
                <span className="compliance-pill">ABDM / ABHA Ready</span>
                <span className="compliance-pill">Prime-DP Differential Privacy</span>
                <span className="compliance-pill">Offline-First IndexedDB</span>
              </div>
            </div>
            <div className="compliance-right">
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Launch Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="container footer-container">
          <div className="footer-brand-col">
            <DoriWordmark size="sm" variant="dark" />
            <p className="footer-copyright">
              © 2026 DORI — Predictive Continuity of Care Infrastructure.
              <br />
              Smart India Hackathon Initiative • Ministry of Health & Family Welfare.
            </p>
          </div>
          <div className="footer-links-col">
            <Link to="/login" className="footer-link">Sign In to Portals</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
