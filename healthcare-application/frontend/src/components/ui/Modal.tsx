import React, { useEffect } from 'react';
import { Icon } from './Icon';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  className = '',
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dori-modal-backdrop" onClick={closeOnBackdrop ? onClose : undefined} role="presentation">
      <div
        className={`dori-modal dori-modal--${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        <div className="dori-modal__header">
          <div className="dori-modal__titles">
            {title && (
              <h2 id="modal-title" className="dori-modal__title">
                {title}
              </h2>
            )}
            {subtitle && <p className="dori-modal__subtitle">{subtitle}</p>}
          </div>
          <button
            className="dori-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dori-modal__body">{children}</div>

        {/* Footer */}
        {footer && <div className="dori-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};
