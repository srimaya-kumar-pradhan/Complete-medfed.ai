import React from 'react';

interface BackgroundPatternProps {
  opacity?: number;
  pattern?: 'jali' | 'dots' | 'threads' | 'textile' | 'border-band';
  color?: string;
}

/**
 * Geometric Indian Folk Lattice / Jali Background Texture SVG
 */
export const BackgroundPattern: React.FC<BackgroundPatternProps> = ({
  opacity = 0.04,
  pattern = 'jali',
  color = '#1a6b6a',
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
        opacity: opacity,
      }}
      aria-hidden="true"
    >
      {pattern === 'jali' && (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dori-jali-pattern"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 40 20 L 20 40 L 0 20 Z"
                fill="none"
                stroke={color}
                strokeWidth="1"
              />
              <circle cx="20" cy="20" r="3" fill="none" stroke={color} strokeWidth="1" />
              <path
                d="M 0 0 L 10 10 M 30 10 L 40 0 M 40 40 L 30 30 M 0 40 L 10 30"
                stroke={color}
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dori-jali-pattern)" />
        </svg>
      )}

      {pattern === 'threads' && (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dori-threads-pattern"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 30 Q 15 10, 30 30 T 60 30"
                fill="none"
                stroke={color}
                strokeWidth="1"
              />
              <path
                d="M 0 45 Q 15 25, 30 45 T 60 45"
                fill="none"
                stroke={color}
                strokeWidth="0.5"
                strokeDasharray="3 3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dori-threads-pattern)" />
        </svg>
      )}

      {/* Textile: dark burgundy diamond/four-point geometry for poster crimson backgrounds */}
      {pattern === 'textile' && (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dori-textile-pattern"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              {/* Central diamond */}
              <path
                d="M 16 4 L 28 16 L 16 28 L 4 16 Z"
                fill="none"
                stroke={color}
                strokeWidth="1"
              />
              {/* Inner four-point star */}
              <path
                d="M 16 8 L 24 16 L 16 24 L 8 16 Z"
                fill={color}
                fillOpacity="0.15"
                stroke={color}
                strokeWidth="0.5"
              />
              {/* Center dot */}
              <circle cx="16" cy="16" r="1.5" fill={color} fillOpacity="0.4" />
              {/* Corner diamonds (quarter-visible, creating continuity) */}
              <path d="M 0 0 L 4 4 M 28 4 L 32 0 M 0 32 L 4 28 M 28 28 L 32 32" stroke={color} strokeWidth="0.6" />
              {/* Small accent dots at edge midpoints */}
              <circle cx="0" cy="16" r="1" fill={color} fillOpacity="0.3" />
              <circle cx="32" cy="16" r="1" fill={color} fillOpacity="0.3" />
              <circle cx="16" cy="0" r="1" fill={color} fillOpacity="0.3" />
              <circle cx="16" cy="32" r="1" fill={color} fillOpacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dori-textile-pattern)" />
        </svg>
      )}

      {/* Border-band: repeating geometric strip for decorative frame borders */}
      {pattern === 'border-band' && (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dori-border-band"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              {/* Diamond */}
              <path
                d="M 10 2 L 18 10 L 10 18 L 2 10 Z"
                fill={color}
                fillOpacity="0.35"
                stroke={color}
                strokeWidth="1.2"
              />
              {/* Inner cross */}
              <line x1="10" y1="6" x2="10" y2="14" stroke={color} strokeWidth="0.8" />
              <line x1="6" y1="10" x2="14" y2="10" stroke={color} strokeWidth="0.8" />
              {/* Corner connectors */}
              <circle cx="0" cy="0" r="1.5" fill={color} fillOpacity="0.5" />
              <circle cx="20" cy="0" r="1.5" fill={color} fillOpacity="0.5" />
              <circle cx="0" cy="20" r="1.5" fill={color} fillOpacity="0.5" />
              <circle cx="20" cy="20" r="1.5" fill={color} fillOpacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dori-border-band)" />
        </svg>
      )}
    </div>
  );
};
