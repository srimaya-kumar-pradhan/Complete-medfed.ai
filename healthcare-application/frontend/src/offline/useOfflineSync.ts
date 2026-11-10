import { useState, useEffect, useCallback } from 'react';
import { offlineStore, type PendingAction } from './offlineStore';
import { api } from '../api/client';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const actions = await offlineStore.getPendingActions();
      setPendingCount(actions.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);

    try {
      const actions: PendingAction[] = await offlineStore.getPendingActions();
      for (const action of actions) {
        try {
          await api.post(action.endpoint, action.payload);
          await offlineStore.removeAction(action.id);
        } catch (err) {
          console.warn(`[Sync] Failed to sync action ${action.id}:`, err);
          break;
        }
      }
      setLastSyncTime(new Date());
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    triggerSync,
    refreshPendingCount,
  };
}
