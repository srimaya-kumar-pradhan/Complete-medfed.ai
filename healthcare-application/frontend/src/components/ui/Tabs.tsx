import React from 'react';
import './Tabs.css';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'primary' | 'warning' | 'error' | 'success';
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className = '',
}: TabsProps<T>) {
  return (
    <div className={`dori-tabs-nav dori-tabs-nav--${variant} dori-tabs-nav--${size} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`dori-tab-btn ${isActive ? 'dori-tab-btn--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="dori-tab-icon">{tab.icon}</span>}
            <span className="dori-tab-label">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`dori-tab-badge ${
                  tab.badgeVariant ? `dori-tab-badge--${tab.badgeVariant}` : ''
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
