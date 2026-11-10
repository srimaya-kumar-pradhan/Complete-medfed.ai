import React from 'react';
import { useOfflineSync } from '../../offline/useOfflineSync';
import { Icon } from './Icon';
import './SyncIndicator.css';

export const SyncIndicator: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync();

  return (
    <div className={`dori-sync-indicator ${isOnline ? 'online' : 'offline'}`} role="status" aria-live="polite">
      <div className="sync-status-dot" />
      <div className="sync-info">
        <span className="sync-label">
          {isOnline ? (isSyncing ? 'Syncing...' : 'Online') : 'Offline Mode'}
        </span>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} pending</span>
        )}
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          className="sync-trigger-btn"
          onClick={() => triggerSync()}
          disabled={isSyncing}
          title="Force synchronization now"
          aria-label="Force synchronization now"
        >
          <Icon name="sync" size={13} color="var(--color-teal)" className={isSyncing ? 'spinning' : ''} />
          <span>Sync</span>
        </button>
      )}
    </div>
  );
};
