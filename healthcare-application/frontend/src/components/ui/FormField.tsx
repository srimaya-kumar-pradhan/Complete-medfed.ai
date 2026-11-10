import React from 'react';
import './FormField.css';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`dori-form-field ${error ? 'dori-form-field--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="dori-form-field__label">
          {label}
          {required && <span className="dori-form-field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="dori-form-field__control">{children}</div>
      {hint && !error && <p className="dori-form-field__hint">{hint}</p>}
      {error && <p className="dori-form-field__error" role="alert">{error}</p>}
    </div>
  );
};
