'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  Moon,
  Heart,
  Scale,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Activity,
  Flame,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { DailyHealthMetric, StravaActivity } from '@/types/database';
import { CoachTurnResult } from '@/lib/coach/coachCore';
import { DynamicIslandCoach } from '@/components/dashboard/DynamicIslandCoach';
import { TabType } from '@/components/navigation/BottomNav';
import { DiscomfortLevel, DiscomfortManager, AdaptationStrategy } from '@/lib/discomfortManager';
import { assessJointStrain, DailyWorkloadSample } from '@/lib/biomechanics/jointStrainEngine';
import { DailyBriefingCard, EffectiveRoutineItem } from '@/components/dashboard/DailyBriefingCard';
import { BiometricRingsHub } from '@/components/dashboard/BiometricRingsHub';
import { CoachCommandBar } from '@/components/voice/CoachCommandBar';

// Carga diferida de modales pesados bajo demanda (reducción de bundle JS)
const ScheduleManagerModal = dynamic(
  () => import('@/components/schedule/ScheduleManagerModal').then((m) => m.ScheduleManagerModal),
  { ssr: false }
);
const CoachChat = dynamic(
  () => import('@/components/coach/CoachChat').then((m) => m.CoachChat),
  { ssr: false }
);

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
  const restingHr = health?.resting_hr ? `${health.resting_hr}` : '--';
  const sleepHours = health?.sleep_duration_minutes
    ? (health.sleep_duration_minutes / 60).toFixed(1)
    : '--';
  const sleepScore = health?.sleep_score ? `${health.sleep_score}/100` : '--';

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [effectiveRoutine, setEffectiveRoutine] = useState<EffectiveRoutineItem | null>(null);
  const [coachStatusMessage, setCoachStatusMessage] = useState<string>(
    'Head Coach listo. Habla o escribe para registrar comidas o mover entrenos.'
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
    return assessJointStrain([sampleToday]);
  }, [latestActivity, selectedDiscomfortLevel]);

  // Obtener la rutina real programada para hoy desde el backend
  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.today) {
          setEffectiveRoutine(data.today);
        }
      }
    } catch (e) {
      console.warn('Aviso cargando rutina activa de hoy:', e);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Manejador del resultado emitido por el Coach
  const handleCoachTurnCompleted = (result: CoachTurnResult) => {
    if (result.replyText) {
      setCoachStatusMessage(result.replyText);
    }
    if (result.action?.includes('schedule') || (result as unknown as Record<string, unknown>).scheduleModified) {
      fetchSchedule();
    }
    if (onReloadData) {
      onReloadData();
    }
  };

  // Manejador de selección de nivel de molestia
  const handleSelectDiscomfortLevel = async (lvl: DiscomfortLevel | null) => {
    setSelectedDiscomfortLevel(lvl);
    if (lvl) {
      const strategy = DiscomfortManager.evaluate({
        id: `disc-${Date.now()}`,
        userId: 'alvaro-main',
        bodyPartId: 'rodilla',
        level: lvl,
        reportedAt: new Date(),
      });
      setCoachStatusMessage(strategy.recommendationsMarkdown);

      try {
        const res = await fetch('/api/coach/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `tengo molestia nivel ${lvl} en la rodilla`,
          }),
        });
        const data = await res.json();
        if (data.success) {
          fetchSchedule();
          if (data.replyText) setCoachStatusMessage(data.replyText);
        }
      } catch (err) {
        console.warn('Aviso sincronizando molestia con el Coach:', err);
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
  };

  return (
    <div className="w-full space-y-6 pb-24 transition-all">
      {/* 1. Dynamic Island: Coach Status Pill en la cabecera */}
      <section className="w-full flex justify-center">
        <DynamicIslandCoach
          message={coachStatusMessage}
          discomfortLevel={selectedDiscomfortLevel}
        />
      </section>

      {/* 2. Bento Grid Principal Responsive (Apple x Anthropic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================ */}
        {/* COLUMNA IZQUIERDA (7 COLS): DAILY BRIEFING + ACTIVIDAD RECIENTE   */}
        {/* ================================================================ */}
        <div className="lg:col-span-7 space-y-6">
          {/* Daily Briefing Card: Rutina + Carga ACWR + Check-in de Sensaciones */}
          <DailyBriefingCard
            effectiveRoutine={effectiveRoutine}
            jointStrain={jointStrain}
            selectedDiscomfortLevel={selectedDiscomfortLevel}
            discomfortStrategy={discomfortStrategy}
            onSelectDiscomfortLevel={handleSelectDiscomfortLevel}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onNavigateToWorkout={() => onNavigateTab('entreno')}
          />

          {/* Actividad Reciente de Carrera / Strava (si existe) */}
          {latestActivity && (
            <div
              onClick={() => {
                onSelectActivity(latestActivity);
                onNavigateTab('entreno');
              }}
              className="p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] cursor-pointer hover:border-[#FC5200]/40 transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#FC5200] editorial-heading">
                    Último Rodaje Strava
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200]" />
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono data-tabular">
                  {latestActivity.start_date
                    ? new Date(latestActivity.start_date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                      })
                    : 'Reciente'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[#FC5200] transition-colors">
                    {latestActivity.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {latestActivity.type || 'Carrera a pie'} • Z2 Aeróbica
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-lg font-bold font-mono text-[var(--text-primary)] data-tabular">
                      {(latestActivity.distance / 1000).toFixed(2)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-0.5">km</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-[var(--text-primary)] data-tabular">
                      {Math.floor(latestActivity.moving_time / 60)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-0.5">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* COLUMNA DERECHA (5 COLS): ANILLOS DE NUTRICIÓN + SALUD FIT3       */}
        {/* ================================================================ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Anillos de Nutrición Apple Fitness */}
          <BiometricRingsHub
            nutritionTotals={nutritionTotals}
            onQuickAddWater={onQuickAddWater}
            onNavigateToDiet={() => onNavigateTab('dieta')}
          />

          {/* Tarjeta de Recuperación, Sueño y Telemetría Fit3 */}
          <div className="p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-500 editorial-heading">
                Recuperación & Biomarcadores
              </span>
              <button
                onClick={() => onNavigateTab('salud')}
                className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
              >
                <span>Galaxy Fit3</span>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Bloque 1: Horas de Sueño */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] cursor-pointer hover:border-indigo-500/30 transition-all text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center mx-auto mb-1.5">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)]">
                  {sleepHours}h
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
                  Score: {sleepScore}
                </p>
              </div>

              {/* Bloque 2: FC en Reposo */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] cursor-pointer hover:border-rose-500/30 transition-all text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-1.5">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)]">
                  {restingHr}
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
                  BPM Reposo
                </p>
              </div>

              {/* Bloque 3: Peso Corporal */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] cursor-pointer hover:border-amber-500/30 transition-all text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto mb-1.5">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)]">
                  {currentWeight.toFixed(1)}
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
                  kg actual
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. BARRA DE COMANDOS FLOTANTE DEL COACH (CLAUDE COMMAND BAR)     */}
      {/* ================================================================ */}
      <section className="pt-2 max-w-2xl mx-auto">
        <CoachCommandBar
          onStatusChange={(status) => setCoachStatusMessage(status)}
          onSuccessResult={handleCoachTurnCompleted}
        />
      </section>

      {/* ================================================================ */}
      {/* 4. HISTORIAL EXTENDIDO DEL CHAT (PLEGABLE / A DEMANDA)           */}
      {/* ================================================================ */}
      <section className="pt-1 flex justify-center">
        <button
          onClick={() => setShowFullChatHistory(!showFullChatHistory)}
          aria-expanded={showFullChatHistory}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 py-1.5 px-3 rounded-full liquid-glass-pill transition-all active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#D97757]" />
          <span>
            {showFullChatHistory
              ? 'Ocultar consola del Coach'
              : 'Ver conversación completa con el Coach'}
          </span>
        </button>
      </section>

      {showFullChatHistory && (
        <section className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CoachChat onTurnCompleted={handleCoachTurnCompleted} />
        </section>
      )}

      {/* Modal de Planificación de Calendario */}
      <ScheduleManagerModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          fetchSchedule();
        }}
      />
    </div>
  );
};

export const TodayView = memo(TodayViewComponent);
TodayView.displayName = 'TodayView';
