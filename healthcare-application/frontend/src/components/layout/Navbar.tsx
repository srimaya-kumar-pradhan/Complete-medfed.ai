import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DoriWordmark } from '../ui/DoriWordmark';
import { Button } from '../ui/Button';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleDashboardPath = (role?: string) => {
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
      case 'system_admin':
        return '/admin';
      default:
        return '/';
    }
  };

  return (
    <header className="dori-navbar">
      <div className="navbar-container">
        {/* Project Name with Logo */}
        <Link to="/" className="navbar-brand" aria-label="DORI Home">
          <DoriWordmark size="sm" showTagline={false} variant="primary" />
        </Link>

        {/* Action: Sign In if logged out, User info + Logout if logged in */}
        <div className="navbar-actions">
          {isAuthenticated && user ? (
            <div className="navbar-user-strip">
              <Link to={getRoleDashboardPath(user.role)} className="navbar-role-link">
                <span className="navbar-user-name">{user.full_name || 'User'}</span>
                <span className="navbar-role-pill">{user.role?.replace('_', ' ').toUpperCase()}</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="navbar-logout-btn"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="navbar-auth-btn">
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
