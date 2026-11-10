import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import './UnauthorizedPage.css';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = (role?: string) => {
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
        return '/login';
    }
  };

  return (
    <div className="dori-unauthorized-page">
      <Card variant="bordered" padding="lg" className="unauthorized-card">
        <div className="unauthorized-icon-wrapper">
          <Icon name="lock" size={36} color="var(--dori-crimson)" />
        </div>

        <h1 className="unauthorized-title">Access Restricted (403)</h1>

        <p className="unauthorized-message">
          Your current account role (<strong>{user?.role || 'Guest'}</strong>) does not have authorization
          to access this clinical module or administrative portal.
        </p>

        <div className="unauthorized-meta-box">
          <div className="meta-row">
            <span className="meta-label">Signed in as:</span>
            <span className="meta-value">{user?.full_name || user?.username || 'Authenticated User'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Assigned Role:</span>
            <span className="meta-value">{user?.role}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Security Policy:</span>
            <span className="meta-value">Role-Based Access Control (RBAC) Enforced</span>
          </div>
        </div>

        <div className="unauthorized-actions">
          <Button
            variant="primary"
            onClick={() => navigate(getDashboardPath(user?.role))}
            icon={<Icon name="arrow-right" size={16} />}
          >
            Return to My Portal
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Switch Account
          </Button>
        </div>
      </Card>
    </div>
  );
};
