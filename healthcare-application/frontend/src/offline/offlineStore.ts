import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface PendingAction {
  id: string;
  type: 'CREATE_PATIENT' | 'CREATE_ENCOUNTER' | 'CREATE_REFERRAL' | 'RESOLVE_CARE_GAP' | 'UPDATE_CONSENT';
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface DoriDB extends DBSchema {
  patients: {
    key: string;
    value: Record<string, unknown>;
  };
  encounters: {
    key: string;
    value: Record<string, unknown>;
  };
  careGaps: {
    key: string;
    value: Record<string, unknown>;
  };
  referrals: {
    key: string;
    value: Record<string, unknown>;
  };
  syncQueue: {
    key: string;
    value: PendingAction;
    indexes: { 'by-created': string };
  };
}

const DB_NAME = 'dori_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DoriDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<DoriDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('patients')) {
          db.createObjectStore('patients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('encounters')) {
          db.createObjectStore('encounters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('careGaps')) {
          db.createObjectStore('careGaps', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('referrals')) {
          db.createObjectStore('referrals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

export const offlineStore = {
  // Queue an offline mutation
  enqueueAction: async (action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>) => {
    const db = await getDB();
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pendingAction: PendingAction = {
      ...action,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put('syncQueue', pendingAction);
    return pendingAction;
  },

  // Get all pending actions in queue
  getPendingActions: async (): Promise<PendingAction[]> => {
    const db = await getDB();
    return db.getAllFromIndex('syncQueue', 'by-created');
  },

  // Remove action once successfully pushed
  removeAction: async (id: string) => {
    const db = await getDB();
    await db.delete('syncQueue', id);
  },

  // Cache entity locally
  cacheEntity: async (storeName: 'patients' | 'encounters' | 'careGaps' | 'referrals', entity: { id: string; [key: string]: unknown }) => {
    const db = await getDB();
    await db.put(storeName, entity);
  },

  // Get cached entities
  getCachedList: async (storeName: 'patients' | 'encounters' | 'careGaps' | 'referrals') => {
    const db = await getDB();
    return db.getAll(storeName);
  },
};
