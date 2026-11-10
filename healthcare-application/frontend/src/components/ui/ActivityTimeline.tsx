import React from 'react';
import './ActivityTimeline.css';

export interface TimelineEntry {
  time: string;
  title: string;
  actor?: string;
  result?: string;
  icon?: React.ReactNode;
}

interface ActivityTimelineProps {
  title?: string;
  entries: TimelineEntry[];
  className?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  title,
  entries,
  className = '',
}) => {
  return (
    <div className={`activity-timeline ${className}`}>
      {title && <h3 className="timeline-heading">{title}</h3>}
      <ol className="timeline-list">
        {entries.map((entry, i) => (
          <li key={i} className="timeline-entry">
            <div className="timeline-marker" aria-hidden="true">
              {entry.icon || <span className="timeline-dot" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-top">
                <span className="timeline-time">{entry.time}</span>
                {entry.actor && <span className="timeline-actor">{entry.actor}</span>}
              </div>
              <p className="timeline-title">{entry.title}</p>
              {entry.result && <span className="timeline-result">{entry.result}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
