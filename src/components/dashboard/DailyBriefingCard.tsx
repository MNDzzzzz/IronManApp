'use client';

import React from 'react';
import {
  Footprints,
  ArrowLeftRight,
  ChevronRight,
  Sparkles,
  Activity,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { DiscomfortLevel, DiscomfortManager, AdaptationStrategy } from '@/lib/discomfortManager';
import { JointStrainAssessment } from '@/lib/biomechanics/jointStrainEngine';

export interface EffectiveRoutineItem {
  date: string;
  dayName: string;
  isOverridden?: boolean;
  routine: {
    title: string;
    description: string;
    category: string;
    targetSteps: { min: number; max: number };
  };
}

interface DailyBriefingCardProps {
  effectiveRoutine: EffectiveRoutineItem | null;
  jointStrain: JointStrainAssessment;
  selectedDiscomfortLevel: DiscomfortLevel | null;
  discomfortStrategy: AdaptationStrategy | null;
  onSelectDiscomfortLevel: (level: DiscomfortLevel | null) => void;
  onOpenScheduleModal: () => void;
  onNavigateToWorkout: () => void;
}

/**
 * Componente DailyBriefingCard
 * Tarjeta de Foco Diario / Morning Briefing editorial al estilo Anthropic Claude y Apple visionOS.
 * Integra la sesión activa del día, la monitorización articular ACWR & KJSI y el check-in de sensaciones graduado.
 */
export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  effectiveRoutine,
  jointStrain,
  selectedDiscomfortLevel,
  discomfortStrategy,
  onSelectDiscomfortLevel,
  onOpenScheduleModal,
  onNavigateToWorkout,
}) => {
  if (!effectiveRoutine) return null;

  return (
    <article className="p-5 sm:p-6 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl relative overflow-hidden transition-all space-y-5">
      {/* 1. Cabecera Editorial y Acciones Rápidas */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
              {effectiveRoutine.dayName} • Foco del Día
            </span>

            {effectiveRoutine.isOverridden && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/25">
                Sesión Adaptada ⚡
              </span>
            )}

            {selectedDiscomfortLevel && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  selectedDiscomfortLevel === 6
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
                    : selectedDiscomfortLevel >= 4
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                }`}
              >
                Molestia Nivel {selectedDiscomfortLevel}
              </span>
            )}
          </div>

          <h2
            onClick={onNavigateToWorkout}
            className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight cursor-pointer hover:text-[#D97757] transition-colors editorial-heading"
          >
            {effectiveRoutine.routine.title}
          </h2>
        </div>

        <button
          onClick={onOpenScheduleModal}
          aria-label="Cambiar o mover sesión de hoy"
          className="shrink-0 px-3 py-1.5 rounded-full liquid-glass-pill text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757]" />
          <span>Mover</span>
        </button>
      </div>

      {/* 2. Descripción de la sesión y Meta de Pasos */}
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
        {effectiveRoutine.routine.description}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border-subtle)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <Footprints className="w-4 h-4 text-[#D97757]" />
          <span>
            Meta de pasos:{' '}
            <strong className="text-[var(--text-primary)] font-mono data-tabular">
              {effectiveRoutine.routine.targetSteps.min.toLocaleString()} –{' '}
              {effectiveRoutine.routine.targetSteps.max.toLocaleString()}
            </strong>
          </span>
        </div>

        <button
          onClick={onNavigateToWorkout}
          className="text-xs font-semibold text-[#D97757] dark:text-[#E28464] flex items-center gap-0.5 hover:opacity-80 transition-opacity"
        >
          <span>Ir al entreno</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Panel de Carga Articular Integrado (ACWR & KJSI) */}
      <div className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              jointStrain.acwrZone === 'OPTIMAL'
                ? 'bg-emerald-500/15 text-emerald-500'
                : jointStrain.acwrZone === 'WARNING'
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-rose-500/15 text-rose-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Carga Articular ACWR
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {jointStrain.acwr} • {jointStrain.acwrZone === 'OPTIMAL' ? 'Sweet Spot' : jointStrain.acwrZone}
              </span>
            </div>
            <p className="text-[10.5px] text-[var(--text-secondary)] line-clamp-1">
              {jointStrain.clinicalAdvice}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
            jointStrain.kneeStatus === 'PROTECTED'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : jointStrain.kneeStatus === 'LOADED'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          KJSI: {jointStrain.kjsi}/100
        </span>
      </div>

      {/* 4. Selector de Sensaciones y Molestias (Escala Calibrada 1 a 6) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Sensaciones de Rodilla
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {selectedDiscomfortLevel ? `(Nivel ${selectedDiscomfortLevel})` : '(Normal)'}
            </span>
          </div>

          {selectedDiscomfortLevel && (
            <button
              onClick={() => onSelectDiscomfortLevel(null)}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-rose-500 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          )}
        </div>

        {/* Barra de 6 pastillas táctiles fluidas */}
        <div className="grid grid-cols-6 gap-1.5">
          {[
            { lvl: DiscomfortLevel.VERY_LIGHT, short: '1', title: 'Muy Leve', border: 'border-emerald-500/30' },
            { lvl: DiscomfortLevel.LIGHT, short: '2', title: 'Leve', border: 'border-lime-500/30' },
            { lvl: DiscomfortLevel.MODERATE, short: '3', title: 'Media', border: 'border-amber-500/30' },
            { lvl: DiscomfortLevel.MODERATE_HIGH, short: '4', title: 'Media-Alta', border: 'border-orange-500/30' },
            { lvl: DiscomfortLevel.HIGH, short: '5', title: 'Alta', border: 'border-rose-500/30' },
            { lvl: DiscomfortLevel.INJURY, short: '6', title: 'Lesión', border: 'border-red-600/30' },
          ].map(({ lvl, short, title }) => {
            const isSelected = selectedDiscomfortLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => onSelectDiscomfortLevel(isSelected ? null : lvl)}
                className={`py-1.5 rounded-xl text-center text-xs font-mono font-bold transition-all active:scale-95 border ${
                  isSelected
                    ? 'bg-[#D97757] text-white border-[#D97757] shadow-md shadow-[#D97757]/20'
                    : 'liquid-glass-pill text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[#D97757]/40'
                }`}
                title={`Nivel ${short}: ${title}`}
              >
                {short}
              </button>
            );
          })}
        </div>

        {/* Nota Proporcional de Adaptación sin dramatismo */}
        {discomfortStrategy ? (
          <div className="p-2.5 rounded-2xl liquid-glass-pill text-[11px] space-y-1 animate-in fade-in duration-200 border border-[#D97757]/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D97757]" />
                {(selectedDiscomfortLevel ?? 0) <= 2 ? 'Sin restricciones' : 'Adaptación Proporcional'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {discomfortStrategy.training.volumeReductionPercent > 0
                  ? `-${discomfortStrategy.training.volumeReductionPercent}% vol`
                  : '100% volumen'}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed text-[10.5px]">
              {discomfortStrategy.recommendationsMarkdown}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-[var(--text-tertiary)] px-0.5">
            Selecciona un nivel del 1 al 6 solo si notas molestias para calibrar la carga automáticamente.
          </p>
        )}
      </div>
    </article>
  );
};
