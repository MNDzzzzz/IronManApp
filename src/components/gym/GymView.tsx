'use client';

// ====================================================================
// VISTA DE GIMNASIO & FUERZA: IronManApp (Liquid Glass Dual Mode)
// Módulo de sobrecarga progresiva, prescripción articular anti-impacto
// y registro determinista de series con preestablecimiento automático.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState, useMemo, useEffect } from 'react';
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
        <div className="flex p-1 rounded-2xl liquid-glass-pill border border-[var(--glass-border)]">
          <button
            onClick={() => setActiveTab('routine')}
            className={`text-[11px] px-3 py-1 rounded-xl font-bold transition-all ${
              activeTab === 'routine'
                ? 'bg-[#2D68C4] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Rutina
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-[11px] px-3 py-1 rounded-xl font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#2D68C4] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Historial ({logs.length})
          </button>
        </div>
      </div>

      {/* SELECTOR DE DÍA / DISTRIBUCIÓN SEMANAL */}
      {activeTab === 'routine' && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass-pill border border-[var(--glass-border)] overflow-x-auto scrollbar-thin">
          {(['Día 1: Torso', 'Día 2: Pierna', 'Día 3: Full Body', 'Todos'] as const).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap text-center ${
                selectedDay === day
                  ? 'bg-[#2D68C4] text-white shadow-sm'
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
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500 text-xs font-black text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-md"
          >
            <Flame className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>ACTIVAR MODO EN SALA (GYM FLOW) • TEMPORIZADOR HÁPTICO</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-2xl liquid-glass-card border border-[var(--glass-border)] hover:border-[#2D68C4]/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Reorganizar Días</span>
            </button>
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-2xl liquid-glass-card border border-[var(--glass-border)] hover:border-[#2D68C4]/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>Personalizar Ejercicios</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'routine' ? (
        <>
          {/* PANEL DE REGISTRO RÁPIDO DE SERIE */}
          <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#2D68C4] dark:text-[#5B95E0] flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Registrar Serie #{nextSetNumber}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                {currentExerciseLogs.length} series registradas hoy
              </span>
            </div>

            {/* Selector de Ejercicio */}
            <div>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1 font-medium">Ejercicio a registrar</label>
              <select
                value={selectedExerciseId}
                onChange={(e) => handleSelectExercise(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:border-[#2D68C4]"
              >
                {filteredExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.current_weight_kg !== undefined ? (ex.current_weight_kg > 0 ? `${ex.current_weight_kg}kg` : 'PC') : 'Por determinar'})
                  </option>
                ))}
              </select>
            </div>

            {/* Tarjeta de Especificación y Enfoque del Ejercicio */}
            {selectedExercise && (
              <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span className="font-semibold text-[#2D68C4] dark:text-[#5B95E0]">
                    Objetivo: {selectedExercise.target_sets || 3}x {selectedExercise.target_reps || '8-10 reps'}
                  </span>
                  {selectedExercise.rest_time && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[var(--text-tertiary)]" /> {selectedExercise.rest_time}
                    </span>
                  )}
                </div>
                {selectedExercise.notes && (
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                    <span className="text-[var(--text-tertiary)] font-medium">Clave:</span> {selectedExercise.notes}
                  </p>
                )}
              </div>
            )}

            {/* Banner de Referencia de Sobrecarga Progresiva */}
            {referenceSet.source === 'today_previous_set' ? (
              <div className="p-3 rounded-2xl bg-[#2D68C4]/10 border border-[#2D68C4]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#2D68C4]/20 text-[#2D68C4] dark:text-[#5B95E0] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#2D68C4] dark:text-[#5B95E0] font-bold uppercase tracking-wider">
                      {referenceSet.label}
                    </div>
                    <div className="text-[var(--text-primary)] font-black text-sm">
                      {referenceSet.reps} reps @{' '}
                      {referenceSet.weight_kg > 0 ? `${referenceSet.weight_kg} kg` : 'Peso Corporal'}
                      <span className="text-[10px] font-normal text-[var(--text-tertiary)] ml-1.5 font-mono">
                        (RPE {referenceSet.rpe})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#2D68C4]/20 text-[#2D68C4] dark:text-[#5B95E0] font-bold border border-[#2D68C4]/30">
                    Hoy
                  </span>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Serie previa</p>
                </div>
              </div>
            ) : referenceSet.source === 'last_session_benchmark' ? (
              <div className="p-3 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D97757]/20 text-[#D97757] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#D97757] font-bold uppercase tracking-wider">
                      {referenceSet.label}
                    </div>
                    <div className="text-[var(--text-primary)] font-black text-sm">
                      {referenceSet.reps} reps @{' '}
                      {referenceSet.weight_kg > 0 ? `${referenceSet.weight_kg} kg` : 'Peso Corporal'}
                      <span className="text-[10px] font-normal text-[var(--text-tertiary)] ml-1.5 font-mono">
                        (RPE {referenceSet.rpe})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D97757]/20 text-[#D97757] font-bold border border-[#D97757]/30">
                    Sobrecarga +
                  </span>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Preestablecido</p>
                </div>
              </div>
            ) : referenceSet.source === 'exercise_target' ? (
              <div className="p-2.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#2D68C4] shrink-0" />
                  <span>Objetivo inicial: {referenceSet.reps} reps @ {referenceSet.weight_kg > 0 ? `${referenceSet.weight_kg} kg` : 'Peso Corporal'}</span>
                </div>
                <span className="text-[9px] text-[var(--text-tertiary)]">Catálogo</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Info className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <span>Sin registros previos. Registra tu carga base de partida.</span>
              </div>
            )}

            {/* Botones de Acción de Sobrecarga Progresiva a 1-Tap */}
            <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#D97757]" /> Sobrecarga Progresiva a 1-Tap
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Pre-llena al instante</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. = Serie previa */}
                <button
                  type="button"
                  onClick={() => handleApplyOverload('same')}
                  className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-between ${
                    activeOverloadPreset === 'same' ||
                    (weightKg === overloadOptions.same.weight_kg && reps === overloadOptions.same.reps)
                      ? 'bg-[#2D68C4]/20 border-[#2D68C4] ring-1 ring-[#2D68C4] text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--glass-surface-thick)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[#2D68C4]/50'
                  }`}
                  title="Pre-llenar con la misma carga y repeticiones"
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {overloadOptions.same.badgeText}
                  </span>
                  <span className="text-xs font-black my-0.5 text-[var(--text-primary)]">
                    {overloadOptions.same.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#2D68C4] dark:text-[#5B95E0] font-bold">
                    {overloadOptions.same.displayText}
                  </span>
                </button>

                {/* 2. +2.5 kg */}
                <button
                  type="button"
                  onClick={() => handleApplyOverload('weight_plus')}
                  className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-between ${
                    activeOverloadPreset === 'weight_plus' ||
                    (weightKg === overloadOptions.weight_plus.weight_kg && reps === overloadOptions.weight_plus.reps)
                      ? 'bg-[#D97757]/20 border-[#D97757] ring-1 ring-[#D97757] text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--glass-surface-thick)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[#D97757]/50'
                  }`}
                  title="Incrementar 2.5 kg sobre la serie de referencia"
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#D97757]">
                    {overloadOptions.weight_plus.badgeText}
                  </span>
                  <span className="text-xs font-black my-0.5 text-[var(--text-primary)]">
                    {overloadOptions.weight_plus.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#D97757] font-bold">
                    {overloadOptions.weight_plus.displayText}
                  </span>
                </button>

                {/* 3. +1 rep */}
                <button
                  type="button"
                  onClick={() => handleApplyOverload('rep_plus')}
                  className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-between ${
                    activeOverloadPreset === 'rep_plus' ||
                    (weightKg === overloadOptions.rep_plus.weight_kg && reps === overloadOptions.rep_plus.reps)
                      ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--glass-surface-thick)] border-[var(--glass-border)] text-[var(--text-primary)] hover:border-emerald-500/50'
                  }`}
                  title="Incrementar 1 repetición conservando la carga"
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                    {overloadOptions.rep_plus.badgeText}
                  </span>
                  <span className="text-xs font-black my-0.5 text-[var(--text-primary)]">
                    {overloadOptions.rep_plus.label}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {overloadOptions.rep_plus.displayText}
                  </span>
                </button>
              </div>
            </div>

            {/* Controles Manuales de Carga (kg) y Repeticiones */}
            <div className="grid grid-cols-2 gap-3">
              {/* Carga en kg */}
              <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-medium">Carga (kg)</span>
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWeightKg((w) => Math.max(0, Math.round((w - 2.5) * 10) / 10));
                      setActiveOverloadPreset(null);
                    }}
                    className="w-8 h-8 rounded-xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-bold active:scale-95 transition-all flex items-center justify-center border border-[var(--glass-border)]"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[var(--text-primary)] font-mono">{weightKg}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWeightKg((w) => Math.round((w + 2.5) * 10) / 10);
                      setActiveOverloadPreset(null);
                    }}
                    className="w-8 h-8 rounded-xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-bold active:scale-95 transition-all flex items-center justify-center border border-[var(--glass-border)]"
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-center gap-1 mt-2">
                  {[-5, 2.5, 5, 10].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        setWeightKg((w) => Math.max(0, Math.round((w + inc) * 10) / 10));
                        setActiveOverloadPreset(null);
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded-lg bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] active:scale-95 transition-all"
                    >
                      {inc > 0 ? `+${inc}` : inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeticiones */}
              <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--text-secondary)] block font-medium">Repeticiones</span>
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReps((r) => Math.max(1, r - 1));
                      setActiveOverloadPreset(null);
                    }}
                    className="w-8 h-8 rounded-xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-bold active:scale-95 transition-all flex items-center justify-center border border-[var(--glass-border)]"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[var(--text-primary)] font-mono">{reps}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReps((r) => r + 1);
                      setActiveOverloadPreset(null);
                    }}
                    className="w-8 h-8 rounded-xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-bold active:scale-95 transition-all flex items-center justify-center border border-[var(--glass-border)]"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center justify-center mt-2 text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>Objetivo: {selectedExercise?.target_reps || '8-10'}</span>
                </div>
              </div>
            </div>

            {/* Selector Táctil de RPE Ergonómico (Escala Completa 6-10 con RIR) */}
            <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                    Esfuerzo Percibido (RPE)
                  </span>
                  <span className="text-[9px] text-[var(--text-tertiary)]">
                    {currentRpeItem.description}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono text-[var(--text-primary)]">
                    RPE {rpe}
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${currentRpeItem.colorClasses.badgeBg} ${currentRpeItem.colorClasses.badgeText} border ${currentRpeItem.colorClasses.border}`}
                  >
                    {currentRpeItem.badge}
                  </span>
                </div>
              </div>

              {/* Banda Táctil de 8 Posiciones */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {RPE_SCALE.map((scaleItem) => {
                  const isSelected = rpe === scaleItem.value;
                  return (
                    <button
                      key={scaleItem.value}
                      type="button"
                      onClick={() => setRpe(scaleItem.value)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border ${
                        isSelected
                          ? `${scaleItem.colorClasses.activeBg} ${scaleItem.colorClasses.activeText} font-bold shadow-md ${scaleItem.colorClasses.glow} border-transparent`
                          : `bg-[var(--glass-surface-thick)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border)]`
                      }`}
                      title={`RPE ${scaleItem.value} - ${scaleItem.rir}: ${scaleItem.description}`}
                    >
                      <span className="text-xs font-black leading-none font-mono">
                        {scaleItem.label}
                      </span>
                      <span
                        className={`text-[8px] font-medium leading-tight mt-0.5 ${
                          isSelected ? 'opacity-90' : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {scaleItem.rir}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Nota Biomecánica / Prevención Articular */}
              <div className="pt-1 border-t border-[var(--glass-border)]/50">
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic">
                  💡 {getRpeClinicalNote(rpe)}
                </p>
              </div>
            </div>

            {/* Botón Guardar Serie Manual */}
            <button
              onClick={handleSaveSet}
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2D68C4] to-[#1E4E96] text-white font-black text-xs uppercase tracking-wider active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSaving
                ? 'Guardando serie...'
                : `Guardar Serie ${nextSetNumber}: ${weightKg > 0 ? `${weightKg} kg` : 'PC'} × ${reps} reps (RPE ${rpe})`}
            </button>

            {/* Resumen de series de hoy y opción de deshacer */}
            {currentExerciseLogs.length > 0 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-secondary)]">
                <span>
                  Hoy: <strong className="text-[var(--text-primary)]">{currentExerciseLogs.length}</strong> {currentExerciseLogs.length === 1 ? 'serie' : 'series'} (
                  {currentExerciseLogs.map((l) => `${l.reps}x${l.weight_kg > 0 ? `${l.weight_kg}k` : 'PC'}`).join(', ')})
                </span>
                {onDeleteSet && (
                  <button
                    onClick={() => onDeleteSet(currentExerciseLogs[currentExerciseLogs.length - 1].id)}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors active:scale-95"
                    title="Deshacer última serie guardada"
                  >
                    <RotateCcw className="w-3 h-3" /> Deshacer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CHECKLIST DE LA RUTINA */}
          <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {selectedDay === 'Todos' ? 'Todos los Ejercicios' : `Ejercicios ${selectedDay}`}
              </h3>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                {filteredExercises.length} ejercicios
              </span>
            </div>

            <div className="space-y-2">
              {filteredExercises.map((ex) => {
                const completedSets = logs.filter((l) => l.exercise_id === ex.id && l.date === todayStr);
                const targetSets = ex.target_sets || 3;
                const isDone = completedSets.length >= targetSets;

                // Buscar serie de referencia de la última sesión
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
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--glass-surface-thick)] border-[#2D68C4] ring-1 ring-[#2D68C4]/40 shadow-sm'
                        : 'bg-[var(--glass-surface)] border-[var(--glass-border)] hover:border-[#2D68C4]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--glass-surface-thick)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : completedSets.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{ex.name}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {ex.target_sets || 3}x {ex.target_reps || '8-10'} • {ex.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#2D68C4] dark:text-[#5B95E0] block font-mono">
                        {prevBestSet
                          ? prevBestSet.weight_kg > 0
                            ? `${prevBestSet.weight_kg} kg`
                            : 'Peso Corp.'
                          : ex.current_weight_kg !== undefined && ex.current_weight_kg > 0
                          ? `${ex.current_weight_kg} kg`
                          : 'Por determinar'}
                      </span>
                      <span className="text-[9px] text-[var(--text-tertiary)]">
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

          {/* RUTINA DE ESTIRAMIENTOS Y PREVENCIÓN RUNNING */}
          <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Movilidad & Prevención Lesiones Running
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Protocolo para blindar Aquiles, rodilla (cintilla iliotibial) y fascia plantar tras el asfalto y las pesas.
            </p>
            <div className="space-y-2 pt-1">
              {stretchExercises.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-primary)] font-semibold block">{st.name}</span>
                    {st.notes && <span className="text-[10px] text-[var(--text-secondary)]">{st.notes}</span>}
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap ml-2 border border-emerald-500/20">
                    60 seg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* HISTORIAL DE SERIES REGISTRADAS */
        <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Historial de Series ({logs.length})
              </h3>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                {sessionDates.length} sesiones registradas
              </span>
            </div>

            {/* Selector dinámico con todas las fechas reales en BBDD */}
            <div className="flex gap-1.5 p-1 rounded-2xl liquid-glass-pill border border-[var(--glass-border)] text-[10px] overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setHistoryDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all ${
                  historyDateFilter === 'all'
                    ? 'bg-[#2D68C4] text-white shadow-sm'
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
                    className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all flex items-center gap-1.5 ${
                      historyDateFilter === dStr
                        ? 'bg-[#2D68C4] text-white shadow-sm ring-1 ring-blue-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="capitalize">{label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        historyDateFilter === dStr ? 'bg-white/20 text-white' : 'bg-[var(--glass-surface-thick)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta de métricas de la sesión seleccionada */}
            {displayedHistoryLogs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-center text-xs">
                <div>
                  <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Series</span>
                  <span className="font-black text-[var(--text-primary)] font-mono">{displayedHistoryLogs.length}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Volumen</span>
                  <span className="font-black text-[#2D68C4] dark:text-[#5B95E0] font-mono">
                    {Math.round(
                      displayedHistoryLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0)
                    ).toLocaleString()}{' '}
                    kg
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Ejercicios</span>
                  <span className="font-black text-amber-500 font-mono">
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
                    className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{ex?.name || 'Ejercicio'}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Serie #{log.set_number} • {log.date === todayStr ? 'Hoy' : log.date} • RPE {log.rpe || 8}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#2D68C4] dark:text-[#5B95E0] font-mono">
                          {log.weight_kg > 0 ? `${log.weight_kg} kg` : 'Peso Corp.'}
                        </span>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{log.reps} reps</p>
                      </div>
                      {onDeleteSet && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar Serie #${log.set_number} de ${ex?.name || 'este ejercicio'}?`)) {
                              onDeleteSet(log.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
                          title="Eliminar serie"
                          aria-label="Eliminar serie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
