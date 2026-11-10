import React from 'react';
import './SectionFrame.css';

interface SectionFrameProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'subtle';
  showPattern?: boolean;
  className?: string;
}

/**
 * Full-section poster wrapper implementing the Indian illustrated-poster visual hierarchy:
 * OUTER TEAL FRAME → GEOMETRIC BORDER PATTERN → CRIMSON FIELD → GOLD INNER LINE → CONTENT
 */
export const SectionFrame: React.FC<SectionFrameProps> = ({
  children,
  variant = 'primary',
  showPattern = true,
  className = '',
}) => {
  return (
    <div className={`dori-section-frame frame-${variant} ${className}`}>
      {/* Geometric border pattern band */}
      <div className="frame-border-band" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern
              id={`frame-band-${variant}`}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 2 L 18 10 L 10 18 L 2 10 Z"
                fill="rgba(201,168,76,0.3)"
                stroke="#c9a84c"
                strokeWidth="1"
              />
              <line x1="10" y1="6" x2="10" y2="14" stroke="#c9a84c" strokeWidth="0.6" />
              <line x1="6" y1="10" x2="14" y2="10" stroke="#c9a84c" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="1.2" fill="#8b1a2b" />
              <circle cx="20" cy="0" r="1.2" fill="#8b1a2b" />
              <circle cx="0" cy="20" r="1.2" fill="#8b1a2b" />
              <circle cx="20" cy="20" r="1.2" fill="#8b1a2b" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#frame-band-${variant})`} />
        </svg>
      </div>

      {/* Crimson field with subtle texture */}
      <div className="frame-crimson-field">
        {/* Subtle horizontal panel lines */}
        <div className="frame-panel-lines" aria-hidden="true" />

        {/* Textile background pattern */}
        {showPattern && (
          <div className="frame-textile-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id={`textile-bg-${variant}`}
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 16 4 L 28 16 L 16 28 L 4 16 Z"
                    fill="none"
                    stroke="#5a1520"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M 16 8 L 24 16 L 16 24 L 8 16 Z"
                    fill="#5a1520"
                    fillOpacity="0.15"
                    stroke="#5a1520"
                    strokeWidth="0.4"
                  />
                  <circle cx="16" cy="16" r="1.2" fill="#5a1520" fillOpacity="0.25" />
                  <circle cx="0" cy="16" r="0.8" fill="#5a1520" fillOpacity="0.2" />
                  <circle cx="32" cy="16" r="0.8" fill="#5a1520" fillOpacity="0.2" />
                  <circle cx="16" cy="0" r="0.8" fill="#5a1520" fillOpacity="0.2" />
                  <circle cx="16" cy="32" r="0.8" fill="#5a1520" fillOpacity="0.2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#textile-bg-${variant})`} />
            </svg>
          </div>
        )}

        {/* Gold inner border */}
        <div className="frame-gold-inner">
          {/* Gold corner ornaments */}
          <div className="gold-corner gold-corner-tl" aria-hidden="true" />
          <div className="gold-corner gold-corner-tr" aria-hidden="true" />
          <div className="gold-corner gold-corner-bl" aria-hidden="true" />
          <div className="gold-corner gold-corner-br" aria-hidden="true" />

          {/* Content */}
          <div className="frame-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
