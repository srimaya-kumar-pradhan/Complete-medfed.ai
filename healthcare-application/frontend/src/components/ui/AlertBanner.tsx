import React from 'react';
import { Icon, type IconName } from './Icon';
import './AlertBanner.css';

export interface AlertBannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success' | 'neutral';
  title?: string;
  children: React.ReactNode;
  icon?: IconName;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  onDismiss,
  action,
  className = '',
}) => {
  const getDefaultIcon = (v: typeof variant): IconName => {
    switch (v) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert';
      case 'success':
        return 'check';
      case 'info':
      default:
        return 'info';
    }
  };

  const iconName = icon || getDefaultIcon(variant);

  return (
    <div className={`dori-alert-banner dori-alert-banner--${variant} ${className}`} role="alert">
      <div className="dori-alert-banner__icon">
        <Icon name={iconName} size={20} />
      </div>
      <div className="dori-alert-banner__content">
        {title && <h4 className="dori-alert-banner__title">{title}</h4>}
        <div className="dori-alert-banner__message">{children}</div>
      </div>
      {action && <div className="dori-alert-banner__action">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          className="dori-alert-banner__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
};
