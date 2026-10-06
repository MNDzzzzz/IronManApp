'use client';

// ====================================================================
// MODAL DE GESTIÓN Y PERSONALIZACIÓN DE EJERCICIOS: IronManApp
// Permite añadir ejercicios a un día de entrenamiento (especialmente Full Body),
// editar pesos objetivo, series y repeticiones, o eliminar ejercicios.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
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
    setCategory(ex.category as any || 'Fuerza');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="liquid-glass-card bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D68C4]/15 border border-[#2D68C4]/30 flex items-center justify-center text-[#2D68C4]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Ejercicios: {day}</h2>
              <p className="text-xs text-[var(--text-secondary)]">Personaliza y adapta los movimientos de tu microciclo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`m-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modo Lista */}
        {activeMode === 'list' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                {dayExercises.length} ejercicio{dayExercises.length !== 1 ? 's' : ''} configurado{dayExercises.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={startAddMode}
                className="py-1.5 px-3 rounded-xl bg-[#2D68C4] hover:bg-[#1E4E96] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Ejercicio
              </button>
            </div>

            <div className="space-y-2">
              {dayExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between hover:border-[#2D68C4]/40 transition-colors"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{ex.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium">
                        {ex.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">
                      {ex.target_sets ?? 3} series × {ex.target_reps ?? '8-10'} • {ex.current_weight_kg && ex.current_weight_kg > 0 ? `${ex.current_weight_kg} kg` : 'Peso corporal'}
                    </p>
                    {ex.notes && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 italic">{ex.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditMode(ex)}
                      className="w-8 h-8 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors active:scale-95"
                      title="Editar ejercicio"
                      aria-label="Editar ejercicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id, ex.name)}
                      className="w-8 h-8 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-rose-500 flex items-center justify-center transition-colors active:scale-95"
                      title="Eliminar ejercicio"
                      aria-label="Eliminar ejercicio"
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
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {activeMode === 'add' ? 'Nuevo Ejercicio' : 'Modificar Ejercicio'}
              </h3>
              <button
                onClick={() => setActiveMode('list')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Volver a la lista
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Nombre del ejercicio</label>
              <input
                type="text"
                placeholder="Ej: Peso Muerto Rumano con Mancuernas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Categoría muscular</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4]"
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
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Peso de referencia (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={currentWeightKg || ''}
                  onChange={(e) => setCurrentWeightKg(Number(e.target.value))}
                  placeholder="0 para corporal"
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Series objetivo</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={targetSets}
                  onChange={(e) => setTargetSets(Number(e.target.value))}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Repeticiones objetivo</label>
                <input
                  type="text"
                  placeholder="Ej: 8-10 reps (RIR 1-2)"
                  value={targetReps}
                  onChange={(e) => setTargetReps(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 block">Instrucciones o notas biomecánicas</label>
              <input
                type="text"
                placeholder="Ej: Cadera atrás, espalda neutra, pausa isométrica abajo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2D68C4]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveMode('list')}
                className="flex-1 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveExercise}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#2D68C4] hover:bg-[#1E4E96] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
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
