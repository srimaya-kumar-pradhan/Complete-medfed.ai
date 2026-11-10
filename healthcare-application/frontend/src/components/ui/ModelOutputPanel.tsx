import React from 'react';
import { Icon } from './Icon';
import './ModelOutputPanel.css';

interface ModelOutputPanelProps {
  title?: string;
  riskLevel: string;
  riskLabel?: string;
  confidence: number;
  recommendedAction: string;
  modelName: string;
  generatedAt: string;
  explanation?: string;
  className?: string;
}

export const ModelOutputPanel: React.FC<ModelOutputPanelProps> = ({
  title = 'Care-Gap Assessment',
  riskLevel,
  riskLabel,
  confidence,
  recommendedAction,
  modelName,
  generatedAt,
  explanation,
  className = '',
}) => {
  const riskClass = riskLevel === 'critical' || riskLevel === 'high'
    ? 'risk-high'
    : riskLevel === 'medium' ? 'risk-medium' : 'risk-low';

  return (
    <div className={`model-output-panel ${className}`}>
      <div className="model-output-header">
        <Icon name="chart" size={16} />
        <h3 className="model-output-title">{title}</h3>
      </div>

      <div className="model-output-body">
        <div className="model-output-row">
          <span className="model-output-label">Follow-up risk</span>
          <span className={`model-risk-badge ${riskClass}`}>
            {riskLabel || riskLevel}
          </span>
        </div>

        <div className="model-output-row">
          <span className="model-output-label">Model confidence</span>
          <div className="model-confidence">
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="confidence-value">{Math.round(confidence * 100)}%</span>
          </div>
        </div>

        <div className="model-output-row">
          <span className="model-output-label">Recommended workflow</span>
          <span className="model-output-value">{recommendedAction}</span>
        </div>

        <div className="model-output-row">
          <span className="model-output-label">Model</span>
          <span className="model-output-value model-version">{modelName}</span>
        </div>

        <div className="model-output-row">
          <span className="model-output-label">Generated</span>
          <span className="model-output-value">{generatedAt}</span>
        </div>

        {explanation && (
          <p className="model-explanation">{explanation}</p>
        )}
      </div>

      <div className="model-output-disclaimer">
        <Icon name="info" size={12} />
        <span>
          This is decision support. Clinical decisions remain with the authorized healthcare professional.
        </span>
      </div>
    </div>
  );
};
