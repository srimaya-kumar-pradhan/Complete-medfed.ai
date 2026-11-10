import React from 'react';
import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  type?: 'card' | 'table-row' | 'stat' | 'text';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  return (
    <div className={`skeleton-group ${className}`} aria-busy="true" aria-label="Loading data">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`dori-skeleton skeleton-${type}`}>
          <div className="skeleton-shine" />
        </div>
      ))}
    </div>
  );
};
