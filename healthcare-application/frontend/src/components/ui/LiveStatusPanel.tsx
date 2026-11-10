import React from 'react';
import { StatusBadge, type StatusVariant } from './StatusBadge';
import './LiveStatusPanel.css';

export interface LiveStatusItem {
  label: string;
  status: StatusVariant;
  statusLabel?: string;
  detail?: string;
}

interface LiveStatusPanelProps {
  title: string;
  items: LiveStatusItem[];
  className?: string;
}

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  title,
  items,
  className = '',
}) => {
  return (
    <aside className={`live-status-panel ${className}`} aria-label={title}>
      <div className="live-status-header">
        <span className="live-status-dot" aria-hidden="true" />
        <h3 className="live-status-title">{title}</h3>
      </div>
      <ul className="live-status-list">
        {items.map((item, i) => (
          <li key={i} className="live-status-row">
            <span className="live-status-label">{item.label}</span>
            <StatusBadge status={item.status} label={item.statusLabel} size="sm" />
            {item.detail && <span className="live-status-detail">{item.detail}</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
};
