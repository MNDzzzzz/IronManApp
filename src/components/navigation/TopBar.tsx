'use client';

import React from 'react';
import { RefreshCw, Settings, ShieldCheck, Activity } from 'lucide-react';

interface TopBarProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedText?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSettings,
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
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-900/60 pt-[env(safe-area-inset-top,16px)] px-4 pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Marca y Fecha */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              IRONMAN
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
              FIT3 + STRAVA
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 capitalize mt-0.5">{todayFormatted}</p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lastSyncedText}</span>
          </div>

          {/* Botón Sincronizar Ahora */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Sincronizar"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>

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
