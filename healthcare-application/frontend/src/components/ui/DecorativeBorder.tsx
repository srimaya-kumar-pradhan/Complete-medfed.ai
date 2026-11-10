import React from 'react';
import { CornerMotif } from './CornerMotif';
import './DecorativeBorder.css';

interface DecorativeBorderProps {
  children: React.ReactNode;
  variant?: 'hero' | 'card' | 'panel' | 'gold' | 'crimson' | 'poster';
  className?: string;
  showMotifs?: boolean;
  motifSize?: number;
  interactive?: boolean;
}

/**
 * Signature DORI Decorative Folk-Art Border Frame
 * Features double-stroke borders (teal outer, crimson/gold inner) and 4 traditional corner motifs.
 */
export const DecorativeBorder: React.FC<DecorativeBorderProps> = ({
  children,
  variant = 'card',
  className = '',
  showMotifs = true,
  motifSize = 48,
  interactive = false,
}) => {
  return (
    <div
      className={`dori-decorative-border dori-border-${variant} ${
        interactive ? 'interactive' : ''
      } ${className}`}
    >
      {showMotifs && (
        <>
          <CornerMotif position="top-left" size={motifSize} />
          <CornerMotif position="top-right" size={motifSize} />
          <CornerMotif position="bottom-left" size={motifSize} />
          <CornerMotif position="bottom-right" size={motifSize} />
        </>
      )}
      <div className="dori-border-inner-content">{children}</div>
    </div>
  );
};
