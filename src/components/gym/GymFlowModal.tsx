'use client';

// ====================================================================
// GIMNASIO: MODO ENFOQUE EN SALA (Gym Flow Mode)
// Pantalla completa inmersiva de alto contraste para entrenar con guantes y sudor.
// - Registro táctil a 1-tap con sobrecarga progresiva pre-llenada.
// - Temporizador de descanso inter-series con pulso visual y vibración háptica.
// - Selector de RPE táctil (Escala Borg / RIR).
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  Flame,
  Volume2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GymExercise, GymWorkoutLog } from '@/types/database';
import { RPE_SCALE, calculateOverloadOptions, getExerciseReferenceSet, OverloadOption } from '@/lib/gymOverload';

interface GymFlowModalProps {
  exercise: GymExercise;
  allExercises: GymExercise[];
  todayLogs: GymWorkoutLog[];
  allHistoricalLogs: GymWorkoutLog[];
  todayDateStr: string;
  onLogSet: (setNumber: number, weightKg: number, reps: number, rpe?: number) => Promise<void>;
  onClose: () => void;
  onSelectExercise: (exercise: GymExercise) => void;
}

export const GymFlowModal: React.FC<GymFlowModalProps> = ({
  exercise,
  allExercises,
  todayLogs,
  allHistoricalLogs,
  todayDateStr,
  onLogSet,
  onClose,
  onSelectExercise,
}) => {
  // Series ya registradas para este ejercicio hoy
  const currentExerciseLogs = todayLogs.filter(
    (l) => l.exercise_id === exercise.id
  );
  const nextSetNumber = currentExerciseLogs.length + 1;

  // Opciones de sobrecarga progresiva (P1.2)
  const refSet = getExerciseReferenceSet(exercise.id, exercise, allHistoricalLogs, todayDateStr);
  const overloadOptions: OverloadOption[] = calculateOverloadOptions(refSet);

  // Estados de entrada para la serie actual
  const defaultOption = overloadOptions[0] || { weight_kg: 20, reps: 10, rpe: 8 };
  const [weightKg, setWeightKg] = useState<number>(defaultOption.weight_kg);
  const [reps, setReps] = useState<number>(defaultOption.reps);
  const [selectedRpe, setSelectedRpe] = useState<number>(defaultOption.rpe || 8);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estados del temporizador de descanso
  const [restPresetSeconds, setRestPresetSeconds] = useState<number>(90);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isRestCompletedPulse, setIsRestCompletedPulse] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);

  // Activar vibración háptica segura
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // Fallback silencioso si el navegador o sistema no soporta vibración
      }
    }
  }, []);

  // Manejo del temporizador con cálculo delta seguro contra background throttling
  useEffect(() => {
    if (isTimerRunning && targetEndTimeRef.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((targetEndTimeRef.current! - now) / 1000));
        setRemainingSeconds(diff);

        if (diff <= 0) {
          setIsTimerRunning(false);
          setIsRestCompletedPulse(true);
          triggerHaptic();
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, triggerHaptic]);

  // Iniciar descanso
  const startRestTimer = (seconds: number) => {
    setRestPresetSeconds(seconds);
    setRemainingSeconds(seconds);
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setIsRestCompletedPulse(false);
    setIsTimerRunning(true);
  };

  // Añadir +30s al temporizador
  const handleAdd30Seconds = () => {
    const newRemaining = remainingSeconds + 30;
    setRemainingSeconds(newRemaining);
    targetEndTimeRef.current = Date.now() + newRemaining * 1000;
    setIsRestCompletedPulse(false);
    setIsTimerRunning(true);
  };

  // Saltar descanso
  const handleSkipRest = () => {
    setIsTimerRunning(false);
    setRemainingSeconds(0);
    setIsRestCompletedPulse(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Registrar la serie actual (1-Tap)
  const handleCommitSet = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onLogSet(nextSetNumber, weightKg, reps, selectedRpe);
      // Iniciar descanso automático inter-series
      startRestTimer(restPresetSeconds);
    } catch (err) {
      console.error('Error registrando serie en Gym Flow:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navegación entre ejercicios
  const currentIdx = allExercises.findIndex((e) => e.id === exercise.id);
  const prevExercise = currentIdx > 0 ? allExercises[currentIdx - 1] : null;
  const nextExercise = currentIdx < allExercises.length - 1 ? allExercises[currentIdx + 1] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gym-flow-title"
      className="fixed inset-0 z-[100] bg-[#0A0D14]/95 backdrop-blur-xl text-white flex flex-col justify-between p-4 sm:p-6 pb-12 sm:pb-8 overflow-y-auto select-none animate-apple-fade-in"
    >
      {/* Barra Superior de Control */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
            GYM FLOW MODE • EN SALA
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar modo Gym Flow"
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-zinc-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navegación y Cabecera del Ejercicio */}
      <div className="my-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <button
            onClick={() => prevExercise && onSelectExercise(prevExercise)}
            disabled={!prevExercise}
            className="flex items-center gap-1 disabled:opacity-20 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="font-mono">
            Ejercicio {currentIdx + 1} de {allExercises.length}
          </span>
          <button
            onClick={() => nextExercise && onSelectExercise(nextExercise)}
            disabled={!nextExercise}
            className="flex items-center gap-1 disabled:opacity-20 active:scale-95"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <h2 id="gym-flow-title" className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {exercise.name}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
            Objetivo: {exercise.target_sets || 4} series × {exercise.target_reps || '8-10'}
          </span>
          {exercise.category && (
            <span className="text-xs text-zinc-400">{exercise.category}</span>
          )}
        </div>
      </div>

      {/* Tarjeta Central: Serie en Curso y Contador Gigante */}
      <div className="my-3 p-4 rounded-3xl bg-white/5 border border-white/10 text-center space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Serie en Ejecución
          </span>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            Completadas hoy: {currentExerciseLogs.length}
          </span>
        </div>

        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-emerald-400">
          SERIE #{nextSetNumber}
        </div>

        {/* Ajuste Rápido de Peso y Repeticiones (Números Grandes) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Columna Peso */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
              Carga (kg)
            </span>
            <div className="text-3xl font-black font-mono text-white mb-2">
              {weightKg} <span className="text-base text-zinc-400 font-normal">kg</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setWeightKg((w) => Math.max(0, Number((w - 2.5).toFixed(1))))}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-black text-lg flex items-center justify-center"
              >
                -
              </button>
              <button
                onClick={() => setWeightKg((w) => Number((w + 2.5).toFixed(1)))}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-black text-lg flex items-center justify-center text-emerald-400"
              >
                +
              </button>
            </div>
          </div>

          {/* Columna Repeticiones */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
              Reps Efectivas
            </span>
            <div className="text-3xl font-black font-mono text-white mb-2">
              {reps} <span className="text-base text-zinc-400 font-normal">reps</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setReps((r) => Math.max(1, r - 1))}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-black text-lg flex items-center justify-center"
              >
                -
              </button>
              <button
                onClick={() => setReps((r) => r + 1)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-black text-lg flex items-center justify-center text-amber-400"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Atajos de Sobrecarga Progresiva (P1.2) */}
        <div className="pt-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
            Sobrecarga Automática Sugerida (1-Tap)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {overloadOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  setWeightKg(opt.weight_kg);
                  setReps(opt.reps);
                  if (opt.rpe) setSelectedRpe(opt.rpe);
                }}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                  weightKg === opt.weight_kg && reps === opt.reps
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="truncate text-[11px]">{opt.label}</div>
                <div className="text-[10px] opacity-80">{opt.weight_kg}k × {opt.reps}r</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selector Táctil de RPE (6 al 10) */}
        <div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
            Esfuerzo Percibido (RPE)
          </span>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {RPE_SCALE.slice(2).map((item) => (
              <button
                key={item.value}
                onClick={() => setSelectedRpe(item.value)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-center border font-mono transition-all ${
                  selectedRpe === item.value
                    ? 'bg-amber-400 text-black border-amber-300 font-black'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-xs">{item.value}</div>
                <div className="text-[9px] opacity-80">{item.badge}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Temporizador de Descanso Inter-Series */}
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isRestCompletedPulse
            ? 'bg-emerald-500/20 border-emerald-400 shadow-xl shadow-emerald-500/30'
            : isTimerRunning
            ? 'bg-white/10 border-amber-400/50'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isTimerRunning ? 'text-amber-400 animate-spin' : 'text-zinc-400'}`} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              Descanso Inter-Series
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono">
            {[60, 90, 120, 180].map((s) => (
              <button
                key={s}
                onClick={() => startRestTimer(s)}
                className={`px-2 py-0.5 rounded-lg text-[10px] border ${
                  restPresetSeconds === s && isTimerRunning
                    ? 'bg-amber-400 text-black border-amber-300 font-bold'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Visualización del Tiempo Restante */}
        {isTimerRunning ? (
          <div className="flex items-center justify-between">
            <div className="text-3xl font-black font-mono text-amber-400">
              {Math.floor(remainingSeconds / 60)}:
              {String(remainingSeconds % 60).padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd30Seconds}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold"
              >
                +30s
              </button>
              <button
                onClick={handleSkipRest}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold"
              >
                Saltar
              </button>
            </div>
          </div>
        ) : isRestCompletedPulse ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> ¡Descanso completado! A por la siguiente serie.
            </span>
            <button
              onClick={() => setIsRestCompletedPulse(false)}
              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold"
            >
              OK
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Temporizador en espera. Se iniciará al registrar la serie.</span>
            <button
              onClick={() => startRestTimer(restPresetSeconds)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
            >
              Iniciar {restPresetSeconds}s
            </button>
          </div>
        )}
      </div>

      {/* Botón Gigante: REGISTRAR SERIE (1-TAP) */}
      <div className="mt-3">
        <button
          onClick={handleCommitSet}
          disabled={isSubmitting}
          className="w-full py-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-98 disabled:opacity-50 text-black font-black text-lg sm:text-xl flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/30 transition-all uppercase tracking-wide"
        >
          {isSubmitting ? (
            'Guardando Serie...'
          ) : (
            <>
              <Check className="w-6 h-6 stroke-[3]" /> Registrar Serie #{nextSetNumber} (1-Tap)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
