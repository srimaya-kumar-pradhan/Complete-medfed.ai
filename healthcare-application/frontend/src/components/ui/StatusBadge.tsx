import React from 'react';
import { Icon, type IconName } from './Icon';
import './StatusBadge.css';

export type StatusVariant =
  | 'verified' | 'pending' | 'completed' | 'needs-review'
  | 'offline' | 'syncing' | 'failed' | 'expired'
  | 'revoked' | 'high-priority' | 'routine' | 'info'
  | 'urgent' | 'online' | 'active';

const STATUS_CONFIG: Record<StatusVariant, { icon: IconName; label: string }> = {
  verified:      { icon: 'check',   label: 'Verified' },
  pending:       { icon: 'clock',   label: 'Pending' },
  completed:     { icon: 'check',   label: 'Completed' },
  'needs-review':{ icon: 'alert',   label: 'Needs Review' },
  offline:       { icon: 'network', label: 'Offline' },
  syncing:       { icon: 'sync',    label: 'Syncing' },
  failed:        { icon: 'alert',   label: 'Failed' },
  expired:       { icon: 'clock',   label: 'Expired' },
  revoked:       { icon: 'close',   label: 'Revoked' },
  'high-priority':{ icon: 'alert',  label: 'High Priority' },
  routine:       { icon: 'check',   label: 'Routine' },
  info:          { icon: 'info',    label: 'Information' },
  urgent:        { icon: 'alert',   label: 'Urgent' },
  online:        { icon: 'check',   label: 'Online' },
  active:        { icon: 'check',   label: 'Active' },
};

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;
  const displayLabel = label || config.label;

  return (
    <span
      className={`status-badge status-${status} status-size-${size} ${className}`}
      role="status"
    >
      <Icon name={config.icon} size={size === 'sm' ? 12 : 14} />
      <span className="status-badge-label">{displayLabel}</span>
    </span>
  );
};
