'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  Flame,
  Moon,
  Footprints,
  Plus,
  Minus,
  ArrowUpRight,
  Sparkles,
  Dumbbell,
  ArrowLeftRight,
  ChevronRight,
  CheckCircle2,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { DailyHealthMetric, StravaActivity } from '@/types/database';
import { CoachTurnResult } from '@/lib/coach/coachCore';
import { HeroVoiceButton } from '@/components/voice/HeroVoiceButton';
import { DynamicIslandCoach } from '@/components/dashboard/DynamicIslandCoach';
import { TabType } from '@/components/navigation/BottomNav';
import { DiscomfortLevel, DiscomfortManager, AdaptationStrategy } from '@/lib/discomfortManager';
import { assessJointStrain, DailyWorkloadSample } from '@/lib/biomechanics/jointStrainEngine';

// Carga diferida de modales pesados bajo demanda (reducción de bundle JS)
const ScheduleManagerModal = dynamic(
  () => import('@/components/schedule/ScheduleManagerModal').then((m) => m.ScheduleManagerModal),
  { ssr: false }
);
const CoachChat = dynamic(
  () => import('@/components/coach/CoachChat').then((m) => m.CoachChat),
  { ssr: false }
);

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

interface TodayViewProps {
  health: DailyHealthMetric | null;
  nutritionTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  latestActivity: StravaActivity | null;
  currentWeight?: number;
  onQuickAddWater: (amountMl: number) => void;
  onNavigateTab: (tab: TabType) => void;
  onSelectActivity: (activity: StravaActivity) => void;
  onOpenReport?: () => void;
  onReloadData?: () => void;
}

const TodayViewComponent: React.FC<TodayViewProps> = ({
  health,
  nutritionTotals,
  latestActivity,
  currentWeight = 101.0,
  onQuickAddWater,
  onNavigateTab,
  onSelectActivity,
  onOpenReport,
  onReloadData,
}) => {
  const { stepsGoal, steps, stepsPercent } = useMemo(() => {
    const goal = 10000;
    const currentSteps = health?.total_steps || 0;
    return {
      stepsGoal: goal,
      steps: currentSteps,
      stepsPercent: Math.min(100, Math.round((currentSteps / goal) * 100)),
    };
  }, [health?.total_steps]);

  const {
    caloriesTarget,
    caloriesConsumed,
    caloriesRemaining,
    caloriesPercent,
    proteinTarget,
    proteinConsumed,
    proteinPercent,
    waterGoal,
    waterPercent,
  } = useMemo(() => {
    const calTarget = 2400;
    const calConsumed = nutritionTotals.calories || 0;
    const pTarget = 202;
    const pConsumed = nutritionTotals.protein_g || 0;
    const wGoal = 3000;

    return {
      caloriesTarget: calTarget,
      caloriesConsumed: calConsumed,
      caloriesRemaining: Math.max(0, calTarget - calConsumed),
      caloriesPercent: Math.min(100, Math.round((calConsumed / calTarget) * 100)),
      proteinTarget: pTarget,
      proteinConsumed: pConsumed,
      proteinPercent: Math.min(100, Math.round((pConsumed / pTarget) * 100)),
      waterGoal: wGoal,
      waterPercent: Math.min(100, Math.round((nutritionTotals.water_ml / wGoal) * 100)),
    };
  }, [nutritionTotals.calories, nutritionTotals.protein_g, nutritionTotals.water_ml]);

  const restingHr = health?.resting_hr ? `${health.resting_hr}` : '--';
  const sleepHours = health?.sleep_duration_minutes
    ? (health.sleep_duration_minutes / 60).toFixed(1)
    : '--';
  const sleepScore = health?.sleep_score ? `${health.sleep_score}/100` : '--';

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [effectiveRoutine, setEffectiveRoutine] = useState<EffectiveRoutineItem | null>(null);
  const [coachStatusMessage, setCoachStatusMessage] = useState<string>(
    'Head Coach listo. Habla para registrar comidas o mover entrenos.'
  );
  const [showFullChatHistory, setShowFullChatHistory] = useState(false);
  const [selectedDiscomfortLevel, setSelectedDiscomfortLevel] = useState<DiscomfortLevel | null>(null);

  const discomfortStrategy: AdaptationStrategy | null = useMemo(() => {
    if (!selectedDiscomfortLevel) return null;
    return DiscomfortManager.evaluate({
      id: `disc-${Date.now()}`,
      userId: 'alvaro',
      bodyPartId: 'rodilla',
      level: selectedDiscomfortLevel,
      reportedAt: new Date(),
    });
  }, [selectedDiscomfortLevel]);

  // Monitor Biomecánico de Carga Articular (ACWR & KJSI)
  const jointStrain = useMemo(() => {
    const sampleToday: DailyWorkloadSample = {
      date: new Date().toISOString().split('T')[0],
      runningKm: latestActivity ? latestActivity.distance / 1000 : 0,
      gymVolumeKg: 2000,
      discomfortLevel: selectedDiscomfortLevel || 1,
    };
    return assessJointStrain([sampleToday], currentWeight, 168);
  }, [latestActivity, selectedDiscomfortLevel, currentWeight]);

  const fetchSchedule = () => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.schedule)) {
          const scheduleList = data.schedule as EffectiveRoutineItem[];
          const todaySched = scheduleList.find((s) => s.date === data.referenceDate);
          if (todaySched) setEffectiveRoutine(todaySched);
        }
      })
      .catch((err) => console.warn('Aviso cargando rutina de hoy:', err));
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleCoachTurnCompleted = (result: CoachTurnResult) => {
    fetchSchedule();
    if (result.replyText) {
      setCoachStatusMessage(result.replyText);
    }
    if (result.action === 'discomfort_report' && result.dataSummary?.report) {
      setSelectedDiscomfortLevel(result.dataSummary.report.level);
    }
    if (onReloadData) onReloadData();
  };

  const daysToMarathon = Math.max(
    0,
    Math.ceil((new Date('2027-02-28T09:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 px-3.5 pt-1 font-sans animate-in fade-in duration-300">
      {/* ================================================================ */}
      {/* 1. DYNAMIC ISLAND DEL COACH (FEEDBACK FLOTANTE EN TIEMPO REAL)     */}
      {/* ================================================================ */}
      <DynamicIslandCoach
        message={coachStatusMessage}
        subtext={`Meta: 21K Feb-2027 · ${currentWeight.toFixed(1)} kg`}
        discomfortLevel={selectedDiscomfortLevel}
        activeAdaptation={discomfortStrategy?.recommendationsMarkdown || discomfortStrategy?.training.warmupNote}
      />

      {/* ================================================================ */}
      {/* 2. HERO DEL DÍA: SESIÓN PRINCIPAL DE HOY (LIQUID GLASS)          */}
      {/* ================================================================ */}
      {effectiveRoutine && (
        <section className="relative overflow-hidden p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="cursor-pointer flex-1" onClick={() => onNavigateTab('entreno')}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
                  {effectiveRoutine.dayName} • Sesión de Hoy
                </span>
                {effectiveRoutine.isOverridden && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/25">
                    Adaptada ⚡
                  </span>
                )}
                {selectedDiscomfortLevel && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    selectedDiscomfortLevel === 6
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
                      : selectedDiscomfortLevel >= 4
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                  }`}>
                    Nivel {selectedDiscomfortLevel}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mt-1.5 editorial-heading">
                {effectiveRoutine.routine.title}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2">
                {effectiveRoutine.routine.description}
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              aria-label="Cambiar o mover sesión de hoy"
              className="shrink-0 px-3 py-1.5 rounded-full liquid-glass-pill text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Mover</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3.5 border-t border-[var(--glass-border)] text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span>
                Meta pasos:{' '}
                <strong className="text-[var(--text-primary)] font-mono data-tabular">
                  {effectiveRoutine.routine.targetSteps.min.toLocaleString()} – {effectiveRoutine.routine.targetSteps.max.toLocaleString()}
                </strong>
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('entreno')}
              className="text-[11px] font-semibold text-[#D97757] dark:text-[#E28464] flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            >
              <span>Ver entreno</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* 2.1 CHECK-IN DE SENSACIONES Y GRADUACIÓN DE MOLESTIAS (P1.1)      */}
      {/* Escala 1 a 6 sin hiperfoco ni dramatismo                         */}
      {/* ================================================================ */}
      <section className="p-3.5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-[#D97757]/15 text-[#D97757] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[var(--text-primary)]">
                Check-in de Sensaciones
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] ml-1.5 font-normal">
                {selectedDiscomfortLevel ? `Nivel ${selectedDiscomfortLevel}` : 'Normal / Sin molestias'}
              </span>
            </div>
          </div>
          {selectedDiscomfortLevel && (
            <button
              onClick={async () => {
                setSelectedDiscomfortLevel(null);
                try {
                  await fetch('/api/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'reset_day',
                      date: effectiveRoutine?.date || new Date().toISOString().split('T')[0],
                    }),
                  });
                  fetchSchedule();
                  setCoachStatusMessage('Molestia resuelta. Sesión restablecida al 100%.');
                } catch (err) {
                  console.warn('Aviso restableciendo rutina:', err);
                }
              }}
              className="text-[10px] text-[var(--text-tertiary)] hover:text-rose-500 font-medium transition-colors"
            >
              Restablecer
            </button>
          )}
        </div>

        {/* Fila de 6 botones numéricos graduados */}
        <div className="grid grid-cols-6 gap-1.5 pt-0.5">
          {[
            { lvl: DiscomfortLevel.VERY_LIGHT, label: '1. Muy Leve', color: 'hover:border-emerald-500 text-emerald-600 dark:text-emerald-400' },
            { lvl: DiscomfortLevel.LIGHT, label: '2. Leve', color: 'hover:border-lime-500 text-lime-600 dark:text-lime-400' },
            { lvl: DiscomfortLevel.MODERATE, label: '3. Media', color: 'hover:border-amber-500 text-amber-600 dark:text-amber-400' },
            { lvl: DiscomfortLevel.MODERATE_HIGH, label: '4. Media-Alta', color: 'hover:border-orange-500 text-orange-600 dark:text-orange-400' },
            { lvl: DiscomfortLevel.HIGH, label: '5. Alta', color: 'hover:border-rose-500 text-rose-600 dark:text-rose-400' },
            { lvl: DiscomfortLevel.INJURY, label: '6. Lesión', color: 'hover:border-red-600 text-red-600 dark:text-red-400' },
          ].map(({ lvl, label, color }) => {
            const isSelected = selectedDiscomfortLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={async () => {
                  const nextLvl = isSelected ? null : lvl;
                  setSelectedDiscomfortLevel(nextLvl);
                  if (nextLvl) {
                    const strategy = DiscomfortManager.evaluate({
                      id: `disc-${Date.now()}`,
                      userId: 'alvaro-main',
                      bodyPartId: 'rodilla',
                      level: nextLvl,
                      reportedAt: new Date(),
                    });
                    setCoachStatusMessage(strategy.recommendationsMarkdown);

                    try {
                      const res = await fetch('/api/coach/message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: `tengo molestia nivel ${nextLvl} en la rodilla`,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        fetchSchedule();
                        if (data.replyText) setCoachStatusMessage(data.replyText);
                      }
                    } catch (err) {
                      console.warn('Aviso sincronizando molestia:', err);
                    }
                  } else {
                    try {
                      await fetch('/api/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'reset_day',
                          date: effectiveRoutine?.date || new Date().toISOString().split('T')[0],
                        }),
                      });
                      fetchSchedule();
                      setCoachStatusMessage('Molestia resuelta. Sesión restablecida al 100%.');
                    } catch (err) {
                      console.warn('Aviso restableciendo rutina:', err);
                    }
                  }
                }}
                className={`py-1.5 px-1 rounded-xl text-center text-xs font-mono font-bold transition-all active:scale-95 border ${
                  isSelected
                    ? 'bg-[#D97757] text-white border-[#D97757] shadow-sm'
                    : `liquid-glass-pill text-[var(--text-secondary)] border-[var(--glass-border)] ${color}`
                }`}
                title={label}
              >
                {lvl}
              </button>
            );
          })}
        </div>

        {/* Explicación sutil y proporcional según nivel */}
        {discomfortStrategy ? (
          <div className="p-2.5 rounded-2xl liquid-glass-pill text-[11px] space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)]">
                {(selectedDiscomfortLevel ?? 0) <= 2 ? '⚡ Sin restricciones' : '⚡ Adaptación Proporcional'}
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
            {discomfortStrategy.training.warmupNote && (
              <p className="text-[10px] text-[var(--text-tertiary)] italic pt-0.5">
                Tip: {discomfortStrategy.training.warmupNote}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-[var(--text-tertiary)] px-0.5">
            Selecciona un nivel del 1 al 6 solo si notas alguna incomodidad para adaptar el entreno sin alarmismos.
          </p>
        )}
      </section>

      {/* ================================================================ */}
      {/* 2.2 MONITOR BIOMECÁNICO ACWR & KNEE JOINT STRAIN (P2.2)          */}
      {/* ================================================================ */}
      <section className="p-3.5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${
              jointStrain.acwrZone === 'OPTIMAL' ? 'bg-emerald-500/15 text-emerald-500' :
              jointStrain.acwrZone === 'WARNING' ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500'
            }`}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[var(--text-primary)]">
                Carga Articular ACWR & KJSI
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] ml-1.5 font-mono">
                Ratio: {jointStrain.acwr} • {jointStrain.acwrZone === 'OPTIMAL' ? 'Sweet Spot' : jointStrain.acwrZone}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
            jointStrain.kneeStatus === 'PROTECTED'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : jointStrain.kneeStatus === 'LOADED'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            KJSI: {jointStrain.kjsi}/100
          </span>
        </div>

        <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
          {jointStrain.clinicalAdvice}
        </p>
      </section>

      {/* ================================================================ */}
      {/* 3. HERO VOICE BUTTON (VOICE-FIRST INTERACTION PROTAGÓNICA)       */}
      {/* ================================================================ */}
      <section className="py-2">
        <HeroVoiceButton
          onStatusChange={(status) => setCoachStatusMessage(status)}
          onSuccessResult={handleCoachTurnCompleted}
        />
      </section>

      {/* ================================================================ */}
      {/* 4. TARJETAS DE PROGRESO BIOMÉTRICO (APPLE & ANTHROPIC AESTHETIC) */}
      {/* ================================================================ */}
      <section className="grid grid-cols-2 gap-3">
        {/* Calorías Restantes */}
        <div
          onClick={() => onNavigateTab('dieta')}
          className="p-4 rounded-3xl liquid-glass-card cursor-pointer hover:border-[#D97757]/40 active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase editorial-heading">
              Calorías
            </span>
            <div className="w-6 h-6 rounded-full bg-[#D97757]/15 flex items-center justify-center text-[#D97757]">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--text-primary)] editorial-heading data-tabular flex items-baseline gap-1">
              {caloriesConsumed}
              <span className="text-xs font-normal text-[var(--text-tertiary)] font-sans">/ {caloriesTarget}</span>
            </div>
            <p className="text-[11px] text-[#D97757] dark:text-[#E28464] font-medium mt-0.5">
              {caloriesRemaining > 0 ? `${caloriesRemaining} kcal restantes` : 'Límite completado'}
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-[#D97757] dark:bg-[#E28464] h-full rounded-full transition-all duration-500"
                style={{ width: `${caloriesPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Proteína Real */}
        <div
          onClick={() => onNavigateTab('dieta')}
          className="p-4 rounded-3xl liquid-glass-card cursor-pointer hover:border-emerald-500/40 active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase editorial-heading">
              Proteína
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono data-tabular">
              {proteinPercent}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--text-primary)] editorial-heading data-tabular flex items-baseline gap-1">
              {proteinConsumed.toFixed(0)}
              <span className="text-xs font-normal text-[var(--text-tertiary)] font-sans">/ {proteinTarget}g</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {proteinConsumed >= proteinTarget
                ? 'Meta cubierta'
                : `${(proteinTarget - proteinConsumed).toFixed(1)}g restantes`}
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hidratación Rápida */}
        <div className="p-4 rounded-3xl liquid-glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase editorial-heading">
              Agua
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQuickAddWater(-250)}
                aria-label="Restar 250ml de agua"
                className="p-1 rounded-full liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onQuickAddWater(250)}
                aria-label="Añadir 250ml de agua"
                className="p-1 rounded-full bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-all active:scale-90"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--text-primary)] editorial-heading data-tabular flex items-baseline gap-1">
              {((nutritionTotals.water_ml || 0) / 1000).toFixed(1)}
              <span className="text-xs font-normal text-[var(--text-tertiary)] font-sans">/ 3.0 L</span>
            </div>
            <p className="text-[11px] text-blue-500 font-medium mt-0.5">
              {nutritionTotals.water_ml} ml hoy
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sueño / Fit3 */}
        <div
          onClick={() => onNavigateTab('salud')}
          className="p-4 rounded-3xl liquid-glass-card cursor-pointer hover:border-indigo-500/40 active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase editorial-heading">
              Sueño
            </span>
            <div className="w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-500">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--text-primary)] editorial-heading data-tabular flex items-baseline gap-1">
              {sleepHours}
              <span className="text-xs font-normal text-[var(--text-tertiary)] font-sans">horas</span>
            </div>
            <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
              Score: {sleepScore}
            </p>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-2 flex items-center justify-between">
              <span className="font-mono data-tabular">FC: {restingHr} bpm</span>
              <span className="text-indigo-500 font-medium">Fit3 &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. HISTORIAL EXTENDIDO DEL CHAT (PLEGABLE / A DEMANDA)           */}
      {/* ================================================================ */}
      <section className="pt-1">
        <button
          onClick={() => setShowFullChatHistory(!showFullChatHistory)}
          className="w-full py-2.5 px-4 rounded-2xl liquid-glass-pill flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-98"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#D97757]" />
            <span>{showFullChatHistory ? 'Ocultar diálogo del Coach' : 'Ver historial de conversación'}</span>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showFullChatHistory ? 'rotate-90' : ''}`} />
        </button>

        {showFullChatHistory && (
          <div className="mt-3 animate-in fade-in duration-200">
            <CoachChat onTurnCompleted={handleCoachTurnCompleted} />
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* 6. ACCESO AL INFORME SEMANAL & CUENTA ATRÁS 21K                  */}
      {/* ================================================================ */}
      <section className="space-y-3 pt-1">
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="w-full p-4 rounded-3xl liquid-glass-card hover:border-amber-500/40 flex items-center justify-between text-left active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-500 transition-colors">
                  Informe Semanal de Rendimiento
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Telemetría real auditada, diagnóstico de rodilla y PDF
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}

        <div className="p-3.5 rounded-2xl liquid-glass-pill flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
          <div className="flex items-center gap-2">
            <span>🏁</span>
            <span>Media Maratón 28 Feb 2027</span>
          </div>
          <span className="font-mono text-[var(--text-primary)] font-bold">
            Faltan {daysToMarathon} días
          </span>
        </div>
      </section>

      {/* Modal Modular de Calendario */}
      <ScheduleManagerModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleUpdated={fetchSchedule}
      />
    </div>
  );
};

export const TodayView = memo(TodayViewComponent);
