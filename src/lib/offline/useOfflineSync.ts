// ====================================================================
// HOOK REACT: useOfflineSync
// Proporciona estado reactivo de conectividad, mutaciones optimistas
// y sincronización en segundo plano para toda la interfaz.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncState } from './syncManager';
import { enqueueMutation, OfflineMutation } from './offlineStore';

export function useOfflineSync() {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
  });

  useEffect(() => {
    syncManager.init();
    const unsubscribe = syncManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Forzar sincronización manual de la cola
   */
  const syncNow = useCallback(async () => {
    return await syncManager.syncPendingMutations();
  }, []);

  /**
   * Ejecuta una mutación optimista inmediata en local y la encola para sincronizar
   */
  const executeOptimisticMutation = useCallback(
    async <T = any>(
      endpoint: string,
      method: 'POST' | 'PUT' | 'DELETE',
      payload: any,
      optimisticUpdate?: () => void
    ): Promise<OfflineMutation | null> => {
      // 1. Aplicar mutación optimista inmediata en memoria de la UI (0 ms)
      if (optimisticUpdate) {
        optimisticUpdate();
      }

      // 2. Encolar en IndexedDB
      const queued = await enqueueMutation({
        endpoint,
        method,
        payload,
      });

      // 3. Si hay red, disparar sincronización en background
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncManager.syncPendingMutations().catch((e) => {
          console.warn('Aviso sincronizando en background:', e);
        });
      }

      return queued;
    },
    []
  );

  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    lastSyncTime: state.lastSyncTime,
    syncNow,
    executeOptimisticMutation,
  };
}
