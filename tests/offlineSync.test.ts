// ====================================================================
// TEST SUITE: OFFLINE-FIRST PERSISTENCIA Y COLA DE MUTACIONES
// Valida el funcionamiento de IndexedDB local, caché instantánea,
// cola FIFO de mutaciones y sincronización en segundo plano.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueMutation,
  getCachedTelemetry,
  setCachedTelemetry,
  getPendingMutations,
  updateMutationStatus,
  removeMutation,
  getPendingMutationsCount,
  resetOfflineDBForTesting,
  OfflineMutation,
} from '../src/lib/offline/offlineStore';
import { syncManager } from '../src/lib/offline/syncManager';

// --------------------------------------------------------------------
// 1. Simulación Mock de IndexedDB para entorno Node.js / CI
// --------------------------------------------------------------------

interface MockStoreData {
  telemetry_cache: Map<string, any>;
  mutation_queue: Map<string, OfflineMutation>;
}

function createMockIndexedDB(): {
  windowMock: any;
  storage: MockStoreData;
} {
  const storage: MockStoreData = {
    telemetry_cache: new Map(),
    mutation_queue: new Map(),
  };

  const createMockStore = (storeName: keyof MockStoreData) => ({
    put: (item: any) => {
      const key = item.key || item.id;
      storage[storeName].set(key, item);
      const req: any = { onsuccess: null, onerror: null };
      setImmediate(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    add: (item: any) => {
      const key = item.id;
      storage[storeName].set(key, item);
      const req: any = { onsuccess: null, onerror: null };
      setImmediate(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    get: (key: string) => {
      const req: any = {
        result: storage[storeName].get(key),
        onsuccess: null,
        onerror: null,
      };
      setImmediate(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    getAll: () => {
      const req: any = {
        result: Array.from(storage[storeName].values()),
        onsuccess: null,
        onerror: null,
      };
      setImmediate(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    delete: (key: string) => {
      storage[storeName].delete(key);
      const req: any = { onsuccess: null, onerror: null };
      setImmediate(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    createIndex: () => {},
  });

  const mockDb = {
    objectStoreNames: {
      contains: () => true,
    },
    transaction: (storeNames: string | string[], mode: string) => {
      const name = (Array.isArray(storeNames) ? storeNames[0] : storeNames) as keyof MockStoreData;
      const tx: any = {
        objectStore: () => createMockStore(name),
        oncomplete: null,
        onerror: null,
      };
      setImmediate(() => {
        if (tx.oncomplete) tx.oncomplete();
      });
      return tx;
    },
  };

  const windowMock = {
    indexedDB: {
      open: () => {
        const req: any = {
          result: mockDb,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        setImmediate(() => {
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  return { windowMock, storage };
}

// --------------------------------------------------------------------
// 2. Pruebas Unitarias
// --------------------------------------------------------------------

test('OFFLINE: enqueueMutation genera estructura válida cuando no hay IndexedDB (SSR fallback)', async () => {
  resetOfflineDBForTesting();
  const originalWindow = (global as any).window;
  delete (global as any).window;

  try {
    const mutation = await enqueueMutation({
      endpoint: '/api/nutrition',
      method: 'POST',
      payload: { amount_ml: 250, type: 'water' },
    });

    assert.ok(mutation !== null, 'La mutación no debe ser nula');
    assert.ok(mutation.id.startsWith('mut-'), 'El ID debe comenzar por mut-');
    assert.equal(mutation.endpoint, '/api/nutrition');
    assert.equal(mutation.method, 'POST');
    assert.equal(mutation.status, 'pending');
    assert.equal(mutation.retryCount, 0);
    assert.equal(mutation.payload.amount_ml, 250);
  } finally {
    if (originalWindow) (global as any).window = originalWindow;
  }
});

test('OFFLINE: Caché local almacena y recupera telemetría correctamente', async () => {
  resetOfflineDBForTesting();
  const { windowMock } = createMockIndexedDB();
  (global as any).window = windowMock;

  try {
    const mockHealth = {
      id: 'h1',
      date: '2026-10-07',
      sleep_hours: 7.5,
      resting_hr: 54,
      hrv_ms: 68,
      stress_level: 22,
      steps: 8500,
    };

    await setCachedTelemetry('health', mockHealth);
    const retrieved = await getCachedTelemetry<typeof mockHealth>('health');

    assert.ok(retrieved !== null, 'Los datos recuperados no deben ser nulos');
    assert.equal(retrieved.sleep_hours, 7.5);
    assert.equal(retrieved.resting_hr, 54);
    assert.equal(retrieved.hrv_ms, 68);
  } finally {
    resetOfflineDBForTesting();
    delete (global as any).window;
  }
});

test('OFFLINE: Cola de mutaciones respeta orden FIFO y estados de sincronización', async () => {
  resetOfflineDBForTesting();
  const { windowMock } = createMockIndexedDB();
  (global as any).window = windowMock;

  try {
    // 1. Encolar dos mutaciones con timestamps secuenciales
    const mut1 = await enqueueMutation({
      endpoint: '/api/gym',
      method: 'POST',
      payload: { exercise_id: 'press-banca', weight_kg: 80, reps: 8 },
    });

    // Pequeño retardo para asegurar orden cronológico
    await new Promise((r) => setTimeout(r, 10));

    const mut2 = await enqueueMutation({
      endpoint: '/api/nutrition',
      method: 'POST',
      payload: { amount_ml: 500, type: 'water' },
    });

    assert.ok(mut1 && mut2, 'Ambas mutaciones deben haberse creado');

    // 2. Comprobar que ambas están pendientes
    const pendingList = await getPendingMutations();
    assert.equal(pendingList.length, 2, 'Debe haber 2 mutaciones pendientes');
    assert.equal(pendingList[0].id, mut1.id, 'La primera mutación debe ser la más antigua (FIFO)');

    // 3. Actualizar estado de mut1 a syncing
    await updateMutationStatus(mut1.id, 'syncing');
    const afterSyncing = await getPendingMutations();
    const target1 = afterSyncing.find((m) => m.id === mut1.id);
    assert.equal(target1?.status, 'syncing');

    // 4. Marcar mutación como completada eliminándola
    await removeMutation(mut1.id);
    const afterRemove = await getPendingMutations();
    assert.equal(afterRemove.length, 1);
    assert.equal(afterRemove[0].id, mut2.id);

    // 5. Marcar mut2 como failed
    await updateMutationStatus(mut2.id, 'failed', 'Error 500 en Supabase');
    const afterFail = await getPendingMutations();
    // La lista de pendientes solo devuelve pending o syncing
    assert.equal(afterFail.length, 0, 'Las mutaciones fallidas no se auto-reintentan de inmediato');
  } finally {
    resetOfflineDBForTesting();
    delete (global as any).window;
  }
});

test('OFFLINE: SyncManager maneja suscripciones de estado y detección de red', async () => {
  resetOfflineDBForTesting();
  const { windowMock } = createMockIndexedDB();
  (global as any).window = windowMock;

  try {
    let notifiedState: any = null;
    const unsubscribe = syncManager.subscribe((state) => {
      notifiedState = state;
    });

    // Esperar microtask de notificación inicial
    await new Promise((r) => setTimeout(r, 20));

    assert.ok(notifiedState !== null, 'El listener debe recibir el estado');
    assert.equal(typeof notifiedState.isOnline, 'boolean');
    assert.equal(typeof notifiedState.pendingCount, 'number');

    unsubscribe();
  } finally {
    resetOfflineDBForTesting();
    delete (global as any).window;
  }
});
