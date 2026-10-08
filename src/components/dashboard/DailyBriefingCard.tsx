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
    <article className="p-5 sm:p-6 rounded-3xl bg-[var(--glass-surface)] backdrop-blur-2xl backdrop-saturate-150 border border-[var(--glass-border)] shadow-[0_12px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.12)] relative overflow-hidden transition-all space-y-5">
      {/* 1. Cabecera Editorial con Jerarquía Apple Health / Fitness */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
              {effectiveRoutine.dayName} • Foco del Día
            </span>

            {effectiveRoutine.isOverridden && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/25">
                Sesión Adaptada ⚡
              </span>
            )}

            {selectedDiscomfortLevel && (
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border transition-colors ${
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
            className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight cursor-pointer hover:text-[#D97757] dark:hover:text-[#E28464] transition-colors leading-tight"
          >
            {effectiveRoutine.routine.title}
          </h2>
        </div>

        <button
          onClick={onOpenScheduleModal}
          aria-label="Cambiar o mover sesión de hoy"
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-white/50 dark:bg-white/[0.08] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.15)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/70 dark:hover:bg-white/12 transition-all flex items-center gap-1.5 apple-btn-spring"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757] dark:text-[#E28464]" />
          <span>Mover</span>
        </button>
      </div>

      {/* 2. Descripción de la sesión y Meta de Pasos estilo Apple Fitness */}
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
        {effectiveRoutine.routine.description}
      </p>

      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--glass-border-subtle)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <Footprints className="w-4 h-4 text-[#D97757] dark:text-[#E28464]" />
          <span>
            Meta de pasos:{' '}
            <strong className="text-[var(--text-primary)] font-mono data-tabular font-bold">
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

      {/* 3. Panel de Carga Articular Integrado (Sensor ACWR & KJSI al estilo Apple Health) */}
      <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              jointStrain.acwrZone === 'OPTIMAL'
                ? 'bg-emerald-500/15 text-emerald-500'
                : jointStrain.acwrZone === 'WARNING'
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-rose-500/15 text-rose-500'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Carga Articular ACWR
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] data-tabular font-medium">
                {jointStrain.acwr} • {jointStrain.acwrZone === 'OPTIMAL' ? 'Sweet Spot' : jointStrain.acwrZone}
              </span>
            </div>
            <p className="text-[10.5px] text-[var(--text-secondary)] line-clamp-1">
              {jointStrain.clinicalAdvice}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border data-tabular ${
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

      {/* 4. Selector de Sensaciones y Molestias (Escala Calibrada 1 a 6 con pastillas táctiles fluidas) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97757] dark:text-[#E28464]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Sensaciones de Rodilla
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
              {selectedDiscomfortLevel ? `(Nivel ${selectedDiscomfortLevel})` : '(Normal)'}
            </span>
          </div>

          {selectedDiscomfortLevel && (
            <button
              onClick={() => onSelectDiscomfortLevel(null)}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-rose-500 flex items-center gap-1 font-medium transition-colors active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          )}
        </div>

        {/* Barra de 6 pastillas táctiles fluidas estilo Apple Segmented Control */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {[
            { lvl: DiscomfortLevel.VERY_LIGHT, short: '1', title: 'Muy Leve', activeBg: 'bg-emerald-500 text-white shadow-emerald-500/30' },
            { lvl: DiscomfortLevel.LIGHT, short: '2', title: 'Leve', activeBg: 'bg-lime-600 text-white shadow-lime-600/30' },
            { lvl: DiscomfortLevel.MODERATE, short: '3', title: 'Media', activeBg: 'bg-amber-500 text-white shadow-amber-500/30' },
            { lvl: DiscomfortLevel.MODERATE_HIGH, short: '4', title: 'Media-Alta', activeBg: 'bg-orange-500 text-white shadow-orange-500/30' },
            { lvl: DiscomfortLevel.HIGH, short: '5', title: 'Alta', activeBg: 'bg-rose-500 text-white shadow-rose-500/30' },
            { lvl: DiscomfortLevel.INJURY, short: '6', title: 'Lesión', activeBg: 'bg-red-600 text-white shadow-red-600/35 animate-pulse' },
          ].map(({ lvl, short, title, activeBg }) => {
            const isSelected = selectedDiscomfortLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => onSelectDiscomfortLevel(isSelected ? null : lvl)}
                className={`py-2 sm:py-2.5 rounded-xl text-center text-xs font-mono font-bold apple-btn-spring border ${
                  isSelected
                    ? `${activeBg} border-transparent shadow-lg scale-[1.02]`
                    : 'bg-white/40 dark:bg-white/[0.04] text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[#D97757]/40 hover:text-[var(--text-primary)] hover:bg-white/60 dark:hover:bg-white/10'
                }`}
                title={`Nivel ${short}: ${title}`}
                aria-pressed={isSelected}
              >
                {short}
              </button>
            );
          })}
        </div>

        {/* Nota Proporcional de Adaptación sin dramatismo (Tarjeta Clínica Apple Health) */}
        {discomfortStrategy ? (
          <div className="p-3 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-[#D97757]/25 text-[11px] space-y-1.5 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D97757] dark:text-[#E28464]" />
                {(selectedDiscomfortLevel ?? 0) <= 2 ? 'Sin restricciones articulares' : 'Adaptación Proporcional Activa'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold data-tabular">
                {discomfortStrategy.training.volumeReductionPercent > 0
                  ? `-${discomfortStrategy.training.volumeReductionPercent}% volumen`
                  : '100% volumen normal'}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed text-[10.5px]">
              {discomfortStrategy.recommendationsMarkdown}
            </p>
          </div>
        ) : (
          <p className="text-[10.5px] text-[var(--text-tertiary)] px-0.5">
            Selecciona un nivel del 1 al 6 solo si notas molestias para calibrar la carga automáticamente.
          </p>
        )}
      </div>
    </article>
  );
};
