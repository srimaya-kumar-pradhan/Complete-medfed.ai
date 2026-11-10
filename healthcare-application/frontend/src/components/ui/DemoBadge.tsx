import React from 'react';
import './DemoBadge.css';

interface DemoBadgeProps {
  className?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`demo-badge-indicator ${className}`} role="status" aria-label="Synthetic demo data active">
      <span className="demo-badge-dot" aria-hidden="true" />
      <span className="demo-badge-text">SYNTHETIC DEMO DATA</span>
    </div>
  );
};
