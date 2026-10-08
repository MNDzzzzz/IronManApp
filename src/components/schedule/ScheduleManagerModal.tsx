'use client';

// ====================================================================
// MODAL DE GESTIÓN MODULAR DE CALENDARIO Y RUTINAS: IronManApp
// Permite intercambiar días de entrenamiento (swap), reasignar la sesión
// de hoy sobre la marcha ante imprevistos/dolores y resetear al plan original.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import { RoutineKey } from '@/types/database';

interface ScheduleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
  defaultDate?: string;
}

interface RoutineOption {
  key: RoutineKey;
  label: string;
  category: string;
  stepsTarget: string;
  icon: string;
  description: string;
}

const ROUTINE_OPTIONS: RoutineOption[] = [
  {
    key: 'strength_torso',
    label: 'Fuerza Torso (Empuje + Tirón)',
    category: 'Fuerza',
    stepsTarget: '10.000 – 11.500 pasos',
    icon: '🏋️‍♂️',
    description: 'Press banca, remo polea baja, militar, jalón neutro. Cero estrés en rodilla.',
  },
  {
    key: 'strength_pierna',
    label: 'Fuerza Pierna Blindada',
    category: 'Fuerza',
    stepsTarget: '10.000 – 11.000 pasos',
    icon: '🦵',
    description: 'Wall-sits isométricos, prensa inclinada, abductores de cadera y gemelos.',
  },
  {
    key: 'strength_fullbody',
    label: 'Full Body Funcional + Descarga',
    category: 'Fuerza',
    stepsTarget: '10.000 – 12.000 pasos',
    icon: '⚡',
    description: 'Peso muerto rumano, clamshell, estímulo multiarticular y 20 min bici suave.',
  },
  {
    key: 'running_base',
    label: 'Carrera Rodaje Base (CaCo)',
    category: 'Cardio',
    stepsTarget: '12.000 – 14.000 pasos',
    icon: '🏃‍♂️',
    description: 'Volumen aeróbico suave en Zona 2 (>7:15 min/km) con cadencia alta (~168 ppm).',
  },
  {
    key: 'running_long',
    label: 'Tirada Larga CaCo',
    category: 'Cardio',
    stepsTarget: '14.000 – 16.000 pasos',
    icon: '🎯',
    description: 'Fondo cardiovascular progresivo con pausas de hidratación y amortiguación.',
  },
  {
    key: 'rest',
    label: 'Descanso Total & Descompresión',
    category: 'Descanso',
    stepsTarget: 'Máx. 8.000 – 9.000 pasos',
    icon: '🛑',
    description: 'Regeneración articular, desinflamación tendinosa y recarga de glucógeno.',
  },
];

export const ScheduleManagerModal: React.FC<ScheduleManagerModalProps> = ({
  isOpen,
  onClose,
  onScheduleUpdated,
  defaultDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'swap' | 'reassign' | 'reset'>('swap');

  // Estados para Intercambio (Swap)
  const [swapDate1, setSwapDate1] = useState(defaultDate || yesterdayStr);
  const [swapDate2, setSwapDate2] = useState(todayStr);
  const [swapNotes, setSwapNotes] = useState('');

  // Estados para Reasignación directa
  const [reassignDate, setReassignDate] = useState(defaultDate || todayStr);
  const [selectedRoutineKey, setSelectedRoutineKey] = useState<RoutineKey>('running_base');
  const [reassignNotes, setReassignNotes] = useState('');

  // Estado general de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bloqueo de scroll de fondo para comportamiento nativo Apple Bottom Sheet
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Ejecutar SWAP entre dos fechas
  const handleExecuteSwap = async () => {
    if (swapDate1 === swapDate2) {
      setFeedback({ type: 'error', message: 'Las fechas de origen y destino deben ser diferentes.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          date1: swapDate1,
          date2: swapDate2,
          notes: swapNotes || 'Intercambio manual de sesiones',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al intercambiar días');
      }

      setFeedback({
        type: 'success',
        message: `¡Sesiones intercambiadas con éxito entre ${swapDate1} y ${swapDate2}!`,
      });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ejecutar Reasignación directa de rutina
  const handleExecuteReassign = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          date: reassignDate,
          routineKey: selectedRoutineKey,
          notes: reassignNotes || 'Reasignación manual de rutina',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al adaptar sesión');
      }

      setFeedback({
        type: 'success',
        message: `¡Sesión del ${reassignDate} adaptada a "${ROUTINE_OPTIONS.find((r) => r.key === selectedRoutineKey)?.label}"!`,
      });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restaurar al plan original
  const handleExecuteReset = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          date: reassignDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al restaurar sesión');
      }

      setFeedback({
        type: 'success',
        message: `¡Sesión del ${reassignDate} restaurada al plan oficial original!`,
      });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in motion-reduce:transition-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-sheet rounded-t-[32px] sm:rounded-3xl border border-[var(--glass-border)] border-t border-t-white/30 dark:border-t-white/15 w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-apple-scale-in">
        {/* Tirador táctil Apple para Bottom Sheet en móvil */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Cabecera del Modal con borde especular y tipografía Apple */}
        <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-surface)]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D97757]/15 border border-[#D97757]/30 flex items-center justify-center text-[#D97757] shadow-inner">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] apple-title tracking-tight">Gestor Modular de Rutinas</h2>
              <p className="text-xs text-[var(--text-secondary)]">Adapta el plan ante imprevistos, molestias o disponibilidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors apple-pressable"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Acción Fluidas */}
        <div className="flex border-b border-[var(--glass-border)] bg-[var(--glass-surface)]/50 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('swap'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 apple-pressable ${
              activeTab === 'swap'
                ? 'border-[#D97757] text-[#D97757] bg-[#D97757]/10'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Intercambiar Días
          </button>
          <button
            onClick={() => { setActiveTab('reassign'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 apple-pressable ${
              activeTab === 'reassign'
                ? 'border-[#D97757] text-[#D97757] bg-[#D97757]/10'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Cambiar Sesión
          </button>
          <button
            onClick={() => { setActiveTab('reset'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 apple-pressable ${
              activeTab === 'reset'
                ? 'border-[#D97757] text-[#D97757] bg-[#D97757]/10'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Plan
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Alerta de Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-apple-fade-in ${
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

          {/* PESTAÑA 1: INTERCAMBIAR DÍAS (SWAP) */}
          {activeTab === 'swap' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
                  Sincronización Total Biomecánica
                </p>
                <p>
                  Si ayer fuiste al gimnasio en vez de correr y hoy quieres correr, intercambia las dos fechas.
                  Los topes de pasos y descansos se reorganizarán automáticamente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                    Día Origen
                  </label>
                  <input
                    type="date"
                    value={swapDate1}
                    onChange={(e) => setSwapDate1(e.target.value)}
                    className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757] font-mono tabular-nums"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSwapDate1(yesterdayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all apple-pressable tabular-nums ${
                        swapDate1 === yesterdayStr
                          ? 'bg-[#D97757]/20 border-[#D97757]/40 text-[#D97757] font-bold'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Ayer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapDate1(todayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all apple-pressable tabular-nums ${
                        swapDate1 === todayStr
                          ? 'bg-[#D97757]/20 border-[#D97757]/40 text-[#D97757] font-bold'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                    Día Destino
                  </label>
                  <input
                    type="date"
                    value={swapDate2}
                    onChange={(e) => setSwapDate2(e.target.value)}
                    className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757] font-mono tabular-nums"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSwapDate2(todayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all apple-pressable tabular-nums ${
                        swapDate2 === todayStr
                          ? 'bg-[#D97757]/20 border-[#D97757]/40 text-[#D97757] font-bold'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapDate2(tomorrowStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all apple-pressable tabular-nums ${
                        swapDate2 === tomorrowStr
                          ? 'bg-[#D97757]/20 border-[#D97757]/40 text-[#D97757] font-bold'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Mañana
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Motivo o Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lluvia exterior, molestia en rodilla o disponibilidad de gym"
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <button
                onClick={handleExecuteSwap}
                disabled={isSubmitting || swapDate1 === swapDate2}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D97757] to-[#C26243] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all apple-pressable apple-btn-spring disabled:opacity-50"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {isSubmitting ? 'Intercambiando días...' : 'Intercambiar Ambas Rutinas'}
              </button>
            </div>
          )}

          {/* PESTAÑA 2: REASIGNAR SESIÓN DIRECTA */}
          {activeTab === 'reassign' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Fecha a modificar
                </label>
                <input
                  type="date"
                  value={reassignDate}
                  onChange={(e) => setReassignDate(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757] font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2 block">
                  Selecciona la sesión a programar
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {ROUTINE_OPTIONS.map((opt) => (
                    <div
                      key={opt.key}
                      onClick={() => setSelectedRoutineKey(opt.key)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 apple-pressable ${
                        selectedRoutineKey === opt.key
                          ? 'bg-[#D97757]/15 border-[#D97757]/60 shadow-md ring-1 ring-[#D97757]/40'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] hover:border-[#D97757]/40'
                      }`}
                    >
                      <span className="text-xl mt-0.5">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</p>
                          <span className="text-[10px] font-semibold text-[#D97757]">{opt.category}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">{opt.description}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-mono tabular-nums">👟 Meta: {opt.stepsTarget}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Motivo de la adaptación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio por pinchazo en tendón o horario de trabajo"
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <button
                onClick={handleExecuteReassign}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D97757] to-[#C26243] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all apple-pressable apple-btn-spring disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Guardando adaptación...' : 'Aplicar Nueva Sesión al Día'}
              </button>
            </div>
          )}

          {/* PESTAÑA 3: RESTABLECER AL PLAN ORIGINAL */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] space-y-2">
                <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  Restaurar Programación Oficial
                </p>
                <p>
                  Elimina cualquier cambio manual o intercambio aplicado sobre esta fecha y devuelve la sesión a
                  la planificación original de la semana:
                </p>
                <ul className="text-[var(--text-secondary)] text-[11px] space-y-1 list-disc pl-4">
                  <li>Lunes: Fuerza Torso</li>
                  <li>Martes: Fuerza Pierna Blindada</li>
                  <li>Miércoles: Descanso Total</li>
                  <li>Jueves: Carrera Rodaje Base</li>
                  <li>Viernes: Fuerza Full Body Funcional</li>
                  <li>Sábado: Descanso Total</li>
                  <li>Domingo: Tirada Larga CaCo</li>
                </ul>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Fecha a restaurar
                </label>
                <input
                  type="date"
                  value={reassignDate}
                  onChange={(e) => setReassignDate(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#D97757] font-mono tabular-nums"
                />
              </div>

              <button
                onClick={handleExecuteReset}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 border border-[var(--glass-border)] transition-all apple-pressable apple-btn-spring disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                {isSubmitting ? 'Restaurando...' : 'Restablecer Día a la Rutina Base'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
