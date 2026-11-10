import React from 'react';
import './Badge.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'teal'
    | 'crimson'
    | 'gold'
    | 'success'
    | 'warning'
    | 'error'
    | 'neutral'
    | 'navy';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'teal',
  size = 'md',
  dot = false,
}) => {
  return (
    <span className={`dori-badge badge-${variant} badge-${size}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};
