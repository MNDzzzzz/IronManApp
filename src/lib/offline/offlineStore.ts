// ====================================================================
// MOTOR DE PERSISTENCIA LOCAL EN INDEXEDDB: IronManApp
// Proporciona persistencia Offline-First para telemetría y cola de mutaciones.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

export interface OfflineMutation {
  id: string; // Identificador único UUID / timestamp
  timestamp: number;
  endpoint: string; // ej: '/api/nutrition', '/api/gym'
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export type OfflineCacheKey =
  | 'health'
  | 'activities'
  | 'gym'
  | 'nutrition'
  | 'weight'
  | 'schedule';

const DB_NAME = 'IronManOfflineDB';
const DB_VERSION = 1;
const STORE_CACHE = 'telemetry_cache';
const STORE_MUTATIONS = 'mutation_queue';

let dbInstance: IDBDatabase | null = null;

/**
 * Resetea la instancia de DB para aislamiento en pruebas unitarias
 */
export function resetOfflineDBForTesting(): void {
  dbInstance = null;
}

/**
 * Inicializa y obtiene la instancia de IndexedDB de forma segura para SSR
 */
export async function getOfflineDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const idb = typeof window !== 'undefined' ? window.indexedDB : null;
    if (!idb) {
      resolve(null);
      return;
    }
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        const mutationStore = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
        mutationStore.createIndex('status', 'status', { unique: false });
        mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.warn('Error inicializando IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// --------------------------------------------------------------------
// OPERACIONES DEL ALMACÉN DE TELEMETRÍA (CACHE LOCAL)
// --------------------------------------------------------------------

/**
 * Guarda en caché local un snapshot de telemetría para carga instantánea en 0 ms
 */
export async function setCachedTelemetry<T = any>(key: OfflineCacheKey, data: T): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_CACHE);
      store.put({ key, data, updatedAt: Date.now() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Recupera un snapshot de telemetría de la caché local
 */
export async function getCachedTelemetry<T = any>(key: OfflineCacheKey): Promise<T | null> {
  const db = await getOfflineDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// --------------------------------------------------------------------
// OPERACIONES DE LA COLA DE MUTACIONES OFFLINE
// --------------------------------------------------------------------

/**
 * Encola una mutación para sincronizar en segundo plano cuando haya conexión
 */
export async function enqueueMutation(
  mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount' | 'status'>
): Promise<OfflineMutation | null> {
  const db = await getOfflineDB();
  const fullMutation: OfflineMutation = {
    ...mutation,
    id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  if (!db) {
    // Si IndexedDB no está disponible (ej. modo incógnito restrictivo), fallback a memoria
    return fullMutation;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      store.add(fullMutation);

      tx.oncomplete = () => resolve(fullMutation);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Obtiene todas las mutaciones pendientes de sincronización ordenadas por antigüedad
 */
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await getOfflineDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = (req.result || []) as OfflineMutation[];
        const pending = all
          .filter((m) => m.status === 'pending' || m.status === 'syncing')
          .sort((a, b) => a.timestamp - b.timestamp);
        resolve(pending);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Actualiza el estado de una mutación en la cola
 */
export async function updateMutationStatus(
  id: string,
  status: OfflineMutation['status'],
  error?: string
): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result) {
          const item = req.result as OfflineMutation;
          item.status = status;
          if (error) item.error = error;
          if (status === 'failed') item.retryCount += 1;
          store.put(item);
        }
        resolve();
      };

      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Elimina una mutación de la cola una vez sincronizada con éxito
 */
export async function removeMutation(id: string): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Obtiene el conteo total de mutaciones en cola
 */
export async function getPendingMutationsCount(): Promise<number> {
  const pending = await getPendingMutations();
  return pending.length;
}
