import React from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  children,
}) => {
  return (
    <header className="dori-page-header">
      <div className="page-header-text">
        {eyebrow && <span className="page-header-eyebrow">{eyebrow}</span>}
        <h1 className="page-header-title">{title}</h1>
        {description && <p className="page-header-desc">{description}</p>}
      </div>
      {(action || children) && (
        <div className="page-header-actions">
          {action}
          {children}
        </div>
      )}
    </header>
  );
};
