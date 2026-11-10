import React from 'react';
import './CardFrame.css';

interface CardFrameProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'document' | 'dashboard';
  decorative?: boolean;
  className?: string;
}

/**
 * Large mounted content-board card inspired by Indian illustrated-poster design:
 * TEAL OUTER BACKING (offset) → GOLD/PARCHMENT SURFACE → DECORATIVE INNER BORDER → CONTENT
 *
 * Variants:
 * - primary:   Full parchment-gold card with teal backing (landing page sections)
 * - secondary: Lighter cream surface (supporting content)
 * - document:  Clean parchment with thin borders (Care Passport, forms)
 * - dashboard: Subtle warm-neutral (dashboard panels, readability-first)
 */
export const CardFrame: React.FC<CardFrameProps> = ({
  children,
  variant = 'primary',
  decorative = true,
  className = '',
}) => {
  return (
    <div className={`dori-card-frame card-frame-${variant} ${className}`}>
      {/* Teal outer backing — solid offset layer behind the card */}
      <div className="card-backing" aria-hidden="true" />

      {/* Main gold/parchment surface */}
      <div className="card-surface">
        {/* Decorative inner border */}
        {decorative && (
          <div className="card-inner-border" aria-hidden="true">
            {/* Small corner ornamental dots */}
            <span className="card-corner-dot dot-tl" />
            <span className="card-corner-dot dot-tr" />
            <span className="card-corner-dot dot-bl" />
            <span className="card-corner-dot dot-br" />
          </div>
        )}

        {/* Content */}
        <div className="card-frame-content">
          {children}
        </div>
      </div>
    </div>
  );
};
