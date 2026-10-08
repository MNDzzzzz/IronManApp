'use client';

import React, { useMemo } from 'react';
import { Flame, Droplets, Dumbbell, Plus, Minus, ArrowUpRight } from 'lucide-react';

interface BiometricRingsHubProps {
  nutritionTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  onQuickAddWater: (amountMl: number) => void;
  onNavigateToDiet: () => void;
}

/**
 * Componente BiometricRingsHub
 * Inspirado en los Activity Rings de Apple Fitness y la tipografía editorial de Anthropic Claude.
 * Visualiza Calorías, Proteína e Hidratación con 3 anillos concéntricos SVG y datos tabulares de alta precisión.
 */
export const BiometricRingsHub: React.FC<BiometricRingsHubProps> = ({
  nutritionTotals,
  onQuickAddWater,
  onNavigateToDiet,
}) => {
  // Metas nutricionales
  const calTarget = 2400;
  const pTarget = 202;
  const wGoal = 3000;

  const calConsumed = nutritionTotals.calories || 0;
  const pConsumed = nutritionTotals.protein_g || 0;
  const wConsumed = nutritionTotals.water_ml || 0;

  const calRemaining = Math.max(0, calTarget - calConsumed);
  const pRemaining = Math.max(0, pTarget - pConsumed);

  // Porcentajes de completitud normalizados (0 a 100)
  const calPercent = Math.min(100, Math.round((calConsumed / calTarget) * 100));
  const pPercent = Math.min(100, Math.round((pConsumed / pTarget) * 100));
  const wPercent = Math.min(100, Math.round((wConsumed / wGoal) * 100));

  // Geometría de los anillos SVG concéntricos (Centro: 90, 90)
  const rings = useMemo(() => {
    const size = 180;
    const center = 90;
    const strokeWidth = 10;

    // Anillo 1: Calorías (Exterior) - Radio 72
    const rCal = 72;
    const circCal = 2 * Math.PI * rCal;
    const offsetCal = circCal - (calPercent / 100) * circCal;

    // Anillo 2: Proteína (Medio) - Radio 56
    const rProt = 56;
    const circProt = 2 * Math.PI * rProt;
    const offsetProt = circProt - (pPercent / 100) * circProt;

    // Anillo 3: Agua (Interior) - Radio 40
    const rWater = 40;
    const circWater = 2 * Math.PI * rWater;
    const offsetWater = circWater - (wPercent / 100) * circWater;

    return {
      size,
      center,
      strokeWidth,
      rCal,
      circCal,
      offsetCal,
      rProt,
      circProt,
      offsetProt,
      rWater,
      circWater,
      offsetWater,
    };
  }, [calPercent, pPercent, wPercent]);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[var(--glass-surface)] backdrop-blur-2xl backdrop-saturate-150 border border-[var(--glass-border)] shadow-[0_12px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.12)] relative overflow-hidden transition-all">
      {/* Cabecera de Sección al estilo Apple Health */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
            Nutrición & Balance
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
        </div>
        <button
          onClick={onNavigateToDiet}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors touch-manipulation apple-pressable active:scale-[0.97]"
          title="Ver registro completo de comidas"
        >
          <span>Dieta completa</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#D97757] dark:text-[#E28464]" />
        </button>
      </div>

      {/* Cuerpo Principal: Anillos concéntricos Apple Fitness + Desglose tabular Apple Health */}
      <div className="flex flex-col items-center gap-5">
        {/* Gráfico SVG de Anillos de Actividad Concéntricos con Gradientes Semánticos Apple */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={rings.size}
            height={rings.size}
            viewBox="0 0 180 180"
            className="rotate-[-90deg] drop-shadow-lg"
          >
            {/* Definiciones de Gradientes Semánticos Apple Fitness */}
            <defs>
              {/* Anillo Move / Calorías: Terracota a Coral Luminoso */}
              <linearGradient id="appleMoveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0533C" />
                <stop offset="60%" stopColor="#D97757" />
                <stop offset="100%" stopColor="#FF7E5F" />
              </linearGradient>

              {/* Anillo Exercise / Proteína: Esmeralda a Menta Viva */}
              <linearGradient id="appleExerciseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="70%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>

              {/* Anillo Stand / Agua: Azul Océano a Celeste Eléctrico */}
              <linearGradient id="appleStandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="60%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            {/* Pistas de Fondo con alta transmitancia OLED */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rCal}
              fill="none"
              stroke="rgba(224, 83, 60, 0.16)"
              strokeWidth={rings.strokeWidth}
            />
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rProt}
              fill="none"
              stroke="rgba(16, 185, 129, 0.16)"
              strokeWidth={rings.strokeWidth}
            />
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rWater}
              fill="none"
              stroke="rgba(2, 132, 199, 0.16)"
              strokeWidth={rings.strokeWidth}
            />

            {/* Anillo de Calorías (Move / Terracotta Apple) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rCal}
              fill="none"
              stroke="url(#appleMoveGrad)"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circCal}
              strokeDashoffset={rings.offsetCal}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Anillo de Proteína (Exercise / Emerald Apple) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rProt}
              fill="none"
              stroke="url(#appleExerciseGrad)"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circProt}
              strokeDashoffset={rings.offsetProt}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Anillo de Agua (Stand / Blue Apple) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rWater}
              fill="none"
              stroke="url(#appleStandGrad)"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circWater}
              strokeDashoffset={rings.offsetWater}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Núcleo Central: Porcentaje Calórico con Tipografía SF Pro Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-2xl sm:text-3xl font-bold font-mono data-tabular text-[var(--text-primary)] apple-title tracking-tight">
              {calPercent}%
            </span>
            <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
              Meta Diaria
            </span>
          </div>
        </div>

        {/* Columna de Datos Tabulares al estilo Apple Health */}
        <div className="flex-1 w-full space-y-2.5">
          {/* Fila 1: Calorías (Move) */}
          <div className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E0533C]/15 text-[#E0533C] flex items-center justify-center shrink-0 shadow-inner">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Calorías
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular apple-title tracking-tight">
                  {calConsumed.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / {calTarget.toLocaleString()} kcal
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold text-[#D97757] dark:text-[#E28464] data-tabular">
                {calRemaining > 0 ? `-${calRemaining}` : '✓ Cubierto'}
              </span>
              <p className="text-[9px] text-[var(--text-tertiary)] font-medium">
                {calRemaining > 0 ? 'kcal restantes' : 'completado'}
              </p>
            </div>
          </div>

          {/* Fila 2: Proteína (Exercise) */}
          <div className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Proteína
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular apple-title tracking-tight">
                  {pConsumed.toFixed(0)}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / {pTarget} g
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 data-tabular">
                {pConsumed >= pTarget ? '100% ✓' : `${pPercent}%`}
              </span>
              <p className="text-[9px] text-[var(--text-tertiary)] font-medium">
                {pRemaining > 0 ? `${pRemaining.toFixed(0)}g rest.` : 'óptima'}
              </p>
            </div>
          </div>

          {/* Fila 3: Agua / Hidratación (Stand) con Píldoras Táctiles Rápidas */}
          <div className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 shadow-inner">
                <Droplets className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Agua
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular apple-title tracking-tight">
                  {(wConsumed / 1000).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / 3.0 L
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onQuickAddWater(-250)}
                aria-label="Restar 250ml de agua"
                className="w-7 h-7 rounded-xl bg-white/50 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all touch-manipulation apple-pressable apple-btn-spring active:scale-[0.92] shadow-sm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onQuickAddWater(250)}
                aria-label="Añadir 250ml de agua"
                className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25 text-xs font-mono font-bold flex items-center gap-1 transition-all touch-manipulation apple-pressable apple-btn-spring active:scale-[0.92] border border-sky-500/20 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>250ml</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
