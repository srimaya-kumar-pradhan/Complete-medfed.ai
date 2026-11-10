import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DoriWordmark } from '../../components/ui/DoriWordmark';
import { Button } from '../../components/ui/Button';
import { usePageTitle } from '../../utils/usePageTitle';
import type { UserRole } from '../../types';
import './LoginPage.css';

interface DemoAccount {
  username: string;
  role: UserRole;
  label: string;
  sub: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'demo_asha',
    role: 'asha',
    label: 'Sunita Devi',
    sub: 'Frontline ASHA Worker (Village Sub-Centre)',
    badge: 'Frontline',
  },
  {
    username: 'demo_mo',
    role: 'medical_officer',
    label: 'Dr. Rajesh Kumar',
    sub: 'Medical Officer / Clinician (PHC / OPD)',
    badge: 'Doctor AI',
  },
  {
    username: 'demo_referral',
    role: 'referral_facility',
    label: 'Dr. Meena Singh',
    sub: 'Chest Specialist (District Hospital)',
    badge: 'Specialist',
  },
  {
    username: 'demo_patient',
    role: 'patient',
    label: 'Lakshmi Bai',
    sub: 'Citizen / Pregnant Mother (14w ANC)',
    badge: 'Citizen',
  },
  {
    username: 'demo_dho',
    role: 'district_officer',
    label: 'Dr. Priya Verma',
    sub: 'District Health Officer (Epidemiology)',
    badge: 'District',
  },
  {
    username: 'demo_admin',
    role: 'system_admin',
    label: 'System Administrator',
    sub: 'Federated Learning & Model Governance',
    badge: 'Federated AI',
  },
];

export const LoginPage: React.FC = () => {
  usePageTitle('Sign In — DORI Care Infrastructure');
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('demo_asha');
  const [password, setPassword] = useState('dori2024demo');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getDashboardPath = (role: UserRole) => {
    switch (role) {
      case 'patient':
        return '/patient';
      case 'asha':
      case 'anm':
        return '/asha';
      case 'medical_officer':
        return '/mo';
      case 'district_officer':
        return '/dho';
      case 'referral_facility':
        return '/referral';
      case 'state_admin':
      case 'national_admin':
        return '/state';
      case 'system_admin':
        return '/admin';
      default:
        return '/';
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await login(username, password);
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(fromPath || getDashboardPath(response.user.role));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Login failed. Please check credentials or select a demo persona below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoPersona = async (demoUser: string, demoRole: UserRole) => {
    setUsername(demoUser);
    setPassword('dori2024demo');
    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(demoUser, 'dori2024demo');
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(fromPath || getDashboardPath(demoRole));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to authenticate demo account. Please verify backend server is active.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dori-login-page">
      <div className="login-wrapper">
        {/* Top Header Link */}
        <div className="login-top-nav">
          <Link to="/" className="back-home-link">
            ← Back to Public Overview
          </Link>
        </div>

        <div className="login-main-card">
          {/* Brand Header */}
          <div className="login-header">
            <DoriWordmark size="md" variant="primary" showTagline />
            <h1 className="login-title">Healthcare Provider & Citizen Portal</h1>
            <p className="login-subtitle">
              Sign in with your national healthcare ID or select an instant demo persona.
            </p>
          </div>

          {(errorMessage || authError) && (
            <div className="login-error-alert" role="alert">
              <span>{errorMessage || authError}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username / Health Worker ID
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="e.g. demo_asha, demo_mo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <span className="demo-pass-hint">Demo: dori2024demo</span>
              </div>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="login-submit-btn"
              isLoading={isLoading}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Instant Demo Personas Section */}
          <div className="demo-personas-section">
            <div className="demo-divider">
              <span>Or launch 1-click role simulation</span>
            </div>

            <div className="demo-accounts-grid">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  className={`demo-account-card ${username === acc.username ? 'selected' : ''}`}
                  onClick={() => handleSelectDemoPersona(acc.username, acc.role)}
                  disabled={isLoading}
                >
                  <div className="demo-account-info">
                    <div className="demo-account-name-row">
                      <span className="demo-account-label">{acc.label}</span>
                      <span className="demo-role-tag">{acc.badge}</span>
                    </div>
                    <span className="demo-account-sub">{acc.sub}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security / Compliance Footer */}
        <div className="login-security-footer">
          <span>256-Bit Cryptographic Care Passports</span>
          <span>•</span>
          <span>DPDP Act 2023 Compliant</span>
          <span>•</span>
          <span>MedFed Federated Privacy</span>
        </div>
      </div>
    </div>
  );
};
