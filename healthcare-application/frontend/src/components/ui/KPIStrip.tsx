import React from 'react';
import './KPIStrip.css';

export interface KPIItem {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; text: string };
}

interface KPIStripProps {
  items: KPIItem[];
  className?: string;
}

export const KPIStrip: React.FC<KPIStripProps> = ({ items, className = '' }) => {
  return (
    <div className={`kpi-strip ${className}`} role="region" aria-label="Key metrics">
      {items.map((item, i) => (
        <div key={i} className="kpi-item">
          <span className="kpi-value">{item.value}</span>
          <span className="kpi-label">{item.label}</span>
          {item.subtitle && <span className="kpi-subtitle">{item.subtitle}</span>}
          {item.trend && (
            <span className={`kpi-trend kpi-trend-${item.trend.direction}`}>
              {item.trend.direction === 'up' && '↑'}
              {item.trend.direction === 'down' && '↓'}
              {item.trend.direction === 'flat' && '→'}
              {' '}{item.trend.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
