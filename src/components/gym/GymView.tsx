'use client';

// ====================================================================
// VISTA DE GIMNASIO & FUERZA: IronManApp (Liquid Glass Dual Mode)
// Módulo de sobrecarga progresiva, prescripción articular anti-impacto
// y registro determinista de series con preestablecimiento automático.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Dumbbell,
  CheckCircle2,
  Plus,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Trash2,
  ArrowLeftRight,
  Sliders,
  Zap,
  Flame,
  Play,
  Pause,
} from 'lucide-react';
import { GymExercise, GymWorkoutLog } from '@/types/database';
import { getSpainDate } from '@/lib/weeklyRoutine';
import { ProgressionEngine } from '@/lib/training/progressionEngine';
import {
  getExerciseReferenceSet,
  calculateOverloadOptions,
  RPE_SCALE,
  getRpeScaleItem,
  getRpeClinicalNote,
  OverloadActionType,
} from '@/lib/gymOverload';
import dynamic from 'next/dynamic';

const ScheduleManagerModal = dynamic(
  () => import('@/components/schedule/ScheduleManagerModal').then((m) => m.ScheduleManagerModal),
  { ssr: false }
);
const ExerciseManagerModal = dynamic(
  () => import('@/components/gym/ExerciseManagerModal').then((m) => m.ExerciseManagerModal),
  { ssr: false }
);
const GymFlowModal = dynamic(
  () => import('@/components/gym/GymFlowModal').then((m) => m.GymFlowModal),
  { ssr: false }
);

interface GymViewProps {
  exercises: GymExercise[];
  logs: GymWorkoutLog[];
  onAddSet: (logData: { exercise_id: string; set_number: number; reps: number; weight_kg: number; rpe?: number }) => Promise<void>;
  onDeleteSet?: (logId: string) => Promise<void>;
}

export const GymView: React.FC<GymViewProps> = ({ exercises, logs, onAddSet, onDeleteSet }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtro de día (Por defecto el día correspondiente de la semana o Día 1)
  const initialDayFilter = useMemo<'Día 1: Torso' | 'Día 2: Pierna' | 'Día 3: Full Body' | 'Todos'>(() => {
    const day = getSpainDate().getDay();
    if (day === 1) return 'Día 1: Torso';
    if (day === 2) return 'Día 2: Pierna';
    if (day === 5) return 'Día 3: Full Body';
    return 'Día 1: Torso';
  }, []);

  const [selectedDay, setSelectedDay] = useState<'Día 1: Torso' | 'Día 2: Pierna' | 'Día 3: Full Body' | 'Todos'>(initialDayFilter);

  // Modales modulares de reorganización de calendario y ejercicios
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isGymFlowOpen, setIsGymFlowOpen] = useState(false);

  // Pestaña principal: 'routine' o 'history'
  const [activeTab, setActiveTab] = useState<'routine' | 'history'>('routine');

  // Filtro de fecha para el historial de series ('all' o fecha 'YYYY-MM-DD')
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('all');

  // Extraer todas las fechas con series registradas (orden descendente)
  const sessionDates = useMemo(() => {
    const dates = Array.from(new Set(logs.map((l) => l.date)));
    return dates.sort().reverse();
  }, [logs]);

  const strengthExercises = useMemo(() => exercises.filter((e) => !e.is_stretch), [exercises]);
  const stretchExercises = useMemo(() => exercises.filter((e) => e.is_stretch), [exercises]);

  // Ejercicios filtrados según el día seleccionado
  const filteredExercises = useMemo(() => {
    if (selectedDay === 'Todos') return strengthExercises;
    return strengthExercises.filter((e) => e.day === selectedDay);
  }, [strengthExercises, selectedDay]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    filteredExercises[0]?.id || strengthExercises[0]?.id || ''
  );

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExerciseId) || filteredExercises[0] || strengthExercises[0],
    [exercises, selectedExerciseId, filteredExercises, strengthExercises]
  );

  const [reps, setReps] = useState<number>(8);
  const [weightKg, setWeightKg] = useState<number>(selectedExercise?.current_weight_kg ?? 0);
  const [rpe, setRpe] = useState<number>(8);
  const [isSaving, setIsSaving] = useState(false);
  const [activeOverloadPreset, setActiveOverloadPreset] = useState<OverloadActionType | null>('same');

  // Estados y referencias para el temporizador de descanso inter-series (Ergonomía deportiva)
  const [restPresetSeconds, setRestPresetSeconds] = useState<number>(90);
  const [remainingRestSeconds, setRemainingRestSeconds] = useState<number>(0);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState<boolean>(false);
  const [isRestCompletedPulse, setIsRestCompletedPulse] = useState<boolean>(false);

  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTargetEndTimeRef = useRef<number | null>(null);

  // Vibración háptica segura
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // Fallback silencioso si no hay soporte de vibración
      }
    }
  }, []);

  // Manejo de temporizador seguro contra background throttling
  useEffect(() => {
    if (isRestTimerRunning && restTargetEndTimeRef.current) {
      restTimerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((restTargetEndTimeRef.current! - now) / 1000));
        setRemainingRestSeconds(diff);

        if (diff <= 0) {
          setIsRestTimerRunning(false);
          setIsRestCompletedPulse(true);
          triggerHaptic();
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          setTimeout(() => setIsRestCompletedPulse(false), 6000);
        }
      }, 500);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isRestTimerRunning, triggerHaptic]);

  const startRestTimer = (seconds?: number) => {
    const duration = seconds ?? (remainingRestSeconds > 0 ? remainingRestSeconds : restPresetSeconds);
    restTargetEndTimeRef.current = Date.now() + duration * 1000;
    setRemainingRestSeconds(duration);
    setIsRestTimerRunning(true);
    setIsRestCompletedPulse(false);
  };

  const pauseRestTimer = () => {
    setIsRestTimerRunning(false);
  };

  const resetRestTimer = () => {
    setIsRestTimerRunning(false);
    setRemainingRestSeconds(0);
    setIsRestCompletedPulse(false);
    restTargetEndTimeRef.current = null;
  };

  const addRestTime = (additionalSeconds: number) => {
    if (isRestTimerRunning && restTargetEndTimeRef.current) {
      restTargetEndTimeRef.current += additionalSeconds * 1000;
      setRemainingRestSeconds((prev) => prev + additionalSeconds);
    } else {
      setRemainingRestSeconds((prev) => (prev > 0 ? prev + additionalSeconds : restPresetSeconds + additionalSeconds));
    }
  };

  // Resolución de serie de referencia pura usando getExerciseReferenceSet
  const referenceSet = useMemo(() => {
    return getExerciseReferenceSet(logs, selectedExercise, todayStr);
  }, [logs, selectedExercise, todayStr]);

  // Opciones de sobrecarga progresiva deterministas (= Serie previa, +2.5 kg, +1 rep)
  const overloadOptions = useMemo(() => {
    return calculateOverloadOptions(referenceSet);
  }, [referenceSet]);

  // Información del RPE seleccionado actualmente
  const currentRpeItem = useMemo(() => {
    return getRpeScaleItem(rpe);
  }, [rpe]);

  // Aplicar acción de sobrecarga a 1-tap pre-llenando instantáneamente el formulario
  const handleApplyOverload = (type: OverloadActionType) => {
    const opt = overloadOptions[type];
    if (!opt) return;
    setWeightKg(opt.weight_kg);
    setReps(opt.reps);
    setRpe(opt.rpe);
    setActiveOverloadPreset(type);
  };

  // Registro de la última sesión completada para el ejercicio seleccionado (Sobrecarga Progresiva)
  const previousExerciseLogs = useMemo(() => {
    return logs
      .filter((l) => l.exercise_id === selectedExerciseId && l.date !== todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.set_number - a.set_number);
  }, [logs, selectedExerciseId, todayStr]);

  const lastSessionDate = useMemo(() => {
    return previousExerciseLogs.length > 0 ? previousExerciseLogs[0].date : null;
  }, [previousExerciseLogs]);

  const lastSessionBenchmark = useMemo(() => {
    if (!lastSessionDate) return null;
    const sessionSets = previousExerciseLogs.filter((l) => l.date === lastSessionDate);
    return [...sessionSets].sort((a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps)[0] || null;
  }, [previousExerciseLogs, lastSessionDate]);

  // Función para precargar exactamente el peso y repeticiones del ejercicio usando el gestor puro
  const preloadExerciseValues = (exId: string) => {
    const ex = exercises.find((e) => e.id === exId);
    const ref = getExerciseReferenceSet(logs, ex, todayStr);
    setWeightKg(ref.weight_kg);
    setReps(ref.reps);
    setRpe(ref.rpe);
    setActiveOverloadPreset('same');
  };

  // Sincronizar el ejercicio seleccionado cuando cambia el filtro de día
  useEffect(() => {
    if (filteredExercises.length > 0 && !filteredExercises.some((e) => e.id === selectedExerciseId)) {
      const nextEx = filteredExercises[0];
      setSelectedExerciseId(nextEx.id);
      preloadExerciseValues(nextEx.id);
    }
  }, [filteredExercises, selectedExerciseId]);

  // Al seleccionar un ejercicio nuevo, preestablecer los datos del entreno anterior
  const handleSelectExercise = (exId: string) => {
    setSelectedExerciseId(exId);
    preloadExerciseValues(exId);
  };

  // Series del ejercicio seleccionado realizadas hoy
  const currentExerciseLogs = useMemo(
    () => logs.filter((l) => l.exercise_id === selectedExerciseId && l.date === todayStr),
    [logs, selectedExerciseId, todayStr]
  );
  const nextSetNumber = currentExerciseLogs.length + 1;

  const handleQuickSave = async (quickWeight: number, quickReps: number, quickRpe: number = 8) => {
    if (!selectedExerciseId) return;
    setIsSaving(true);
    try {
      await onAddSet({
        exercise_id: selectedExerciseId,
        set_number: nextSetNumber,
        reps: quickReps,
        weight_kg: quickWeight,
        rpe: quickRpe,
      });
      setWeightKg(quickWeight);
      setReps(quickReps);
      setRpe(quickRpe);
      // Iniciar automáticamente el temporizador de descanso
      startRestTimer(restPresetSeconds);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSet = async () => {
    if (!selectedExerciseId) return;
    setIsSaving(true);
    try {
      await onAddSet({
        exercise_id: selectedExerciseId,
        set_number: nextSetNumber,
        reps,
        weight_kg: weightKg,
        rpe,
      });
      // Iniciar automáticamente el temporizador de descanso
      startRestTimer(restPresetSeconds);
    } finally {
      setIsSaving(false);
    }
  };

  // Logs filtrados para la pestaña de historial
  const displayedHistoryLogs = useMemo(() => {
    if (historyDateFilter === 'all') return logs;
    return logs.filter((l) => l.date === historyDateFilter);
  }, [logs, historyDateFilter]);

  if (exercises.length === 0) {
    return (
      <div className="space-y-4 pb-24 px-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Fuerza & Gimnasio</h1>
            <p className="text-xs text-[var(--text-secondary)]">Plan diario, sobrecarga progresiva y prevención articular</p>
          </div>
        </div>
        <div className="p-8 rounded-3xl liquid-glass-card border border-[var(--glass-border)] text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2D68C4]/10 border border-[#2D68C4]/20 text-[#2D68C4] flex items-center justify-center mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Cargando tu rutina...</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              Configurando tus ejercicios de fuerza y compatibilidad con running.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Fuerza & Prevención</h1>
          <p className="text-xs text-[var(--text-secondary)]">Torso • Pierna Anti-impacto • Full Body</p>
        </div>
        <div className="flex p-1 rounded-full liquid-glass-pill shadow-sm">
          <button
            onClick={() => setActiveTab('routine')}
            className={`min-h-[44px] text-xs px-4 py-2 rounded-full font-bold transition-all apple-btn-spring ${
              activeTab === 'routine'
                ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Rutina
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`min-h-[44px] text-xs px-4 py-2 rounded-full font-bold transition-all apple-btn-spring ${
              activeTab === 'history'
                ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Historial ({logs.length})
          </button>
        </div>
      </div>

      {/* SELECTOR DE DÍA / DISTRIBUCIÓN SEMANAL */}
      {activeTab === 'routine' && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-full liquid-glass-pill shadow-sm overflow-x-auto scrollbar-thin">
          {(['Día 1: Torso', 'Día 2: Pierna', 'Día 3: Full Body', 'Todos'] as const).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-h-[44px] py-2 px-3.5 rounded-full text-xs font-bold transition-all whitespace-nowrap text-center apple-btn-spring ${
                selectedDay === day
                  ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* BARRA DE MODULARIDAD Y ADAPTACIÓN */}
      {activeTab === 'routine' && (
        <div className="space-y-2">
          <button
            onClick={() => setIsGymFlowOpen(true)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-2 apple-btn-spring shadow-sm"
          >
            <Flame className="w-4 h-4 text-emerald-500" />
            <span className="editorial-heading">Modo en Sala (Gym Flow) • Inmersivo Táctil</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-2xl liquid-glass-card hover:border-[#2D68C4]/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 apple-btn-spring shadow-sm"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757]" />
              <span className="editorial-heading">Reorganizar Días</span>
            </button>
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-2xl liquid-glass-card hover:border-[#2D68C4]/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 apple-btn-spring shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span className="editorial-heading">Personalizar Ejercicios</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'routine' ? (
        <>
          {/* PANEL DE REGISTRO RÁPIDO DE SERIE (APPLE BENTO) */}
          <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-4">
            {/* Cabecera del panel con selector de ejercicio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-[#2D68C4] dark:text-[#5B95E0] flex items-center gap-1.5 editorial-heading">
                  <Dumbbell className="w-3.5 h-3.5" /> Serie #{nextSetNumber}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono data-tabular">
                  {currentExerciseLogs.length} registradas hoy
                </span>
              </div>

              {/* Selector de Ejercicio Minimalista Ergonómico */}
              <select
                value={selectedExerciseId}
                onChange={(e) => handleSelectExercise(e.target.value)}
                className="w-full min-h-[44px] p-3 rounded-2xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2D68C4] transition-all"
              >
                {filteredExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} • {ex.target_sets || 3}x{ex.target_reps || '8-10'} {ex.current_weight_kg !== undefined && ex.current_weight_kg > 0 ? `(${ex.current_weight_kg}kg)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Referencia previa sutil (1 sola línea) */}
            {referenceSet.source === 'today_previous_set' ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#2D68C4]/10 border border-[#2D68C4]/20 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#2D68C4]" />
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Previa hoy: <strong className="font-mono text-[#2D68C4] data-tabular">{referenceSet.reps} reps @ {referenceSet.weight_kg > 0 ? `${referenceSet.weight_kg} kg` : 'PC'}</strong> (RPE {referenceSet.rpe})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#2D68C4] font-bold">Hoy</span>
              </div>
            ) : referenceSet.source === 'last_session_benchmark' ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#D97757]/10 border border-[#D97757]/20 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#D97757]" />
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Récord previo: <strong className="font-mono text-[#D97757] data-tabular">{referenceSet.reps} reps @ {referenceSet.weight_kg > 0 ? `${referenceSet.weight_kg} kg` : 'PC'}</strong> (RPE {referenceSet.rpe})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#D97757] font-bold">Histórico</span>
              </div>
            ) : null}

            {/* Fila de Sobrecarga Progresiva a 1-Tap (Ergonomía Apple >= 64px) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyOverload('same')}
                className={`min-h-[64px] p-3 rounded-2xl border text-center transition-all apple-btn-spring flex flex-col items-center justify-between ${
                  activeOverloadPreset === 'same' ||
                  (weightKg === overloadOptions.same.weight_kg && reps === overloadOptions.same.reps)
                    ? 'bg-[#2D68C4]/20 border-[#2D68C4] ring-1 ring-[#2D68C4] text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[#2D68C4]/40'
                }`}
                title="Repetir serie previa"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {overloadOptions.same.badgeText}
                </span>
                <span className="text-xs font-bold my-0.5 text-[var(--text-primary)]">
                  {overloadOptions.same.label}
                </span>
                <span className="text-[10px] font-mono text-[#2D68C4] font-bold data-tabular">
                  {overloadOptions.same.displayText}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyOverload('weight_plus')}
                className={`min-h-[64px] p-3 rounded-2xl border text-center transition-all apple-btn-spring flex flex-col items-center justify-between ${
                  activeOverloadPreset === 'weight_plus' ||
                  (weightKg === overloadOptions.weight_plus.weight_kg && reps === overloadOptions.weight_plus.reps)
                    ? 'bg-[#D97757]/20 border-[#D97757] ring-1 ring-[#D97757] text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[#D97757]/40'
                }`}
                title="Incrementar 2.5 kg"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#D97757]">
                  {overloadOptions.weight_plus.badgeText}
                </span>
                <span className="text-xs font-bold my-0.5 text-[var(--text-primary)]">
                  {overloadOptions.weight_plus.label}
                </span>
                <span className="text-[10px] font-mono text-[#D97757] font-bold data-tabular">
                  {overloadOptions.weight_plus.displayText}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyOverload('rep_plus')}
                className={`min-h-[64px] p-3 rounded-2xl border text-center transition-all apple-btn-spring flex flex-col items-center justify-between ${
                  activeOverloadPreset === 'rep_plus' ||
                  (weightKg === overloadOptions.rep_plus.weight_kg && reps === overloadOptions.rep_plus.reps)
                    ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-emerald-500/40'
                }`}
                title="Incrementar 1 rep"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  {overloadOptions.rep_plus.badgeText}
                </span>
                <span className="text-xs font-bold my-0.5 text-[var(--text-primary)]">
                  {overloadOptions.rep_plus.label}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold data-tabular">
                  {overloadOptions.rep_plus.displayText}
                </span>
              </button>
            </div>

            {/* Controles de Carga y Repeticiones (Apple Health Big Numbers & Tap Targets >= 44px) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Carga (kg) */}
              <div className="p-4 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex flex-col items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Carga (kg)</span>
                <div className="flex items-center justify-between w-full my-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWeightKg((w) => Math.max(0, Math.round((w - 2.5) * 10) / 10));
                      setActiveOverloadPreset(null);
                    }}
                    aria-label="Disminuir peso 2.5 kg"
                    className="w-12 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-black apple-btn-spring flex items-center justify-center border border-[var(--glass-border)] text-xl"
                  >
                    -
                  </button>
                  <span className="apple-display font-mono data-tabular text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-none px-1">
                    {weightKg}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setWeightKg((w) => Math.round((w + 2.5) * 10) / 10);
                      setActiveOverloadPreset(null);
                    }}
                    aria-label="Aumentar peso 2.5 kg"
                    className="w-12 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-black apple-btn-spring flex items-center justify-center border border-[var(--glass-border)] text-xl"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-1.5 w-full justify-center">
                  {[-5, 2.5, 5].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        setWeightKg((w) => Math.max(0, Math.round((w + inc) * 10) / 10));
                        setActiveOverloadPreset(null);
                      }}
                      className="min-h-[36px] sm:min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] apple-btn-spring text-xs font-mono font-bold"
                    >
                      {inc > 0 ? `+${inc}` : inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeticiones */}
              <div className="p-4 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex flex-col items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Repeticiones</span>
                <div className="flex items-center justify-between w-full my-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReps((r) => Math.max(1, r - 1));
                      setActiveOverloadPreset(null);
                    }}
                    aria-label="Disminuir repeticiones"
                    className="w-12 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-black apple-btn-spring flex items-center justify-center border border-[var(--glass-border)] text-xl"
                  >
                    -
                  </button>
                  <span className="apple-display font-mono data-tabular text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-none px-1">
                    {reps}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReps((r) => r + 1);
                      setActiveOverloadPreset(null);
                    }}
                    aria-label="Aumentar repeticiones"
                    className="w-12 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-black apple-btn-spring flex items-center justify-center border border-[var(--glass-border)] text-xl"
                  >
                    +
                  </button>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)] py-1 font-semibold">
                  Meta: {selectedExercise?.target_reps || '8-10'} reps
                </div>
              </div>
            </div>

            {/* Selector de RPE Compacto (Ergonomía Apple >= 44px) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Esfuerzo Percibido (RPE)
                </span>
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  RPE {rpe} <span className="text-[10px] text-[var(--text-secondary)] font-normal font-sans">({currentRpeItem.rir})</span>
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {RPE_SCALE.map((scaleItem) => {
                  const isSelected = rpe === scaleItem.value;
                  return (
                    <button
                      key={scaleItem.value}
                      type="button"
                      onClick={() => setRpe(scaleItem.value)}
                      className={`min-h-[44px] h-12 rounded-xl flex flex-col items-center justify-center transition-all apple-btn-spring border ${
                        isSelected
                          ? `${scaleItem.colorClasses.activeBg} ${scaleItem.colorClasses.activeText} font-bold shadow-md border-transparent`
                          : `bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`
                      }`}
                    >
                      <span className="text-sm font-black font-mono leading-none">{scaleItem.label}</span>
                      <span className="text-[9px] opacity-80 mt-0.5 leading-none font-semibold">{scaleItem.rir}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botón Guardar Serie (Apple Primary Button 48px+) */}
            <button
              onClick={handleSaveSet}
              disabled={isSaving}
              className="w-full min-h-[48px] py-4 rounded-2xl bg-[#2D68C4] hover:bg-[#2557a7] text-white font-bold text-xs sm:text-sm uppercase tracking-wider apple-btn-spring flex items-center justify-center gap-2 shadow-lg shadow-[#2D68C4]/25 disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              {isSaving
                ? 'Guardando...'
                : `Guardar Serie: ${weightKg > 0 ? `${weightKg} kg` : 'PC'} × ${reps} reps (RPE ${rpe})`}
            </button>

            {/* TEMPORIZADOR DE DESCANSO INTER-SERIES INTEGRADO */}
            <div
              className={`p-4 rounded-3xl transition-all duration-300 ${
                isRestCompletedPulse
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 ring-4 ring-emerald-500/30'
                  : isRestTimerRunning
                  ? 'bg-[var(--glass-surface-thick)] border border-emerald-500/40 shadow-md'
                  : 'bg-[var(--glass-surface)] border border-[var(--glass-border)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${isRestTimerRunning ? 'text-emerald-500 animate-pulse' : 'text-[var(--text-secondary)]'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
                    Descanso Inter-Series
                  </span>
                </div>
                {isRestCompletedPulse ? (
                  <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-500 text-white animate-bounce">
                    ¡Tiempo Cumplido! A por la serie #{nextSetNumber}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] data-tabular">
                    Objetivo: {restPresetSeconds}s
                  </span>
                )}
              </div>

              {/* Display de Cuenta Atrás y Presets */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="apple-display font-mono text-3xl sm:text-4xl font-black data-tabular tracking-tight text-[var(--text-primary)]">
                    {Math.floor((remainingRestSeconds > 0 ? remainingRestSeconds : restPresetSeconds) / 60)}:
                    {String((remainingRestSeconds > 0 ? remainingRestSeconds : restPresetSeconds) % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {isRestTimerRunning ? 'descansando' : 'preparado'}
                  </span>
                </div>

                {/* Presets Rápidos de Descanso (Zonas táctiles >= 44px) */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  {[60, 90, 120, 180].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRestPresetSeconds(preset);
                        if (isRestTimerRunning) {
                          startRestTimer(preset);
                        } else {
                          setRemainingRestSeconds(preset);
                        }
                      }}
                      className={`min-h-[44px] px-3.5 rounded-xl text-xs font-mono font-bold transition-all apple-btn-spring ${
                        restPresetSeconds === preset
                          ? 'bg-[#2D68C4] text-white shadow-sm'
                          : 'bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'
                      }`}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Controles del Temporizador: Play/Pause, Reset, +30s */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border-subtle)] mt-2">
                {isRestTimerRunning ? (
                  <button
                    type="button"
                    onClick={pauseRestTimer}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-2 apple-btn-spring"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pausar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startRestTimer()}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 apple-btn-spring shadow-md shadow-emerald-500/25"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar Descanso ({remainingRestSeconds > 0 ? `${remainingRestSeconds}s` : `${restPresetSeconds}s`})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => addRestTime(30)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[var(--glass-surface-thick)] text-[var(--text-primary)] border border-[var(--glass-border)] text-xs font-bold font-mono apple-btn-spring"
                  title="Añadir 30 segundos"
                >
                  +30s
                </button>

                <button
                  type="button"
                  onClick={resetRestTimer}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--glass-border)] text-xs font-bold apple-btn-spring flex items-center justify-center"
                  title="Reiniciar temporizador"
                  aria-label="Reiniciar temporizador"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Resumen de series de hoy y opción de deshacer */}
            {currentExerciseLogs.length > 0 && (
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 px-1">
                <span>
                  Hoy: <strong className="text-[var(--text-primary)] font-mono data-tabular">{currentExerciseLogs.length}</strong> series ({currentExerciseLogs.map((l) => `${l.reps}x${l.weight_kg > 0 ? `${l.weight_kg}k` : 'PC'}`).join(', ')})
                </span>
                {onDeleteSet && (
                  <button
                    onClick={() => onDeleteSet(currentExerciseLogs[currentExerciseLogs.length - 1].id)}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors apple-btn-spring min-h-[36px] px-2 py-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Deshacer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CHECKLIST DE LA RUTINA */}
          <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
                {selectedDay === 'Todos' ? 'Todos los Ejercicios' : `Ejercicios • ${selectedDay}`}
              </h3>
              <span className="text-[11px] text-[var(--text-tertiary)] font-mono data-tabular">
                {filteredExercises.length} ejercicios
              </span>
            </div>

            <div className="space-y-2">
              {filteredExercises.map((ex) => {
                const completedSets = logs.filter((l) => l.exercise_id === ex.id && l.date === todayStr);
                const targetSets = ex.target_sets || 3;
                const isDone = completedSets.length >= targetSets;

                const prevExLogs = logs
                  .filter((l) => l.exercise_id === ex.id && l.date !== todayStr)
                  .sort((a, b) => b.date.localeCompare(a.date) || b.set_number - a.set_number);
                const prevDate = prevExLogs.length > 0 ? prevExLogs[0].date : null;
                const prevSessionSets = prevDate ? prevExLogs.filter((l) => l.date === prevDate) : [];
                const prevBestSet = prevSessionSets.length > 0
                  ? [...prevSessionSets].sort((a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps)[0]
                  : null;

                const isSelected = selectedExerciseId === ex.id;

                return (
                  <div
                    key={ex.id}
                    onClick={() => handleSelectExercise(ex.id)}
                    className={`min-h-[54px] p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer apple-interactive-card apple-btn-spring ${
                      isSelected
                        ? 'bg-[var(--glass-surface-thick)] border-[#2D68C4] ring-1 ring-[#2D68C4]/30 shadow-md'
                        : 'bg-[var(--glass-surface)] border-[var(--glass-border)] hover:border-[#2D68C4]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${
                          isDone ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--glass-surface-thick)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : completedSets.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{ex.name}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          {ex.target_sets || 3}x{ex.target_reps || '8-10'} • {ex.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2D68C4] dark:text-[#5B95E0] block font-mono data-tabular apple-title">
                        {prevBestSet
                          ? prevBestSet.weight_kg > 0
                            ? `${prevBestSet.weight_kg} kg`
                            : 'PC'
                          : ex.current_weight_kg !== undefined && ex.current_weight_kg > 0
                          ? `${ex.current_weight_kg} kg`
                          : '-'}
                      </span>
                      <span className="text-[9px] text-[var(--text-tertiary)] font-mono data-tabular">
                        {completedSets.length > 0
                          ? `${completedSets.length}/${targetSets} hoy`
                          : prevBestSet
                          ? `Ant: ${prevBestSet.reps} reps`
                          : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RUTINA DE MOVILIDAD & FLEXIBILIDAD */}
          <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5 editorial-heading">
                <Sparkles className="w-3.5 h-3.5" /> Movilidad & Prevención Articular
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Post-entreno</span>
            </div>
            <div className="space-y-1.5">
              {stretchExercises.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-primary)] font-semibold block">{st.name}</span>
                    {st.notes && <span className="text-[10px] text-[var(--text-secondary)]">{st.notes}</span>}
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap ml-2 border border-emerald-500/20 font-mono data-tabular">
                    60s
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* HISTORIAL DE SERIES REGISTRADAS */
        <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
                Historial de Series ({logs.length})
              </h3>
              <span className="text-[11px] text-[var(--text-tertiary)] font-mono data-tabular">
                {sessionDates.length} sesiones
              </span>
            </div>

            {/* Selector dinámico con todas las fechas (Pill con tap targets 44px) */}
            <div className="flex gap-1.5 p-1.5 rounded-full liquid-glass-pill text-[11px] overflow-x-auto scrollbar-thin shadow-sm">
              <button
                onClick={() => setHistoryDateFilter('all')}
                className={`min-h-[44px] px-4 py-2 rounded-full whitespace-nowrap font-bold transition-all apple-btn-spring ${
                  historyDateFilter === 'all'
                    ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Todas ({logs.length})
              </button>
              {sessionDates.map((dStr) => {
                const count = logs.filter((l) => l.date === dStr).length;
                const isToday = dStr === todayStr;
                const dObj = new Date(dStr + 'T12:00:00');
                const label = isToday
                  ? 'Hoy'
                  : dObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

                return (
                  <button
                    key={dStr}
                    onClick={() => setHistoryDateFilter(dStr)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full whitespace-nowrap font-bold transition-all apple-btn-spring flex items-center gap-1.5 ${
                      historyDateFilter === dStr
                        ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25 ring-1 ring-blue-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="capitalize">{label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono data-tabular ${
                        historyDateFilter === dStr ? 'bg-white/20 text-white' : 'bg-[var(--glass-surface-thick)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta de métricas de la sesión seleccionada con Tipografía Óptica Apple */}
            {displayedHistoryLogs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] block uppercase tracking-wider font-semibold">Series</span>
                  <span className="font-black text-[var(--text-primary)] font-mono text-lg data-tabular tracking-tight apple-title">{displayedHistoryLogs.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] block uppercase tracking-wider font-semibold">Volumen</span>
                  <span className="font-black text-[#2D68C4] dark:text-[#5B95E0] font-mono text-lg data-tabular tracking-tight apple-title">
                    {Math.round(
                      displayedHistoryLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0)
                    ).toLocaleString()}{' '}
                    kg
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] block uppercase tracking-wider font-semibold">Ejercicios</span>
                  <span className="font-black text-amber-500 font-mono text-lg data-tabular tracking-tight apple-title">
                    {new Set(displayedHistoryLogs.map((l) => l.exercise_id)).size}
                  </span>
                </div>
              </div>
            )}
          </div>

          {displayedHistoryLogs.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-6 text-center">No hay series registradas para esta selección.</p>
          ) : (
            <div className="space-y-2">
              {displayedHistoryLogs.map((log) => {
                const ex = exercises.find((e) => e.id === log.exercise_id);
                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between min-h-[54px] apple-interactive-card"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{ex?.name || 'Ejercicio'}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                        Serie #{log.set_number} • {log.date === todayStr ? 'Hoy' : log.date} • RPE {log.rpe || 8}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#2D68C4] dark:text-[#5B95E0] font-mono data-tabular tracking-tight apple-title">
                          {log.weight_kg > 0 ? `${log.weight_kg} kg` : 'Peso Corp.'}
                        </span>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-mono data-tabular">{log.reps} reps</p>
                      </div>
                      {onDeleteSet && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar Serie #${log.set_number} de ${ex?.name || 'este ejercicio'}?`)) {
                              onDeleteSet(log.id);
                            }
                          }}
                          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all flex items-center justify-center apple-btn-spring"
                          title="Eliminar serie"
                          aria-label="Eliminar serie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Modular de Reorganización de Días */}
      <ScheduleManagerModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleUpdated={() => window.location.reload()}
      />

      {/* Modal Modular de Personalización de Ejercicios */}
      <ExerciseManagerModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        day={selectedDay === 'Todos' ? 'Día 3: Full Body' : selectedDay}
        exercises={exercises}
        onExerciseAdded={() => window.location.reload()}
        onExerciseUpdated={() => window.location.reload()}
        onExerciseDeleted={() => window.location.reload()}
      />

      {/* Modal Gym Flow a Pantalla Completa (Modo en Sala) */}
      {isGymFlowOpen && selectedExercise && (
        <GymFlowModal
          exercise={selectedExercise}
          allExercises={filteredExercises.length > 0 ? filteredExercises : strengthExercises}
          todayLogs={currentExerciseLogs}
          allHistoricalLogs={logs}
          todayDateStr={todayStr}
          onLogSet={async (setNumber, weightKg, reps, rpe) => {
            await onAddSet({
              exercise_id: selectedExercise.id,
              set_number: setNumber,
              reps,
              weight_kg: weightKg,
              rpe,
            });
          }}
          onClose={() => setIsGymFlowOpen(false)}
          onSelectExercise={(ex) => handleSelectExercise(ex.id)}
        />
      )}
    </div>
  );
};
