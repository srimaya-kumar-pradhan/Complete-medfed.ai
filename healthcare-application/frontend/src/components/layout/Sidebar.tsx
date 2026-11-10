import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Icon, type IconName } from '../ui/Icon';
import type { UserRole } from '../../types';
import './Sidebar.css';

export interface NavItemConfig {
  id: string;
  label: string;
  path?: string;
  icon: IconName;
  action?: 'register_patient' | 'open_notifications' | 'open_passport';
  badge?: string;
  badgeVariant?: 'gold' | 'crimson' | 'emerald' | 'subtle';
  isDoctorOnly?: boolean;
  isAdminOnly?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenRegisterModal: () => void;
  onOpenNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onCloseMobile,
  onOpenRegisterModal,
  onOpenNotifications,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Strict role menu configurations
  const getNavItemsForRole = (role?: UserRole): NavItemConfig[] => {
    switch (role) {
      case 'patient':
        return [
          { id: 'pat-dash', label: 'Dashboard', path: '/patient', icon: 'home' },
          { id: 'pat-passport', label: 'My Care Passport', path: '/patient', icon: 'passport' },
          { id: 'pat-referrals', label: 'My Referrals', path: '/patient/referrals', icon: 'hospital' },
          { id: 'pat-followups', label: 'My Follow-ups', path: '/patient/timeline', icon: 'timeline' },
          { id: 'pat-notifs', label: 'Notifications', icon: 'alert', action: 'open_notifications' },
          { id: 'pat-consent', label: 'Privacy & Consent', path: '/patient/consents', icon: 'lock' },
        ];

      case 'asha':
      case 'anm':
        return [
          { id: 'asha-dash', label: 'Dashboard', path: '/asha', icon: 'home' },
          { id: 'asha-patients', label: 'My Patients', path: '/asha/patients', icon: 'patient' },
          { id: 'asha-reg', label: 'Register Patient', icon: 'patient', action: 'register_patient', badge: 'LIVE', badgeVariant: 'emerald' },
          { id: 'asha-passport', label: 'Care Passport', path: '/asha', icon: 'passport' },
          { id: 'asha-visits', label: 'Offline Visits', path: '/asha/sync', icon: 'sync' },
          { id: 'asha-gaps', label: 'Care Gaps', path: '/asha/alerts', icon: 'alert', badge: '3', badgeVariant: 'crimson' },
          { id: 'asha-referrals', label: 'Referrals', path: '/asha/referrals', icon: 'hospital' },
          { id: 'asha-followups', label: 'Follow-ups', path: '/asha/patients', icon: 'timeline' },
          { id: 'asha-notifs', label: 'Notifications', icon: 'alert', action: 'open_notifications' },
        ];

      case 'medical_officer':
        return [
          { id: 'mo-dash', label: 'Dashboard', path: '/mo', icon: 'home' },
          { id: 'mo-registry', label: 'Patient Registry', path: '/mo/encounters', icon: 'patient' },
          { id: 'mo-reg-live', label: 'Register Patient', icon: 'patient', action: 'register_patient', badge: 'NEW', badgeVariant: 'gold' },
          { id: 'mo-encounters', label: 'Clinical Encounters', path: '/mo/encounters', icon: 'stethoscope' },
          { id: 'mo-ref-queue', label: 'Referral Queue', path: '/mo/referrals', icon: 'hospital' },
          { id: 'mo-passport', label: 'Care Passport', path: '/mo', icon: 'passport' },
          {
            id: 'mo-xray',
            label: 'Chest X-Ray AI',
            path: '/mo/chest-xray',
            icon: 'xray',
            badge: 'MedFed',
            badgeVariant: 'gold',
            isDoctorOnly: true,
          },
          { id: 'mo-ai-insights', label: 'AI Insights', path: '/mo/predictions', icon: 'brain', isDoctorOnly: true },
          { id: 'mo-followups', label: 'Follow-ups', path: '/mo/encounters', icon: 'timeline' },
          { id: 'mo-notifs', label: 'Notifications', icon: 'alert', action: 'open_notifications' },
        ];

      case 'district_officer':
        return [
          { id: 'dho-dash', label: 'Dashboard', path: '/dho', icon: 'home' },
          { id: 'dho-overview', label: 'District Overview', path: '/dho', icon: 'district' },
          { id: 'dho-ref-network', label: 'Referral Network', path: '/dho/referrals', icon: 'network' },
          { id: 'dho-care-gaps', label: 'Care-Gap Analytics', path: '/dho/heatmaps', icon: 'chart' },
          { id: 'dho-trends', label: 'Disease Trends', path: '/dho/trends', icon: 'pulse' },
          { id: 'dho-perf', label: 'Facility Performance', path: '/dho/facilities', icon: 'hospital' },
          { id: 'dho-intel', label: 'Public Health Intelligence', path: '/dho/anomalies', icon: 'brain' },
          { id: 'dho-notifs', label: 'Notifications', icon: 'alert', action: 'open_notifications' },
        ];

      case 'system_admin':
        return [
          { id: 'adm-overview', label: 'System Overview', path: '/admin', icon: 'home' },
          { id: 'adm-users', label: 'Users', path: '/admin/users', icon: 'user' },
          { id: 'adm-facilities', label: 'Facilities', path: '/admin/facilities', icon: 'hospital' },
          { id: 'adm-patients', label: 'Patient Registry', path: '/admin/users', icon: 'patient' },
          { id: 'adm-ref-network', label: 'Referral Network', path: '/dho/referrals', icon: 'network' },
          {
            id: 'adm-fed-learning',
            label: 'Federated Learning',
            path: '/admin/federated-learning',
            icon: 'brain',
            badge: 'Prime-DP',
            badgeVariant: 'gold',
            isAdminOnly: true,
          },
          {
            id: 'adm-model-reg',
            label: 'Model Registry',
            path: '/admin/federated-learning',
            icon: 'chart',
            isAdminOnly: true,
          },
          {
            id: 'adm-nodes',
            label: 'Hospital Nodes',
            path: '/admin/federated-learning',
            icon: 'network',
            isAdminOnly: true,
          },
          { id: 'adm-sec', label: 'Security', path: '/admin/audit', icon: 'lock' },
          { id: 'adm-audit', label: 'Audit Logs', path: '/admin/audit', icon: 'lock' },
          { id: 'adm-health', label: 'System Health', path: '/admin', icon: 'pulse' },
        ];

      case 'referral_facility':
        return [
          { id: 'ref-dash', label: 'Dashboard', path: '/referral', icon: 'home' },
          { id: 'ref-inbound', label: 'Inbound Referrals', path: '/referral', icon: 'hospital' },
          {
            id: 'ref-xray',
            label: 'Chest X-Ray AI',
            path: '/mo/chest-xray',
            icon: 'xray',
            badge: 'MedFed',
            badgeVariant: 'gold',
            isDoctorOnly: true,
          },
          { id: 'ref-completed', label: 'Completed Care', path: '/referral', icon: 'check' },
          { id: 'ref-notifs', label: 'Notifications', icon: 'alert', action: 'open_notifications' },
        ];

      default:
        return [
          { id: 'default-home', label: 'Overview', path: '/', icon: 'home' },
          { id: 'default-login', label: 'Sign In', path: '/login', icon: 'lock' },
        ];
    }
  };

  const navItems = getNavItemsForRole(user?.role);

  const handleItemClick = (item: NavItemConfig) => {
    if (item.action === 'register_patient') {
      onOpenRegisterModal();
    } else if (item.action === 'open_notifications') {
      onOpenNotifications();
    }
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`dori-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isOpen ? 'mobile-open' : ''
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Current Active Role Badge */}
        {!isCollapsed && user && (
          <div className="sidebar-role-indicator">
            <span className="role-lbl">PORTAL CONSOLE</span>
            <span className="role-badge-text">
              {user.role.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        )}

        {/* Navigation Item List */}
        <nav className="sidebar-nav" aria-label="Main menu">
          <ul className="sidebar-menu-list">
            {navItems.map((item) => {
              const isActive =
                item.path &&
                (location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path)));

              const content = (
                <>
                  <span className="menu-icon-wrap" title={item.label}>
                    <Icon name={item.icon} size={18} />
                  </span>

                  {!isCollapsed && (
                    <span className="menu-item-text">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className={`menu-badge badge-${item.badgeVariant || 'gold'}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              );

              return (
                <li key={item.id} className="sidebar-menu-item">
                  {item.path ? (
                    <Link
                      to={item.path}
                      className={`menu-item-link ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="menu-item-btn"
                      onClick={() => handleItemClick(item)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: User Profile & Quick Logout */}
        <div className="sidebar-footer">
          {user && !isCollapsed ? (
            <div className="sidebar-user-card">
              <div className="user-avatar-circle">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-text-meta">
                <span className="user-card-name" title={user.full_name}>
                  {user.full_name}
                </span>
                <span className="user-card-role">
                  {user.role.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                className="user-logout-btn"
                onClick={logout}
                title="Log out of session"
                aria-label="Log out"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : user && isCollapsed ? (
            <button
              className="user-avatar-collapsed"
              onClick={logout}
              title={`Logged in as ${user.full_name}. Click to log out.`}
            >
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
};
