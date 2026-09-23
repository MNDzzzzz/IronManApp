'use client';

import React, { useState } from 'react';
import {
  Dumbbell,
  CheckCircle2,
  Plus,
  Flame,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { GymExercise, GymWorkoutLog } from '@/types/database';

interface GymViewProps {
  exercises: GymExercise[];
  logs: GymWorkoutLog[];
  onAddSet: (logData: { exercise_id: string; set_number: number; reps: number; weight_kg: number; rpe?: number }) => Promise<void>;
}

export const GymView: React.FC<GymViewProps> = ({ exercises, logs, onAddSet }) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(exercises[0]?.id || '');
  const [reps, setReps] = useState<number>(10);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [rpe, setRpe] = useState<number>(8);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'routine' | 'history'>('routine');

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) || exercises[0];

  // Calcular el número de serie siguiente para el ejercicio seleccionado hoy
  const currentExerciseLogs = logs.filter((l) => l.exercise_id === selectedExerciseId);
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

  const strengthExercises = exercises.filter((e) => !e.is_stretch);
  const stretchExercises = exercises.filter((e) => e.is_stretch);

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Fuerza & Gimnasio</h1>
          <p className="text-xs text-zinc-400">Plan diario, sobrecarga progresiva y estiramientos</p>
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
            Series ({logs.length})
          </button>
        </div>
      </div>

      {activeTab === 'routine' ? (
        <>
          {/* PANEL RÁPIDO PARA REGISTRAR SERIE */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-orange-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Registrar Nueva Serie #{nextSetNumber}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {currentExerciseLogs.length} series registradas hoy
              </span>
            </div>

            {/* Selector de Ejercicio */}
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Ejercicio</label>
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
              >
                {strengthExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Repeticiones y Peso */}
            <div className="grid grid-cols-2 gap-3">
              {/* Peso */}
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
                  {[2.5, 5, 10].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setWeightKg((w) => w + inc)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white"
                    >
                      +{inc}
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
                <div className="flex justify-center gap-1 mt-2">
                  <span className="text-[9px] text-zinc-500">RPE Esfuerzo: {rpe}/10</span>
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
              {isSaving ? 'Guardando...' : 'Guardar Serie'}
            </button>
          </div>

          {/* CHECKLIST DE LA RUTINA DEL DÍA */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Ejercicios de la Sesión
            </h3>
            <div className="space-y-2">
              {strengthExercises.map((ex) => {
                const completedSets = logs.filter((l) => l.exercise_id === ex.id);
                const isDone = completedSets.length >= 3;

                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExerciseId(ex.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      selectedExerciseId === ex.id
                        ? 'bg-zinc-900/80 border-orange-500/60'
                        : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : completedSets.length}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                        <p className="text-[10px] text-zinc-500">{ex.category} • 3-4 series objetivo</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {completedSets.length > 0
                        ? `${completedSets[completedSets.length - 1].weight_kg} kg`
                        : 'Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RUTINA DE ESTIRAMIENTOS Y MOVILIDAD */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Movilidad & Estiramientos Diarios
            </h3>
            <div className="space-y-2">
              {stretchExercises.map((st) => (
                <div
                  key={st.id}
                  className="p-2.5 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-300 font-medium">{st.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-bold">
                    60 seg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* HISTORIAL DE SERIES REGISTRADAS HOY */
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Series Completadas Hoy
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No hay series registradas aún hoy.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const ex = exercises.find((e) => e.id === log.exercise_id);
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{ex?.name || 'Ejercicio'}</h4>
                      <p className="text-[10px] text-zinc-400">
                        Serie #{log.set_number} • RPE {log.rpe || 8}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-orange-400">{log.weight_kg} kg</span>
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
