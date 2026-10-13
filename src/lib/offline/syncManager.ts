// ====================================================================
// GESTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO (SYNC MANAGER)
// Procesa la cola de mutaciones offline hacia los endpoints de Next.js
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import {
  getPendingMutations,
  removeMutation,
  updateMutationStatus,
  getPendingMutationsCount,
  OfflineMutation,
} from './offlineStore';
import { getActiveAthleteId } from '@/lib/api/apiClient';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
}

type SyncListener = (state: SyncState) => void;

class OfflineSyncManager {
  private isSyncing = false;
  private isOnline = true;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncTime: number | null = null;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Inicializa los listeners de conectividad en el navegador
   */
  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      // Auto-disparar sincronización inmediata al recuperar cobertura
      this.syncPendingMutations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Intentar sincronizar si quedaron mutaciones pendientes de sesiones anteriores
    if (this.isOnline) {
      this.syncPendingMutations();
    }
  }

  /**
   * Suscribe un componente o hook al estado de sincronización
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Notificar estado actual de inmediato
    this.getCurrentState().then((state) => listener(state));
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Obtiene el estado actual consolidado
   */
  public async getCurrentState(): Promise<SyncState> {
    const pendingCount = await getPendingMutationsCount();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Notifica a todos los suscriptores
   */
  private async notifyListeners(): Promise<void> {
    const state = await this.getCurrentState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('Error en listener de sincronización:', e);
      }
    });
  }

  /**
   * Ejecuta el procesamiento secuencial FIFO de la cola de mutaciones
   */
  public async syncPendingMutations(): Promise<boolean> {
    if (this.isSyncing || !this.isOnline || typeof window === 'undefined') {
      return false;
    }

    this.isSyncing = true;
    await this.notifyListeners();

    try {
      const pending = await getPendingMutations();
      if (pending.length === 0) {
        this.isSyncing = false;
        await this.notifyListeners();
        return true;
      }

      for (const mutation of pending) {
        if (!navigator.onLine) {
          this.isOnline = false;
          break;
        }

        await updateMutationStatus(mutation.id, 'syncing');

        try {
          const athleteId = getActiveAthleteId();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (athleteId) {
            headers['x-athlete-id'] = athleteId;
          }

          const res = await fetch(mutation.endpoint, {
            method: mutation.method,
            headers,
            body: mutation.payload ? JSON.stringify(mutation.payload) : undefined,
          });

          if (res.ok) {
            await removeMutation(mutation.id);
          } else if (res.status >= 400 && res.status < 500) {
            // Error de validación o cliente: marcar fallo sin reintentar indefinidamente
            await updateMutationStatus(mutation.id, 'failed', `Error HTTP ${res.status}`);
          } else {
            // Error de servidor: mantener en cola para reintentar más tarde
            await updateMutationStatus(mutation.id, 'pending', `Error HTTP ${res.status}`);
            break;
          }
        } catch (fetchErr: any) {
          // Pérdida de conexión de red durante el fetch
          console.warn(`Pérdida de conexión sincronizando mutación ${mutation.id}:`, fetchErr);
          await updateMutationStatus(mutation.id, 'pending', fetchErr.message);
          this.isOnline = false;
          break;
        }
      }

      this.lastSyncTime = Date.now();
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }

    return true;
  }
}

// Instancia única (Singleton) para toda la aplicación
export const syncManager = new OfflineSyncManager();
