/**
 * Protected route wrapper — redirects to login if not authenticated.
 * Enforces strict role-based access control (RBAC) and captures return URLs.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
        role="status"
        aria-label="Loading authentication session"
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #E2E8F0',
            borderTopColor: 'var(--dori-primary, #0284C7)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>
          Verifying security credentials...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role restriction is specified and user does not have permission
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
};
