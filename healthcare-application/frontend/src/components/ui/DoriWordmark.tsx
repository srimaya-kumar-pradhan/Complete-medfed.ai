import React from 'react';

interface DoriWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showTagline?: boolean;
  variant?: 'primary' | 'teal' | 'white' | 'dark' | 'gold';
}

/**
 * Clean Typographic DORI Brandmark
 * Pure text-based typography — No logo stickers or icon boxes
 */
export const DoriWordmark: React.FC<DoriWordmarkProps> = ({
  size = 'md',
  showTagline = false,
  variant = 'primary',
}) => {
  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '18px';
      case 'lg':
        return '24px';
      case 'hero':
        return '30px';
      default:
        return '20px';
    }
  };

  const textColor = variant === 'white' ? '#FFFFFF' : '#09090B';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        userSelect: 'none',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: getFontSize(),
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: textColor,
          lineHeight: 1,
        }}
      >
        DORI
      </span>

      {showTagline && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            letterSpacing: '0.01em',
            color: variant === 'white' ? 'rgba(255, 255, 255, 0.7)' : '#71717A',
            marginTop: '3px',
            fontWeight: 400,
          }}
        >
          Care Continuity Infrastructure
        </span>
      )}
    </div>
  );
};
