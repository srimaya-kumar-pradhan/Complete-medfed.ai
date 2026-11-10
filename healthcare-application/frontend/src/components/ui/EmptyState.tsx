import React from 'react';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'info',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`dori-empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        <Icon name={icon} size={36} color="var(--color-teal)" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <div className="empty-state-action">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
