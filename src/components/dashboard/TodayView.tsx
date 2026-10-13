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
  Droplets,
  Utensils,
  Dumbbell,
  RefreshCw,
  Users,
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
const CoachResponseModal = dynamic(
  () => import('@/components/coach/CoachResponseModal').then((m) => m.CoachResponseModal),
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
  coachStatusMessage?: string;
  onCoachStatusChange?: (msg: string) => void;
}

const TodayViewComponent: React.FC<TodayViewProps> = ({
  health,
  nutritionTotals,
  latestActivity,
  currentWeight,
  onQuickAddWater,
  onNavigateTab,
  onSelectActivity,
  onOpenReport,
  onReloadData,
  coachStatusMessage: propCoachStatusMessage,
  onCoachStatusChange,
}) => {
  const restingHr = health?.resting_hr ? `${health.resting_hr}` : '--';
  const sleepHours = health?.sleep_duration_minutes
    ? (health.sleep_duration_minutes / 60).toFixed(1)
    : '--';
  const sleepScore = health?.sleep_score ? `${health.sleep_score}/100` : '--';

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [effectiveRoutine, setEffectiveRoutine] = useState<EffectiveRoutineItem | null>(null);
  const [localCoachStatusMessage, setLocalCoachStatusMessage] = useState<string>(
    propCoachStatusMessage || 'Head Coach listo. Habla o escribe para registrar comidas o mover entrenos.'
  );

  const activeCoachStatusMessage = propCoachStatusMessage || localCoachStatusMessage;

  const updateCoachStatus = (msg: string) => {
    setLocalCoachStatusMessage(msg);
    if (onCoachStatusChange) {
      onCoachStatusChange(msg);
    }
  };
  const [showFullChatHistory, setShowFullChatHistory] = useState(false);
  const [selectedDiscomfortLevel, setSelectedDiscomfortLevel] = useState<DiscomfortLevel | null>(null);
  const [isCoachResponseModalOpen, setIsCoachResponseModalOpen] = useState(false);
  const [lastCoachTurnResult, setLastCoachTurnResult] = useState<CoachTurnResult | null>(null);

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
  const handleCoachTurnCompleted = (result: CoachTurnResult, showModal = true) => {
    if (result.replyText) {
      updateCoachStatus(result.replyText);
    }
    if (showModal) {
      setLastCoachTurnResult(result);
      setIsCoachResponseModalOpen(true);
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
      updateCoachStatus(strategy.recommendationsMarkdown);

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
          if (data.replyText) updateCoachStatus(data.replyText);
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
        updateCoachStatus('Molestia resuelta. Sesión restablecida al 100%.');
      } catch (err) {
        console.warn('Aviso restableciendo rutina:', err);
      }
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 sm:pb-16 transition-all">
      {/* 1. Dynamic Island: Coach Status Pill en la cabecera */}
      <section className="w-full flex justify-center">
        <DynamicIslandCoach
          message={activeCoachStatusMessage}
          discomfortLevel={selectedDiscomfortLevel}
        />
      </section>

      {/* 2. Bento Grid Principal Responsive (Apple x Anthropic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ================================================================ */}
        {/* COLUMNA IZQUIERDA (7 COLS): DAILY BRIEFING + QUICK ACTIONS + STRAVA */}
        {/* ================================================================ */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
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

          {/* Tarjeta de Acceso a Tribu Social */}
          <div
            onClick={() => onNavigateTab('tribu')}
            className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 hover:border-orange-500/40 flex items-center justify-between cursor-pointer transition-all apple-pressable apple-interactive-card shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D97757] to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] apple-title">
                    Tribu de Rendimiento ⚡
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[9px] font-bold">
                    Comunidad
                  </span>
                </div>
                <p className="text-[10.5px] text-[var(--text-secondary)]">
                  Feed de hoy, podio semanal y retos de entrenamiento
                </p>
              </div>
            </div>
            <span className="text-xs text-[var(--accent-coral)] font-bold flex items-center gap-1 shrink-0">
              Ver Tribu →
            </span>
          </div>

          {/* Quick Action Buttons Hub (WWDC Fluid Interfaces & Latency Kill) */}
          <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-[var(--glass-specular-bevel)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#D97757] dark:text-[#E28464] editorial-heading">
                Acciones Rápidas • 1-Tap
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                Respuesta Inmediata
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Acción 1: +250ml Agua */}
              <button
                type="button"
                onClick={() => onQuickAddWater(250)}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-[var(--glass-border-subtle)] hover:border-sky-500/40 flex flex-col items-center justify-center text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96] shadow-sm group"
                aria-label="Registrar 250ml de agua"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center mb-1.5 shadow-inner group-hover:scale-105 transition-transform">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] apple-title">
                  +250ml Agua
                </span>
                <span className="text-[9.5px] text-[var(--text-tertiary)] mt-0.5">
                  Hidratación
                </span>
              </button>

              {/* Acción 2: Añadir Comida */}
              <button
                type="button"
                onClick={() => onNavigateTab('dieta')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-[var(--glass-border-subtle)] hover:border-[#D97757]/40 flex flex-col items-center justify-center text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96] shadow-sm group"
                aria-label="Ir a Dieta y registrar comida"
              >
                <div className="w-8 h-8 rounded-xl bg-[#D97757]/15 text-[#D97757] dark:text-[#E28464] flex items-center justify-center mb-1.5 shadow-inner group-hover:scale-105 transition-transform">
                  <Utensils className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] apple-title">
                  Registrar Dieta
                </span>
                <span className="text-[9.5px] text-[var(--text-tertiary)] mt-0.5">
                  Proteína / Kcal
                </span>
              </button>

              {/* Acción 3: Iniciar Gimnasio / Serie */}
              <button
                type="button"
                onClick={() => onNavigateTab('entreno')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-[var(--glass-border-subtle)] hover:border-blue-500/40 flex flex-col items-center justify-center text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96] shadow-sm group"
                aria-label="Ir a Entreno para series de gimnasio"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center mb-1.5 shadow-inner group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] apple-title">
                  Entreno Gym
                </span>
                <span className="text-[9.5px] text-[var(--text-tertiary)] mt-0.5">
                  Registrar Series
                </span>
              </button>

              {/* Acción 4: Anotar Peso Corporal */}
              <button
                type="button"
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-[var(--glass-border-subtle)] hover:border-amber-500/40 flex flex-col items-center justify-center text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96] shadow-sm group"
                aria-label="Ir a Salud para registrar peso"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-1.5 shadow-inner group-hover:scale-105 transition-transform">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] apple-title">
                  Pesarme
                </span>
                <span className="text-[9.5px] text-[var(--text-tertiary)] mt-0.5 font-mono data-tabular">
                  {currentWeight != null ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
                </span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Sincronización y Último Rodaje Strava */}
          {latestActivity ? (
            <div
              onClick={() => {
                onSelectActivity(latestActivity);
                onNavigateTab('entreno');
              }}
              className="p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] cursor-pointer hover:border-[#FC5200]/50 transition-all shadow-[var(--glass-specular-bevel)] group apple-interactive-card apple-pressable touch-manipulation active:scale-[0.985]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#FC5200] editorial-heading">
                    Último Rodaje Strava
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] shadow-[0_0_8px_rgba(252,82,0,0.5)]" />
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
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[#FC5200] transition-colors apple-title">
                    {latestActivity.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 apple-subhead">
                    {latestActivity.type || 'Carrera a pie'} • Z2 Aeróbica
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-lg font-bold font-mono text-[var(--text-primary)] data-tabular apple-title">
                      {(latestActivity.distance / 1000).toFixed(2)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-0.5">km</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-[var(--text-primary)] data-tabular apple-title">
                      {Math.floor(latestActivity.moving_time / 60)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-0.5">min</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[#FC5200] transition-colors" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-[var(--glass-specular-bevel)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FC5200]/15 text-[#FC5200] flex items-center justify-center shrink-0 shadow-inner">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] apple-title">
                    Strava Conectado
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Sin rodajes registrados hoy. Listos para Z2.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onReloadData && (
                  <button
                    onClick={onReloadData}
                    aria-label="Sincronizar Strava"
                    className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/50 dark:bg-white/[0.08] border border-[var(--glass-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#FC5200]" />
                    <span className="hidden sm:inline">Sincronizar</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigateTab('entreno')}
                  className="px-3 py-1.5 rounded-full bg-[#FC5200]/15 text-[#FC5200] hover:bg-[#FC5200]/25 text-xs font-bold border border-[#FC5200]/25 flex items-center gap-1 touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
                >
                  <span>Ver Entrenos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* COLUMNA DERECHA (5 COLS): ANILLOS DE NUTRICIÓN + SALUD FIT3       */}
        {/* ================================================================ */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
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
                className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors touch-manipulation apple-pressable active:scale-[0.97]"
              >
                <span>Galaxy Fit3</span>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Bloque 1: Horas de Sueño */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] cursor-pointer hover:border-indigo-500/30 transition-all text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center mx-auto mb-1.5 shadow-inner">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)] apple-title">
                  {sleepHours}h
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
                  Score: {sleepScore}
                </p>
              </div>

              {/* Bloque 2: FC en Reposo */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] cursor-pointer hover:border-rose-500/30 transition-all text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-1.5 shadow-inner">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)] apple-title">
                  {restingHr}
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
                  BPM Reposo
                </p>
              </div>

              {/* Bloque 3: Peso Corporal */}
              <div
                onClick={() => onNavigateTab('salud')}
                className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-[var(--glass-border-subtle)] shadow-[var(--glass-specular-bevel)] cursor-pointer hover:border-amber-500/30 transition-all text-center touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto mb-1.5 shadow-inner">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold font-mono data-tabular text-[var(--text-primary)] apple-title">
                  {currentWeight != null ? currentWeight.toFixed(1) : '--'}
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
          onStatusChange={(status) => updateCoachStatus(status)}
          onSuccessResult={(result) => handleCoachTurnCompleted(result, true)}
        />
      </section>

      {/* ================================================================ */}
      {/* 4. HISTORIAL EXTENDIDO DEL CHAT (PLEGABLE / A DEMANDA)           */}
      {/* ================================================================ */}
      <section className="pt-1 flex justify-center">
        <button
          onClick={() => setShowFullChatHistory(!showFullChatHistory)}
          aria-expanded={showFullChatHistory}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 py-1.5 px-3 rounded-full liquid-glass-pill transition-all touch-manipulation apple-pressable apple-btn-spring active:scale-[0.96]"
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
          <CoachChat onTurnCompleted={(result) => handleCoachTurnCompleted(result, false)} />
        </section>
      )}

      {/* Modal Liquid Glass de Respuesta y Desglose del Head Coach */}
      <CoachResponseModal
        isOpen={isCoachResponseModalOpen}
        result={lastCoachTurnResult}
        onClose={() => setIsCoachResponseModalOpen(false)}
        onOpenFullChat={() => {
          setIsCoachResponseModalOpen(false);
          setShowFullChatHistory(true);
        }}
      />

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
