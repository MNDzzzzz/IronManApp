'use client';

import React from 'react';
import { RefreshCw, Settings, ShieldCheck, Activity, FileText } from 'lucide-react';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenReport?: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedText?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSettings,
  onOpenReport,
  onRefresh,
  isRefreshing,
  lastSyncedText = 'Fit3: Al día',
}) => {
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-[#121211]/85 backdrop-blur-2xl border-b border-white/[0.06] pt-[env(safe-area-inset-top,16px)] px-4 pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Marca y Fecha */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              IRONMAN
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-mono">
              GALAXY FIT3
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 capitalize mt-0.5">{todayFormatted}</p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lastSyncedText}</span>
          </div>

          {/* Botón Sincronizar Ahora */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Sincronizar"
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Informe Semanal */}
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              aria-label="Informe Semanal"
              title="Informe y Resumen Semanal"
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:text-amber-300 hover:border-amber-500/50 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {/* Ajustes */}
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
