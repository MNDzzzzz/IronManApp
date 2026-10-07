'use client';

// ====================================================================
// PÍLDORA DE ESTADO DE SINCRONIZACIÓN OFFLINE: SyncStatusPill
// Diseño: Liquid Glass Dual Mode (iOS Minimalist)
// Proporciona feedback háptico/visual no intrusivo del estado de red.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';

export const SyncStatusPill: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

  // Si está online y sin cambios pendientes, mostrar indicador de sincronizado minimalista
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium liquid-glass-pill text-emerald-600 dark:text-emerald-400 select-none transition-all"
        title="Todos los datos están sincronizados en la nube"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline font-mono text-[10px]">Al día</span>
      </div>
    );
  }

  // Si está sincronizando
  if (isSyncing) {
    return (
      <button
        onClick={() => syncNow()}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium liquid-glass-pill text-amber-500 hover:text-amber-400 select-none transition-all"
        title="Sincronizando cambios locales con Supabase..."
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
        <span className="font-mono text-[10px]">
          Sincronizando{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </span>
      </button>
    );
  }

  // Si está sin conexión (Offline)
  return (
    <button
      onClick={() => syncNow()}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium liquid-glass-pill text-rose-500 hover:text-rose-400 select-none transition-all"
      title="Sin conexión. Tus datos se guardan de forma segura en este dispositivo y se subirán al recuperar cobertura."
    >
      <WifiOff className="w-3 h-3 text-rose-500" />
      <span className="font-mono text-[10px]">
        {pendingCount > 0 ? `${pendingCount} en cola local` : 'Modo local'}
      </span>
    </button>
  );
};
