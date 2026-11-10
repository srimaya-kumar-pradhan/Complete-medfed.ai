import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  detail,
  onRetry,
  retryLabel = 'Retry now',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`} role="alert">
      <div className="error-state-icon">
        <Icon name="alert" size={24} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {detail && <p className="error-state-detail">{detail}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
