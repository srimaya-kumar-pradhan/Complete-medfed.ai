import React from 'react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  accentColor?: 'teal' | 'crimson' | 'gold' | 'green' | 'navy';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendType = 'neutral',
  icon,
  accentColor = 'teal',
}) => {
  return (
    <div className={`dori-stat-card stat-accent-${accentColor}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <div className="stat-card-icon">{icon}</div>}
      </div>
      <div className="stat-card-value">{value}</div>
      {(subtitle || trend) && (
        <div className="stat-card-footer">
          {trend && (
            <span className={`stat-trend trend-${trendType}`}>{trend}</span>
          )}
          {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
