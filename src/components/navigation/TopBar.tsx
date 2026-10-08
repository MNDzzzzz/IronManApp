'use client';

import React from 'react';
import { RefreshCw, Settings, FileText, Sun, Moon } from 'lucide-react';
import { SyncStatusPill } from '@/components/common/SyncStatusPill';

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
    <header className="sticky top-0 z-40 liquid-glass-nav border-b border-[var(--glass-border)] pt-[max(env(safe-area-inset-top),14px)] px-4 pb-2.5 transition-colors duration-300">
      <div className="max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between">
        {/* Identidad de Marca y Fecha */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-[0.18em] text-[var(--text-primary)] editorial-heading">
              IRONMAN
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D97757] dark:bg-[#E28464]" />
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono tracking-tight">
              21K 2027
            </span>
          </div>
          <p suppressHydrationWarning className="text-[11px] text-[var(--text-secondary)] capitalize font-medium tracking-tight mt-0.5">
            {todayFormatted}
          </p>
        </div>

        {/* Grupo de Acciones Rápidas */}
        <div className="flex items-center gap-1.5">
          {/* Badge de sincronización offline-first */}
          <SyncStatusPill />

          {/* Selector de Modo Claro / Oscuro */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-all"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          )}

          {/* Sincronización Manual */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Sincronizar telemetría"
            className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#D97757]' : ''}`} />
          </button>

          {/* Acceso a Informe Semanal */}
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              aria-label="Informe Semanal"
              title="Informe y Resumen Semanal"
              className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-[#D97757] dark:text-[#E28464] hover:opacity-80 active:scale-90 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Ajustes */}
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes de la aplicación"
            className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
