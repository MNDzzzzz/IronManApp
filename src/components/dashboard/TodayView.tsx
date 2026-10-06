'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { DailyHealthMetric, StravaActivity } from '@/types/database';
import { ScheduleManagerModal } from '@/components/schedule/ScheduleManagerModal';
import { CoachChat } from '@/components/coach/CoachChat';
import { CoachTurnResult } from '@/lib/coach/coachCore';
import { HeroVoiceButton } from '@/components/voice/HeroVoiceButton';
import { DynamicIslandCoach } from '@/components/dashboard/DynamicIslandCoach';
import { TabType } from '@/components/navigation/BottomNav';

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

export const TodayView: React.FC<TodayViewProps> = ({
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
  const stepsGoal = 10000;
  const steps = health?.total_steps || 0;
  const stepsPercent = Math.min(100, Math.round((steps / stepsGoal) * 100));

  const caloriesTarget = 2400;
  const caloriesConsumed = nutritionTotals.calories || 0;
  const caloriesRemaining = Math.max(0, caloriesTarget - caloriesConsumed);
  const caloriesPercent = Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100));

  const proteinTarget = 202;
  const proteinConsumed = nutritionTotals.protein_g || 0;
  const proteinPercent = Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100));

  const waterGoal = 3000;
  const waterPercent = Math.min(100, Math.round((nutritionTotals.water_ml / waterGoal) * 100));

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
      />

      {/* ================================================================ */}
      {/* 2. HERO DEL DÍA: SESIÓN PRINCIPAL DE HOY (LIQUID GLASS)          */}
      {/* ================================================================ */}
      {effectiveRoutine && (
        <section className="relative overflow-hidden p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="cursor-pointer" onClick={() => onNavigateTab('entreno')}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#D97757] dark:text-[#E28464]">
                  {effectiveRoutine.dayName} • Sesión de Hoy
                </span>
                {effectiveRoutine.isOverridden && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-medium border border-amber-500/30">
                    Adaptada ⚡
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mt-1">
                {effectiveRoutine.routine.title}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2">
                {effectiveRoutine.routine.description}
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              aria-label="Cambiar o mover sesión de hoy"
              className="shrink-0 px-3 py-1.5 rounded-xl liquid-glass-pill text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Cambiar</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-[var(--glass-border)] text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span>
                Meta pasos:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {effectiveRoutine.routine.targetSteps.min.toLocaleString()} – {effectiveRoutine.routine.targetSteps.max.toLocaleString()}
                </strong>
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('entreno')}
              className="text-[11px] font-semibold text-[#D97757] dark:text-[#E28464] flex items-center gap-0.5 hover:underline"
            >
              <span>Ver entreno</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      )}

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
      {/* 4. ANILLOS & TARJETAS DE PROGRESO EN CRISTAL LÍQUIDO              */}
      {/* ================================================================ */}
      <section className="grid grid-cols-2 gap-3">
        {/* Calorías Restantes */}
        <div
          onClick={() => onNavigateTab('dieta')}
          className="p-4 rounded-3xl liquid-glass-card cursor-pointer hover:border-[#D97757]/40 active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Calorías
            </span>
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)] font-mono flex items-baseline gap-1">
              {caloriesConsumed}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">/ {caloriesTarget}</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {caloriesRemaining > 0 ? `${caloriesRemaining} kcal restantes` : 'Límite completado'}
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
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
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Proteína
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {proteinPercent}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)] font-mono flex items-baseline gap-1">
              {proteinConsumed.toFixed(0)}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">/ {proteinTarget}g</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {proteinConsumed >= proteinTarget
                ? 'Meta cubierta'
                : `${(proteinTarget - proteinConsumed).toFixed(1)}g restantes`}
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full mt-2.5 overflow-hidden">
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
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
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
            <div className="text-xl font-bold text-[var(--text-primary)] font-mono flex items-baseline gap-1">
              {((nutritionTotals.water_ml || 0) / 1000).toFixed(1)}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">/ 3.0 L</span>
            </div>
            <p className="text-[11px] text-blue-500 font-medium mt-0.5">
              {nutritionTotals.water_ml} ml hoy
            </p>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full mt-2.5 overflow-hidden">
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
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Sueño
            </span>
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)] font-mono flex items-baseline gap-1">
              {sleepHours} <span className="text-xs font-normal text-[var(--text-secondary)]">horas</span>
            </div>
            <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
              Score: {sleepScore}
            </p>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-2 flex items-center justify-between">
              <span>FC: {restingHr} bpm</span>
              <span className="text-indigo-500">Fit3 &rarr;</span>
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
