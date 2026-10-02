'use client';

// ====================================================================
// MODAL DE GESTIÓN Y PERSONALIZACIÓN DE EJERCICIOS: IronManApp
// Permite añadir ejercicios a un día de entrenamiento (especialmente Full Body),
// editar pesos objetivo, series y repeticiones, o eliminar ejercicios.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState } from 'react';
import {
  X,
  Plus,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { GymExercise } from '@/types/database';

interface ExerciseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: 'Día 1: Torso' | 'Día 2: Pierna' | 'Día 3: Full Body';
  exercises: GymExercise[];
  onExerciseAdded?: (exercise: GymExercise) => void;
  onExerciseUpdated?: (exercise: GymExercise) => void;
  onExerciseDeleted?: (id: string) => void;
}

export const ExerciseManagerModal: React.FC<ExerciseManagerModalProps> = ({
  isOpen,
  onClose,
  day,
  exercises,
  onExerciseAdded,
  onExerciseUpdated,
  onExerciseDeleted,
}) => {
  const [activeMode, setActiveMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingEx, setEditingEx] = useState<GymExercise | null>(null);

  // Formulario
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Pecho' | 'Espalda' | 'Pierna' | 'Hombro' | 'Brazo' | 'Core' | 'Fuerza'>('Fuerza');
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState('8-10 reps');
  const [currentWeightKg, setCurrentWeightKg] = useState(0);
  const [restTime, setRestTime] = useState('2 min');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const dayExercises = exercises.filter(
    (e) => Boolean(e.day && e.day.toLowerCase().includes(day.toLowerCase())) && !e.is_stretch
  );

  const startAddMode = () => {
    setName('');
    setCategory(day === 'Día 1: Torso' ? 'Pecho' : day === 'Día 2: Pierna' ? 'Pierna' : 'Fuerza');
    setTargetSets(3);
    setTargetReps('8-10 reps');
    setCurrentWeightKg(0);
    setRestTime('2 min');
    setNotes('');
    setEditingEx(null);
    setActiveMode('add');
    setFeedback(null);
  };

  const startEditMode = (ex: GymExercise) => {
    setEditingEx(ex);
    setName(ex.name);
    setTargetSets(ex.target_sets ?? 3);
    setTargetReps(ex.target_reps ?? '8-10 reps');
    setCurrentWeightKg(ex.current_weight_kg ?? 0);
    setRestTime(ex.rest_time ?? '2 min');
    setNotes(ex.notes || '');
    setActiveMode('edit');
    setFeedback(null);
  };

  const handleSaveExercise = async () => {
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'El nombre del ejercicio es obligatorio.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (activeMode === 'add') {
        const res = await fetch('/api/gym/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            day,
            target_sets: targetSets,
            target_reps: targetReps,
            current_weight_kg: currentWeightKg,
            rest_time: restTime,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Error al guardar');

        if (onExerciseAdded) onExerciseAdded(data.exercise);
        setFeedback({ type: 'success', message: `¡Ejercicio "${data.exercise.name}" añadido con éxito!` });
        setActiveMode('list');
      } else if (activeMode === 'edit' && editingEx) {
        const res = await fetch('/api/gym/exercises', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEx.id,
            name,
            category,
            day,
            target_sets: targetSets,
            target_reps: targetReps,
            current_weight_kg: currentWeightKg,
            rest_time: restTime,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Error al actualizar');

        if (onExerciseUpdated) onExerciseUpdated(data.exercise);
        setFeedback({ type: 'success', message: '¡Ejercicio actualizado correctamente!' });
        setActiveMode('list');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExercise = async (id: string, exName: string) => {
    if (!confirm(`¿Eliminar el ejercicio "${exName}" de ${day}?`)) return;

    try {
      const res = await fetch(`/api/gym/exercises?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al eliminar');

      if (onExerciseDeleted) onExerciseDeleted(id);
      setFeedback({ type: 'success', message: `Ejercicio "${exName}" eliminado.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al eliminar' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ejercicios: {day}</h2>
              <p className="text-xs text-zinc-400">Personaliza y adapta los movimientos de tu microciclo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`m-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modo Lista */}
        {activeMode === 'list' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400">
                {dayExercises.length} ejercicio{dayExercises.length !== 1 ? 's' : ''} configurado{dayExercises.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={startAddMode}
                className="py-1.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Ejercicio
              </button>
            </div>

            <div className="space-y-2">
              {dayExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{ex.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                        {ex.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {ex.target_sets ?? 3} series × {ex.target_reps ?? '8-10'} • {ex.current_weight_kg && ex.current_weight_kg > 0 ? `${ex.current_weight_kg} kg` : 'Peso corporal'}
                    </p>
                    {ex.notes && <p className="text-[10px] text-zinc-500 mt-0.5 italic">{ex.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditMode(ex)}
                      className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                      title="Editar ejercicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id, ex.name)}
                      className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                      title="Eliminar ejercicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modo Formulario (Añadir / Editar) */}
        {(activeMode === 'add' || activeMode === 'edit') && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {activeMode === 'add' ? 'Nuevo Ejercicio' : 'Modificar Ejercicio'}
              </h3>
              <button
                onClick={() => setActiveMode('list')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Volver a la lista
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Nombre del ejercicio</label>
              <input
                type="text"
                placeholder="Ej: Peso Muerto Rumano con Mancuernas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Categoría muscular</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Pecho">Pecho</option>
                  <option value="Espalda">Espalda</option>
                  <option value="Pierna">Pierna</option>
                  <option value="Hombro">Hombro</option>
                  <option value="Brazo">Brazo</option>
                  <option value="Core">Core</option>
                  <option value="Fuerza">Fuerza General</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Peso de referencia (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={currentWeightKg || ''}
                  onChange={(e) => setCurrentWeightKg(Number(e.target.value))}
                  placeholder="0 para corporal"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Series objetivo</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={targetSets}
                  onChange={(e) => setTargetSets(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Repeticiones objetivo</label>
                <input
                  type="text"
                  placeholder="Ej: 8-10 reps (RIR 1-2)"
                  value={targetReps}
                  onChange={(e) => setTargetReps(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Instrucciones o notas biomecánicas</label>
              <input
                type="text"
                placeholder="Ej: Cadera atrás, espalda neutra, pausa isométrica abajo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveMode('list')}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveExercise}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmitting ? 'Guardando...' : activeMode === 'add' ? 'Añadir al Plan' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
