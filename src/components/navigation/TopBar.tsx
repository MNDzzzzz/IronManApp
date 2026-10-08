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
    <header className="sticky top-0 z-40 bg-[var(--glass-surface-thick)] backdrop-blur-2xl backdrop-saturate-150 border-b border-[var(--glass-border)] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),inset_0_-0.5px_0_0_rgba(255,255,255,0.15)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.4),inset_0_-0.5px_0_0_rgba(255,255,255,0.06)] pt-[max(env(safe-area-inset-top,0px),14px)] px-3 sm:px-6 pb-2.5 sm:pb-3 transition-colors duration-300">
      <div className="max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Identidad de Marca y Fecha Nativa Apple */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[var(--text-primary)] editorial-heading">
              IRONMAN
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] dark:bg-[#E28464] shadow-[0_0_8px_rgba(217,119,87,0.5)]" />
            <span className="px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[9px] sm:text-[10px] text-[var(--text-tertiary)] font-mono tracking-tight font-medium">
              21K 2027
            </span>
          </div>
          <p suppressHydrationWarning className="text-[10.5px] sm:text-[11px] text-[var(--text-secondary)] capitalize font-medium tracking-tight mt-0.5 truncate">
            {todayFormatted}
          </p>
        </div>

        {/* Grupo de Acciones Rápidas con Botones Circulares Specular de Apple */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Badge de sincronización offline-first */}
          <SyncStatusPill />

          {/* Selector de Modo Claro / Oscuro */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/40 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.15)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/70 dark:hover:bg-white/10 active:scale-90 transition-all duration-200"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          )}

          {/* Sincronización Manual */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Sincronizar telemetría"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/40 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.15)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/70 dark:hover:bg-white/10 active:scale-90 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#D97757]' : ''}`} />
          </button>

          {/* Acceso a Informe Semanal */}
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              aria-label="Informe Semanal"
              title="Informe y Resumen Semanal"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/40 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.15)] flex items-center justify-center text-[#D97757] dark:text-[#E28464] hover:opacity-80 active:scale-90 transition-all duration-200"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Ajustes del Sistema */}
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes de la aplicación"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/40 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.15)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/70 dark:hover:bg-white/10 active:scale-90 transition-all duration-200"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
