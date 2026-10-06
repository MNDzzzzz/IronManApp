'use client';

import React from 'react';
import { RefreshCw, Settings, FileText, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenReport?: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedText?: string;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSettings,
  onOpenReport,
  onRefresh,
  isRefreshing,
  lastSyncedText = 'Fit3: Al día',
  isDark = true,
  onToggleTheme,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 liquid-glass-nav border-b border-[var(--glass-border)] pt-[env(safe-area-inset-top,16px)] px-4 pb-3 transition-colors duration-300">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Marca y Fecha */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-amber-500 to-[#D97757] dark:from-amber-300 dark:to-amber-500 bg-clip-text text-transparent">
              IRONMAN
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-pill text-[var(--text-secondary)] font-mono">
              GALAXY FIT3
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] capitalize mt-0.5 font-medium">
            {todayFormatted}
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>{lastSyncedText}</span>
          </div>

          {/* Selector de Modo Claro / Oscuro */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-xl liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          )}

          {/* Botón Sincronizar Ahora */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Sincronizar telemetría"
            className="p-2 rounded-xl liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500 dark:text-amber-400' : ''}`} />
          </button>

          {/* Informe Semanal */}
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              aria-label="Informe Semanal"
              title="Informe y Resumen Semanal"
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:text-amber-500 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {/* Ajustes */}
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes de la aplicación"
            className="p-2 rounded-xl liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
