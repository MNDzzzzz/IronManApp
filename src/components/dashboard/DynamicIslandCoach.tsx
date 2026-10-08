'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Bot, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { DiscomfortLevel } from '@/lib/discomfortManager';

export interface DynamicIslandCoachProps {
  message: string;
  subtext?: string;
  statusType?: 'info' | 'success' | 'warning' | 'alert' | 'danger';
  discomfortLevel?: DiscomfortLevel | number | null;
  activeAdaptation?: string;
}

interface LevelBadgeConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  protocolHint: string;
}

function getLevelBadgeConfig(level: number): LevelBadgeConfig {
  switch (level) {
    case 1:
      return {
        label: 'Nivel 1 • Preventivo',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        borderClass: 'border-emerald-500/30',
        protocolHint: 'Calentamiento dinámico extra (+5-7 min) · 100% volumen',
      };
    case 2:
      return {
        label: 'Nivel 2 • CaCo (-18%)',
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-500/30',
        protocolHint: 'Método CaCo suave 4:1 · Isométricos Wall-sit 2x30s · +100ml agua',
      };
    case 3:
      return {
        label: 'Nivel 3 • Isométricos (-35%)',
        bgClass: 'bg-orange-500/15',
        textClass: 'text-orange-600 dark:text-orange-400',
        borderClass: 'border-orange-500/30',
        protocolHint: 'Sustitución por prensa 0-70° y Wall-sit 4x45s · Evitar flexión profunda >90° · +250ml agua',
      };
    case 4:
      return {
        label: 'Nivel 4 • Sin Impacto (-60%)',
        bgClass: 'bg-orange-600/20',
        textClass: 'text-orange-600 dark:text-orange-400',
        borderClass: 'border-orange-600/35',
        protocolHint: 'Impacto suspendido · Bici estática sillín alto / Elíptica · Suplementación antiinflamatoria · +500ml agua',
      };
    case 5:
      return {
        label: 'Nivel 5 • Descanso Zona',
        bgClass: 'bg-rose-500/20',
        textClass: 'text-rose-600 dark:text-rose-400',
        borderClass: 'border-rose-500/40',
        protocolHint: 'Descarga total del segmento afectado · Mantener tren opuesto/core · Refuerzo proteico (+10%) · +750ml agua',
      };
    case 6:
      return {
        label: '🚨 Nivel 6 • ALERTA LESIÓN',
        bgClass: 'bg-red-600/25 animate-pulse',
        textClass: 'text-red-600 dark:text-red-400',
        borderClass: 'border-red-500/60',
        protocolHint: 'Cese total de carga · Protocolo PEACE & LOVE / RICE · Valoración médica urgente · +1000ml agua',
      };
    default:
      return {
        label: `Nivel ${level}`,
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-500',
        borderClass: 'border-amber-500/30',
        protocolHint: 'Pauta articular adaptada',
      };
  }
}

export const DynamicIslandCoach: React.FC<DynamicIslandCoachProps> = ({
  message,
  subtext = 'Head Coach Multimodal',
  statusType = 'info',
  discomfortLevel = null,
  activeAdaptation,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeLevel = discomfortLevel && discomfortLevel > 0 ? Number(discomfortLevel) : null;
  const badgeConfig = activeLevel ? getLevelBadgeConfig(activeLevel) : null;

  return (
    <section
      role="status"
      aria-live="polite"
      className="w-full max-w-xl mx-auto my-2 px-1"
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full cursor-pointer liquid-glass-pill px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-300 hover:border-[#D97757]/40 active:scale-[0.99] ${
          activeLevel === 6 ? 'border-red-500/50 shadow-sm shadow-red-500/20' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
          <div
            className={`p-1.5 rounded-full shrink-0 ${
              activeLevel && activeLevel >= 5
                ? 'bg-rose-500/20 text-rose-500'
                : activeLevel && activeLevel >= 3
                ? 'bg-orange-500/20 text-orange-500'
                : activeLevel && activeLevel >= 1
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-[#D97757]/15 text-[#D97757] dark:text-[#E28464]'
            }`}
          >
            {activeLevel && activeLevel >= 6 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce" />
            ) : activeLevel && activeLevel >= 3 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
            ) : activeLevel ? (
              <Activity className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {message}
              </p>
              {badgeConfig && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${badgeConfig.bgClass} ${badgeConfig.textClass} ${badgeConfig.borderClass}`}
                >
                  {badgeConfig.label}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
              {subtext}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Contraer aviso del Coach' : 'Expandir aviso del Coach'}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0 p-1"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Contenido expandido suavemente */}
      {isExpanded && (
        <div className="mt-2 p-4 rounded-2xl liquid-glass-card text-xs text-[var(--text-secondary)] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-[var(--text-primary)] font-semibold text-xs">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#D97757]" />
              <span>Indicación Completa del Coach</span>
            </div>
            {badgeConfig && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeConfig.bgClass} ${badgeConfig.textClass} ${badgeConfig.borderClass}`}
              >
                {badgeConfig.label}
              </span>
            )}
          </div>

          <p className="leading-relaxed text-[var(--text-primary)]">
            {message}
          </p>

          {/* Bloque especial de adaptación articular si hay nivel activo */}
          {activeLevel && badgeConfig && (
            <div
              className={`p-3 rounded-xl border space-y-1.5 ${
                activeLevel === 6
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Pauta de Blindaje Biomecánico:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {activeAdaptation || badgeConfig.protocolHint}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Objetivo: Media Maratón (28-Feb-2027)</span>
            <span>Blindaje Articular Z2</span>
          </div>
        </div>
      )}
    </section>
  );
};
