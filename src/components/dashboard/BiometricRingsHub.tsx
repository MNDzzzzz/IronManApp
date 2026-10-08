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
    <div className="p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl relative overflow-hidden transition-all">
      {/* Cabecera de Sección */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
            Nutrición & Balance
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <button
          onClick={onNavigateToDiet}
          className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
          title="Ver registro completo de comidas"
        >
          <span>Dieta completa</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#D97757]" />
        </button>
      </div>

      {/* Cuerpo Principal: Anillos concéntricos Apple Fitness centrados + Desglose tabular debajo */}
      <div className="flex flex-col items-center gap-5">
        {/* Gráfico SVG de Anillos de Actividad Concéntricos */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={rings.size}
            height={rings.size}
            viewBox="0 0 180 180"
            className="rotate-[-90deg] drop-shadow-md"
          >
            {/* Pistas de Fondo (Faint background tracks) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rCal}
              fill="none"
              stroke="rgba(217, 119, 87, 0.15)"
              strokeWidth={rings.strokeWidth}
            />
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rProt}
              fill="none"
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth={rings.strokeWidth}
            />
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rWater}
              fill="none"
              stroke="rgba(59, 130, 246, 0.15)"
              strokeWidth={rings.strokeWidth}
            />

            {/* Anillo de Calorías (Terracotta) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rCal}
              fill="none"
              stroke="#D97757"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circCal}
              strokeDashoffset={rings.offsetCal}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Anillo de Proteína (Emerald) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rProt}
              fill="none"
              stroke="#10B981"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circProt}
              strokeDashoffset={rings.offsetProt}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Anillo de Agua (Sky Blue) */}
            <circle
              cx={rings.center}
              cy={rings.center}
              r={rings.rWater}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={rings.strokeWidth}
              strokeDasharray={rings.circWater}
              strokeDashoffset={rings.offsetWater}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Núcleo Central: Porcentaje Calórico */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold font-mono data-tabular text-[var(--text-primary)]">
              {calPercent}%
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
              Meta
            </span>
          </div>
        </div>

        {/* Columna de Datos Tabulares */}
        <div className="flex-1 w-full space-y-3">
          {/* Fila 1: Calorías */}
          <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#D97757]/15 text-[#D97757] flex items-center justify-center">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Calorías
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular">
                  {calConsumed.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / {calTarget.toLocaleString()} kcal
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-[#D97757] data-tabular">
                {calRemaining > 0 ? `-${calRemaining}` : '✓ Límite'}
              </span>
              <p className="text-[9px] text-[var(--text-tertiary)]">
                {calRemaining > 0 ? 'kcal rest.' : 'completado'}
              </p>
            </div>
          </div>

          {/* Fila 2: Proteína */}
          <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Proteína
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular">
                  {pConsumed.toFixed(0)}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / {pTarget} g
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 data-tabular">
                {pConsumed >= pTarget ? '100% ✓' : `${pPercent}%`}
              </span>
              <p className="text-[9px] text-[var(--text-tertiary)]">
                {pRemaining > 0 ? `${pRemaining.toFixed(0)}g rest.` : 'cubierta'}
              </p>
            </div>
          </div>

          {/* Fila 3: Agua / Hidratación con Quick-Add */}
          <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Agua
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono data-tabular">
                  {(wConsumed / 1000).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">
                    / 3.0 L
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onQuickAddWater(-250)}
                aria-label="Restar 250ml de agua"
                className="w-6 h-6 rounded-lg liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all active:scale-90"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onQuickAddWater(250)}
                aria-label="Añadir 250ml de agua"
                className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 text-xs font-mono font-bold flex items-center gap-0.5 transition-all active:scale-90"
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
