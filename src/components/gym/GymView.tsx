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
} from 'lucide-react';
import { GymExercise, GymWorkoutLog } from '@/types/database';

interface GymViewProps {
  exercises: GymExercise[];
  logs: GymWorkoutLog[];
  onAddSet: (logData: { exercise_id: string; set_number: number; reps: number; weight_kg: number; rpe?: number }) => Promise<void>;
}

export const GymView: React.FC<GymViewProps> = ({ exercises, logs, onAddSet }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtro de día (Torso, Pierna, Full Body, o Todos)
  const [selectedDay, setSelectedDay] = useState<'Día 1: Torso' | 'Día 2: Pierna' | 'Día 3: Full Body' | 'Todos'>('Día 1: Torso');
  
  // Pestaña principal: 'routine' o 'history'
  const [activeTab, setActiveTab] = useState<'routine' | 'history'>('routine');

  // Filtro de fecha para el historial de series
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | '2026-09-22' | '2026-09-21'>('today');

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

  // Sincronizar el ejercicio seleccionado cuando cambia el filtro de día
  useEffect(() => {
    if (filteredExercises.length > 0 && !filteredExercises.some((e) => e.id === selectedExerciseId)) {
      const nextEx = filteredExercises[0];
      setSelectedExerciseId(nextEx.id);
      setWeightKg(nextEx.current_weight_kg ?? 0);
    }
  }, [filteredExercises, selectedExerciseId]);

  // Al seleccionar un ejercicio nuevo, preestablecer su peso habitual si existe
  const handleSelectExercise = (exId: string) => {
    setSelectedExerciseId(exId);
    const ex = exercises.find((e) => e.id === exId);
    if (ex) {
      setWeightKg(ex.current_weight_kg ?? 0);
    }
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
    if (historyDateFilter === 'today') return logs.filter((l) => l.date === todayStr);
    if (historyDateFilter === '2026-09-22') return logs.filter((l) => l.date === '2026-09-22');
    if (historyDateFilter === '2026-09-21') return logs.filter((l) => l.date === '2026-09-21');
    return logs;
  }, [logs, historyDateFilter, todayStr]);

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

                return (
                  <div
                    key={ex.id}
                    onClick={() => handleSelectExercise(ex.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      selectedExerciseId === ex.id
                        ? 'bg-zinc-900/80 border-orange-500/60'
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
                        {ex.current_weight_kg !== undefined
                          ? ex.current_weight_kg > 0
                            ? `${ex.current_weight_kg} kg`
                            : 'Peso Corp.'
                          : 'Por determinar'}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {completedSets.length > 0 ? `${completedSets.length}/${targetSets} series` : 'Pendiente'}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Historial de Series
            </h3>
            <div className="flex gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[10px] overflow-x-auto">
              <button
                onClick={() => setHistoryDateFilter('today')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                  historyDateFilter === 'today' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setHistoryDateFilter('2026-09-22')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                  historyDateFilter === '2026-09-22' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400'
                }`}
              >
                M22 (Pierna)
              </button>
              <button
                onClick={() => setHistoryDateFilter('2026-09-21')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                  historyDateFilter === '2026-09-21' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400'
                }`}
              >
                L21 (Torso)
              </button>
              <button
                onClick={() => setHistoryDateFilter('all')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                  historyDateFilter === 'all' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400'
                }`}
              >
                Todas
              </button>
            </div>
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
                    <div className="text-right">
                      <span className="text-sm font-black text-orange-400">
                        {log.weight_kg > 0 ? `${log.weight_kg} kg` : 'Peso Corp.'}
                      </span>
                      <p className="text-[10px] text-zinc-500">{log.reps} reps</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
