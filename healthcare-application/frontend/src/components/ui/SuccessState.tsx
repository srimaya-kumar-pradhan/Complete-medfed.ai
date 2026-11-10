import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import './SuccessState.css';

interface SuccessStateProps {
  title: string;
  message?: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  message,
  detail,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`success-state ${className}`} role="status">
      <div className="success-state-icon">
        <Icon name="check" size={24} />
      </div>
      <h3 className="success-state-title">{title}</h3>
      {message && <p className="success-state-message">{message}</p>}
      {detail && <p className="success-state-detail">{detail}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
