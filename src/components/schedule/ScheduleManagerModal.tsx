'use client';

// ====================================================================
// MODAL DE GESTIÓN MODULAR DE CALENDARIO Y RUTINAS: IronManApp
// Permite intercambiar días de entrenamiento (swap), reasignar la sesión
// de hoy sobre la marcha ante imprevistos/dolores y resetear al plan original.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Footprints,
  Coffee,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para Intercambio (Swap)
  const [swapDate1, setSwapDate1] = useState(yesterdayStr);
  const [swapDate2, setSwapDate2] = useState(todayStr);
  const [swapNotes, setSwapNotes] = useState('Intercambio por imprevisto o clima');

  // Estados para Reasignación directa de sesión
  const [reassignDate, setReassignDate] = useState(defaultDate || todayStr);
  const [selectedRoutineKey, setSelectedRoutineKey] = useState<RoutineKey>('strength_torso');
  const [reassignNotes, setReassignNotes] = useState('');

  useEffect(() => {
    if (defaultDate) {
      setReassignDate(defaultDate);
      setSwapDate2(defaultDate);
    }
    setFeedback(null);
  }, [defaultDate, isOpen]);

  if (!isOpen) return null;

  // Ejecutar Intercambio (Swap)
  const handleExecuteSwap = async () => {
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
          notes: swapNotes || 'Intercambio desde interfaz Web',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al intercambiar días');
      }

      setFeedback({
        type: 'success',
        message: data.message || `¡Días intercambiados con éxito entre ${swapDate1} y ${swapDate2}!`,
      });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ejecutar Reasignación de sesión
  const handleExecuteReassign = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const routineOpt = ROUTINE_OPTIONS.find((r) => r.key === selectedRoutineKey);
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_day',
          date: reassignDate,
          routineKey: selectedRoutineKey,
          title: routineOpt?.label,
          description: routineOpt?.description,
          notes: reassignNotes || 'Sesión reasignada manualmente',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al reasignar sesión');
      }

      setFeedback({
        type: 'success',
        message: `¡Sesión adaptada a "${routineOpt?.label}" para el ${reassignDate}!`,
      });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ejecutar Restauración al plan canónico
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestor Modular de Rutinas</h2>
              <p className="text-xs text-zinc-400">Adapta el plan ante imprevistos, molestias o disponibilidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Acción */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/20 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('swap'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'swap'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Intercambiar Días
          </button>
          <button
            onClick={() => { setActiveTab('reassign'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'reassign'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Cambiar Sesión
          </button>
          <button
            onClick={() => { setActiveTab('reset'); setFeedback(null); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'reset'
                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
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
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
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

          {/* PESTAÑA 1: INTERCAMBIAR DÍAS (SWAP) */}
          {activeTab === 'swap' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  Sincronización Total Biomecánica
                </p>
                <p>
                  Si ayer fuiste al gimnasio en vez de correr y hoy quieres correr, intercambia las dos fechas.
                  Los topes de pasos y descansos se reorganizarán automáticamente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                    Día Origen
                  </label>
                  <input
                    type="date"
                    value={swapDate1}
                    onChange={(e) => setSwapDate1(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSwapDate1(yesterdayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        swapDate1 === yesterdayStr
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Ayer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapDate1(todayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        swapDate1 === todayStr
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                    Día Destino
                  </label>
                  <input
                    type="date"
                    value={swapDate2}
                    onChange={(e) => setSwapDate2(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSwapDate2(todayStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        swapDate2 === todayStr
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapDate2(tomorrowStr)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        swapDate2 === tomorrowStr
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Mañana
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Motivo o Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lluvia exterior, molestia en rodilla o disponibilidad de gym"
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleExecuteSwap}
                disabled={isSubmitting || swapDate1 === swapDate2}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
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
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Fecha a modificar
                </label>
                <input
                  type="date"
                  value={reassignDate}
                  onChange={(e) => setReassignDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                  Selecciona la sesión a programar
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {ROUTINE_OPTIONS.map((opt) => (
                    <div
                      key={opt.key}
                      onClick={() => setSelectedRoutineKey(opt.key)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        selectedRoutineKey === opt.key
                          ? 'bg-orange-500/10 border-orange-500/50 shadow-md'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl mt-0.5">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white">{opt.label}</p>
                          <span className="text-[10px] font-semibold text-orange-400">{opt.category}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{opt.description}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-mono">👟 Meta: {opt.stepsTarget}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Motivo de la adaptación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio por pinchazo en tendón o horario de trabajo"
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleExecuteReassign}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Guardando adaptación...' : 'Aplicar Nueva Sesión al Día'}
              </button>
            </div>
          )}

          {/* PESTAÑA 3: RESTABLECER AL PLAN ORIGINAL */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Restaurar Programación Oficial
                </p>
                <p>
                  Elimina cualquier cambio manual o intercambio aplicado sobre esta fecha y devuelve la sesión a
                  la planificación original de la semana:
                </p>
                <ul className="text-zinc-400 text-[11px] space-y-1 list-disc pl-4">
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
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Fecha a restaurar
                </label>
                <input
                  type="date"
                  value={reassignDate}
                  onChange={(e) => setReassignDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <button
                onClick={handleExecuteReset}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                {isSubmitting ? 'Restaurando...' : 'Restablecer Día a la Rutina Base'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
