import React from 'react';
import './EvidencePanel.css';

export interface EvidenceItem {
  label: string;
  value: string | React.ReactNode;
}

interface EvidencePanelProps {
  title: string;
  items: EvidenceItem[];
  footer?: React.ReactNode;
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  title,
  items,
  footer,
  className = '',
}) => {
  return (
    <aside className={`evidence-panel ${className}`} aria-label={title}>
      <h3 className="evidence-panel-title">{title}</h3>
      <dl className="evidence-list">
        {items.map((item, i) => (
          <div key={i} className="evidence-row">
            <dt className="evidence-label">{item.label}</dt>
            <dd className="evidence-value">{item.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="evidence-footer">{footer}</div>}
    </aside>
  );
};
