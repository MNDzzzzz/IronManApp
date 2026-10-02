'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dumbbell,
  CheckCircle2,
  Plus,
  Flame,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ChevronRight,
  Trash2,
  ArrowLeftRight,
  Settings,
  Sliders,
} from 'lucide-react';
import { GymExercise, GymWorkoutLog } from '@/types/database';
import { getSpainDate } from '@/lib/weeklyRoutine';
import { ScheduleManagerModal } from '@/components/schedule/ScheduleManagerModal';
import { ExerciseManagerModal } from '@/components/gym/ExerciseManagerModal';

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

  // Función para precargar exactamente el peso y repeticiones realizados en el entrenamiento anterior
  const preloadExerciseValues = (exId: string) => {
    const prevLogs = logs
      .filter((l) => l.exercise_id === exId && l.date !== todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.set_number - a.set_number);

    if (prevLogs.length > 0) {
      const latestDate = prevLogs[0].date;
      const sessionSets = prevLogs.filter((l) => l.date === latestDate);
      const bestSet = [...sessionSets].sort((a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps)[0];
      if (bestSet) {
        setWeightKg(bestSet.weight_kg);
        setReps(bestSet.reps);
        if (bestSet.rpe) setRpe(bestSet.rpe);
        return;
      }
    }

    const todaySets = logs.filter((l) => l.exercise_id === exId && l.date === todayStr);
    if (todaySets.length > 0) {
      const lastToday = todaySets[todaySets.length - 1];
      setWeightKg(lastToday.weight_kg);
      setReps(lastToday.reps);
      if (lastToday.rpe) setRpe(lastToday.rpe);
      return;
    }

    const ex = exercises.find((e) => e.id === exId);
    if (ex) {
      setWeightKg(ex.current_weight_kg ?? 0);
      const parsedReps = ex.target_reps ? parseInt(ex.target_reps) : 8;
      setReps(!isNaN(parsedReps) ? parsedReps : 8);
      setRpe(8);
    }
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
            <h1 className="text-xl font-black text-white tracking-tight">Fuerza & Gimnasio</h1>
            <p className="text-xs text-zinc-400">Plan diario, sobrecarga progresiva y prevención de carrera</p>
          </div>
        </div>
        <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-900 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">Cargando tu rutina...</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
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
          <h1 className="text-xl font-black text-white tracking-tight">Fuerza & Prevención</h1>
          <p className="text-xs text-zinc-400">Torso • Pierna Anti-impacto • Full Body</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('routine')}
            className={`text-[10px] px-3 py-1 rounded-lg font-bold transition-all ${
              activeTab === 'routine' ? 'bg-orange-500 text-white' : 'text-zinc-400'
            }`}
          >
            Rutina
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-[10px] px-3 py-1 rounded-lg font-bold transition-all ${
              activeTab === 'history' ? 'bg-orange-500 text-white' : 'text-zinc-400'
            }`}
          >
            Historial ({logs.length})
          </button>
        </div>
      </div>

      {/* SELECTOR DE DÍA / DISTRIBUCIÓN SEMANAL */}
      {activeTab === 'routine' && (
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-x-auto">
          {(['Día 1: Torso', 'Día 2: Pierna', 'Día 3: Full Body', 'Todos'] as const).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap text-center ${
                selectedDay === day
                  ? 'bg-orange-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* BARRA DE MODULARIDAD Y ADAPTACIÓN */}
      {activeTab === 'routine' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-orange-400" />
            <span>Reorganizar Días</span>
          </button>
          <button
            onClick={() => setIsExerciseModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personalizar Ejercicios</span>
          </button>
        </div>
      )}

      {activeTab === 'routine' ? (
        <>
          {/* PANEL DE REGISTRO RÁPIDO DE SERIE */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-orange-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Registrar Serie #{nextSetNumber}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {currentExerciseLogs.length} series registradas hoy
              </span>
            </div>

            {/* Selector de Ejercicio */}
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Ejercicio a registrar</label>
              <select
                value={selectedExerciseId}
                onChange={(e) => handleSelectExercise(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
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
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold text-orange-300">
                    Objetivo: {selectedExercise.target_sets || 3}x {selectedExercise.target_reps || '8-10 reps'}
                  </span>
                  {selectedExercise.rest_time && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" /> {selectedExercise.rest_time}
                    </span>
                  )}
                </div>
                {selectedExercise.notes && (
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    <span className="text-zinc-500 font-medium">Clave:</span> {selectedExercise.notes}
                  </p>
                )}
              </div>
            )}

            {/* Banner de Referencia de Sesión Anterior (Sobrecarga Progresiva) */}
            {lastSessionBenchmark ? (
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">
                      Sesión Anterior ({lastSessionDate})
                    </div>
                    <div className="text-white font-black text-sm">
                      {lastSessionBenchmark.reps} reps @{' '}
                      {lastSessionBenchmark.weight_kg > 0 ? `${lastSessionBenchmark.weight_kg} kg` : 'Peso Corporal'}
                      {lastSessionBenchmark.rpe && (
                        <span className="text-[10px] font-normal text-zinc-400 ml-1.5 font-mono">
                          (RPE {lastSessionBenchmark.rpe})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                    Sobrecarga +
                  </span>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Preestablecido</p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 text-xs text-zinc-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span>Sin registros previos. Registra tu carga base de partida.</span>
              </div>
            )}

            {/* Controles de Carga (kg) y Repeticiones */}
            <div className="grid grid-cols-2 gap-3">
              {/* Carga en kg */}
              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Carga (kg)</span>
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={() => setWeightKg((w) => Math.max(0, w - 2.5))}
                    className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-bold active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-white">{weightKg}</span>
                  <button
                    onClick={() => setWeightKg((w) => w + 2.5)}
                    className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-bold active:scale-90"
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-center gap-1 mt-2">
                  {[-5, 2.5, 5, 10].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setWeightKg((w) => Math.max(0, w + inc))}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white active:scale-95"
                    >
                      {inc > 0 ? `+${inc}` : inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeticiones */}
              <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Repeticiones</span>
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={() => setReps((r) => Math.max(1, r - 1))}
                    className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-bold active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-white">{reps}</span>
                  <button
                    onClick={() => setReps((r) => r + 1)}
                    className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-bold active:scale-90"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-[9px] text-zinc-400">
                  <span>RPE: {rpe}/10</span>
                  <div className="flex gap-1">
                    {[7, 8, 9].map((val) => (
                      <button
                        key={val}
                        onClick={() => setRpe(val)}
                        className={`px-1.5 py-0.5 rounded ${
                          rpe === val ? 'bg-orange-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Guardar Serie */}
            <button
              onClick={handleSaveSet}
              disabled={isSaving}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? 'Guardando serie...' : 'Guardar Serie'}
            </button>

            {/* Resumen de series de hoy y opción de deshacer */}
            {currentExerciseLogs.length > 0 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                <span>
                  Hoy: <strong className="text-white">{currentExerciseLogs.length}</strong> {currentExerciseLogs.length === 1 ? 'serie' : 'series'} (
                  {currentExerciseLogs.map((l) => `${l.reps}x${l.weight_kg > 0 ? `${l.weight_kg}k` : 'PC'}`).join(', ')})
                </span>
                {onDeleteSet && (
                  <button
                    onClick={() => onDeleteSet(currentExerciseLogs[currentExerciseLogs.length - 1].id)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition-colors active:scale-95"
                    title="Deshacer última serie guardada"
                  >
                    <RotateCcw className="w-3 h-3" /> Deshacer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CHECKLIST DE LA RUTINA */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                {selectedDay === 'Todos' ? 'Todos los Ejercicios' : `Ejercicios ${selectedDay}`}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">
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

                return (
                  <div
                    key={ex.id}
                    onClick={() => handleSelectExercise(ex.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      selectedExerciseId === ex.id
                        ? 'bg-zinc-900/80 border-orange-500/60 ring-1 ring-orange-500/30'
                        : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : completedSets.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                        <p className="text-[10px] text-zinc-500">
                          {ex.target_sets || 3}x {ex.target_reps || '8-10'} • {ex.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-orange-400 block">
                        {prevBestSet
                          ? prevBestSet.weight_kg > 0
                            ? `${prevBestSet.weight_kg} kg`
                            : 'Peso Corp.'
                          : ex.current_weight_kg !== undefined && ex.current_weight_kg > 0
                          ? `${ex.current_weight_kg} kg`
                          : 'Por determinar'}
                      </span>
                      <span className="text-[9px] text-zinc-500">
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
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Movilidad & Prevención Lesiones Running
            </h3>
            <p className="text-[11px] text-zinc-400">
              Protocolo para blindar Aquiles, rodilla (cintilla) y fascia plantar tras el asfalto y las pesas.
            </p>
            <div className="space-y-2 pt-1">
              {stretchExercises.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-zinc-200 font-semibold block">{st.name}</span>
                    {st.notes && <span className="text-[10px] text-zinc-500">{st.notes}</span>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-bold whitespace-nowrap ml-2">
                    60 seg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* HISTORIAL DE SERIES REGISTRADAS */
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Historial de Series ({logs.length})
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">
                {sessionDates.length} sesiones registradas
              </span>
            </div>

            {/* Selector dinámico con todas las fechas reales en BBDD */}
            <div className="flex gap-1.5 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800 text-[10px] overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setHistoryDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all ${
                  historyDateFilter === 'all'
                    ? 'bg-orange-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
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
                        ? 'bg-orange-500 text-black shadow-sm ring-1 ring-orange-400'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        historyDateFilter === dStr ? 'bg-black/25 text-black' : 'bg-zinc-800 text-zinc-400'
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
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 text-center text-xs">
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase">Series</span>
                  <span className="font-black text-white">{displayedHistoryLogs.length}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase">Volumen</span>
                  <span className="font-black text-orange-400">
                    {Math.round(
                      displayedHistoryLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0)
                    ).toLocaleString()}{' '}
                    kg
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase">Ejercicios</span>
                  <span className="font-black text-amber-300">
                    {new Set(displayedHistoryLogs.map((l) => l.exercise_id)).size}
                  </span>
                </div>
              </div>
            )}
          </div>

          {displayedHistoryLogs.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No hay series registradas para esta selección.</p>
          ) : (
            <div className="space-y-2">
              {displayedHistoryLogs.map((log) => {
                const ex = exercises.find((e) => e.id === log.exercise_id);
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{ex?.name || 'Ejercicio'}</h4>
                      <p className="text-[10px] text-zinc-400">
                        Serie #{log.set_number} • {log.date === todayStr ? 'Hoy' : log.date} • RPE {log.rpe || 8}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-sm font-black text-orange-400">
                          {log.weight_kg > 0 ? `${log.weight_kg} kg` : 'Peso Corp.'}
                        </span>
                        <p className="text-[10px] text-zinc-500">{log.reps} reps</p>
                      </div>
                      {onDeleteSet && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar Serie #${log.set_number} de ${ex?.name || 'este ejercicio'}?`)) {
                              onDeleteSet(log.id);
                            }
                          }}
                          className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all"
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
    </div>
  );
};
