'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Moon,
  Heart,
  Footprints,
  Droplet,
  Plus,
  Minus,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Scale,
  Dumbbell,
  ArrowLeftRight,
  Calendar,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { DailyHealthMetric, NutritionLog, StravaActivity } from '@/types/database';
import { ScheduleManagerModal } from '@/components/schedule/ScheduleManagerModal';
import { CoachChat } from '@/components/coach/CoachChat';
import { CoachTurnResult } from '@/lib/coach/coachCore';

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
  onNavigateTab: (tab: any) => void;
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
  const [effectiveRoutine, setEffectiveRoutine] = useState<any>(null);

  const fetchSchedule = () => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.schedule) {
          const todaySched = data.schedule.find((s: any) => s.date === data.referenceDate);
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
    if (onReloadData) onReloadData();
  };

  const daysToMarathon = Math.max(
    0,
    Math.ceil((new Date('2027-02-28T09:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="space-y-4 pb-24 px-3.5 pt-2 font-sans selection:bg-amber-500/20">
      {/* ================================================================ */}
      {/* 1. HERO DEL DÍA: SESIÓN PRINCIPAL & OBJETIVO (ESTILO APPLE)       */}
      {/* ================================================================ */}
      {effectiveRoutine && (
        <section className="relative overflow-hidden rounded-3xl bg-[#171716] border border-white/[0.08] p-5 shadow-xl transition-all">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-400">
                  {effectiveRoutine.dayName} • Sesión de Hoy
                </span>
                {effectiveRoutine.isOverridden && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                    Adaptada ⚡
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight mt-1">
                {effectiveRoutine.routine.title}
              </h1>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                {effectiveRoutine.routine.description}
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Cambiar</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-white/[0.06] text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Meta pasos:{' '}
                <strong className="text-zinc-200 font-mono">
                  {effectiveRoutine.routine.targetSteps.min.toLocaleString()} – {effectiveRoutine.routine.targetSteps.max.toLocaleString()}
                </strong>
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 capitalize">
              {effectiveRoutine.routine.category}
            </span>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* 2. ANILLOS DE BALANCE DIARIO (CALORÍAS, PROTEÍNA, AGUA, SUEÑO)   */}
      {/* ================================================================ */}
      <section className="grid grid-cols-2 gap-3">
        {/* Calorías & Déficit */}
        <div className="p-4 rounded-3xl bg-[#171716] border border-white/[0.08] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Calorías</span>
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1">
              {caloriesConsumed} <span className="text-xs font-normal text-zinc-400">/ {caloriesTarget}</span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
              {caloriesRemaining > 0 ? `${caloriesRemaining} kcal restantes` : 'Objetivo cumplido'}
            </p>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${caloriesPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Proteína Real */}
        <div className="p-4 rounded-3xl bg-[#171716] border border-white/[0.08] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Proteína</span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1">
              {proteinConsumed} <span className="text-xs font-normal text-zinc-400">/ {proteinTarget}g</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
              {proteinConsumed >= proteinTarget ? 'Meta cubierta' : `${(proteinTarget - proteinConsumed).toFixed(1)}g restantes`}
            </p>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hidratación con Botones Rápidos */}
        <div className="p-4 rounded-3xl bg-[#171716] border border-white/[0.08] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Agua</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQuickAddWater(-250)}
                aria-label="Restar 250ml"
                className="p-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-90"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onQuickAddWater(250)}
                aria-label="Añadir 250ml"
                className="p-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all active:scale-90"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1">
              {((nutritionTotals.water_ml || 0) / 1000).toFixed(1)}{' '}
              <span className="text-xs font-normal text-zinc-400">/ 3.0 L</span>
            </div>
            <p className="text-[11px] text-blue-400/90 font-medium mt-0.5">
              {nutritionTotals.water_ml} ml hoy
            </p>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-2.5 overflow-hidden">
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
          className="p-4 rounded-3xl bg-[#171716] border border-white/[0.08] flex flex-col justify-between shadow-sm cursor-pointer hover:border-white/[0.15] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Sueño</span>
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1">
              {sleepHours} <span className="text-xs font-normal text-zinc-400">horas</span>
            </div>
            <p className="text-[11px] text-indigo-300 font-medium mt-0.5">
              Score: {sleepScore}
            </p>
            <div className="text-[10px] text-zinc-500 mt-2 flex items-center justify-between">
              <span>FC: {restingHr} bpm</span>
              <span className="text-indigo-400">Fit3 &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. AI COACH HUB: CHAT Y NOTAS DE VOZ EN VIVO                    */}
      {/* ================================================================ */}
      <section className="pt-1">
        <CoachChat onTurnCompleted={handleCoachTurnCompleted} />
      </section>

      {/* ================================================================ */}
      {/* 4. ACCESO AL INFORME SEMANAL & CUENTA ATRÁS 21K                  */}
      {/* ================================================================ */}
      <section className="space-y-3 pt-1">
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.03] to-transparent border border-amber-500/20 hover:border-amber-500/40 flex items-center justify-between text-left active:scale-[0.99] transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                  Informe Semanal de Rendimiento
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Telemetría real auditada, diagnóstico de rodilla y PDF
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>🏁</span>
            <span>Media Maratón 28 Feb 2027</span>
          </div>
          <span className="font-mono text-zinc-300 font-bold">
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
