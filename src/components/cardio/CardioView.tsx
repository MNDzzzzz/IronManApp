'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Heart,
  Zap,
  ChevronRight,
  X,
  Activity,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Camera,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CardioActivity } from '@/types/database';
import { StravaUploadModal } from '@/components/workout/StravaUploadModal';

interface CardioViewProps {
  activities: CardioActivity[];
  selectedActivity: CardioActivity | null;
  onSelectActivity: (act: CardioActivity | null) => void;
  onRefresh?: () => void;
}

export const CardioView: React.FC<CardioViewProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
  onRefresh,
}) => {
  const [activeMetric, setActiveMetric] = useState<'all' | 'hr' | 'alt'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStravaModalOpen, setIsStravaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario para registrar rodaje Fit3
  const [formName, setFormName] = useState('Rodaje CaCo 4.0 km (Galaxy Fit3)');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [formDistanceKm, setFormDistanceKm] = useState('4.0');
  const [formDurationMin, setFormDurationMin] = useState('32');
  const [formAvgHr, setFormAvgHr] = useState('142');
  const [formMaxHr, setFormMaxHr] = useState('156');
  const [formCadence, setFormCadence] = useState('168');
  const [formNotes, setFormNotes] = useState('Intervalos CaCo: 3 min trote suave + 1 min andar ágil. Cero molestias articulares.');

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const distanceMeters = Math.round(parseFloat(formDistanceKm) * 1000);
      const elapsedSeconds = Math.round(parseFloat(formDurationMin) * 60);
      const avgHr = formAvgHr ? parseInt(formAvgHr, 10) : undefined;
      const maxHr = formMaxHr ? parseInt(formMaxHr, 10) : undefined;
      const avgCadence = formCadence ? parseInt(formCadence, 10) : 168;

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: 'Run',
          start_date: new Date(formDate).toISOString(),
          distance: distanceMeters,
          elapsed_time: elapsedSeconds,
          moving_time: elapsedSeconds,
          avg_hr: avgHr,
          max_hr: maxHr,
          avg_cadence: avgCadence,
          source: 'galaxy_fit3',
          notes: formNotes,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error registrando rodaje:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-1 pt-1 font-sans">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Cardio & Rodajes</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-pill text-[#FC5200] font-bold font-mono">
              GALAXY FIT3
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">Preparación Media Maratón 28 Feb 2027</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStravaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl liquid-glass-pill text-[#FC5200] border border-[#FC5200]/30 font-bold text-xs hover:bg-[#FC5200]/10 active:scale-95 transition-all"
            title="Escanear captura de Strava o Garmin con IA"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Escanear Strava</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FC5200] text-white font-bold text-xs shadow-md shadow-[#FC5200]/25 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Manual</span>
          </button>
        </div>
      </div>

      {/* TARJETA BIOMECÁNICA: OBJETIVO ZONA 2 (101 KG) */}
      <div className="p-4 rounded-3xl liquid-glass-card space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#FC5200]/15 flex items-center justify-center text-[#FC5200]">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#FC5200]">
                Fase 1: Base Aeróbica y CaCo
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">Control de impacto para peso de 101 kg</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full liquid-glass-pill text-emerald-600 dark:text-emerald-400 font-bold">
            Z2: 130-145 bpm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="liquid-glass-pill p-2">
            <span className="text-[10px] text-[var(--text-tertiary)] block">Cadencia Meta</span>
            <span className="text-xs font-bold text-[var(--text-primary)] font-mono">165-175</span>
            <span className="text-[9px] text-[var(--text-secondary)] block">ppm (pasos cortos)</span>
          </div>
          <div className="liquid-glass-pill p-2">
            <span className="text-[10px] text-[var(--text-tertiary)] block">Estrategia</span>
            <span className="text-xs font-bold text-amber-500">Método CaCo</span>
            <span className="text-[9px] text-[var(--text-secondary)] block">Caminar / Correr</span>
          </div>
          <div className="liquid-glass-pill p-2">
            <span className="text-[10px] text-[var(--text-tertiary)] block">Protección</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Tendón / Rodilla</span>
            <span className="text-[9px] text-[var(--text-secondary)] block">Impacto mínimo</span>
          </div>
        </div>
      </div>

      {/* LISTA DE ACTIVIDADES */}
      {activities.length === 0 ? (
        <div className="p-8 rounded-3xl liquid-glass-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FC5200]/15 text-[#FC5200] flex items-center justify-center mx-auto text-2xl">
            🏃
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Sin rodajes registrados</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              Tus rodajes y sesiones CaCo aparecerán aquí al escanear capturas de Strava con la IA, sincronizar tu pulsera o registrarlos manualmente.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsStravaModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FC5200] text-white font-bold text-xs shadow-md shadow-[#FC5200]/25 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear Captura Strava</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl liquid-glass-pill text-[var(--text-primary)] font-semibold text-xs border border-[var(--glass-border)] active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registro Manual</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const distanceKm = (activity.distance / 1000).toFixed(2);
            const paceMinPerKm = activity.moving_time && activity.distance > 0
              ? ((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(2)
              : '5.30';

            const isHighHr = (activity.avg_hr || 0) > 158;
            const cadence = activity.avg_cadence || 168;

            return (
              <div
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className="p-4 rounded-3xl liquid-glass-card hover:border-[#FC5200]/40 active:scale-[0.98] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-[#FC5200]/15 flex items-center justify-center text-[#FC5200] font-bold text-sm">
                      🏃
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{activity.name}</h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        {new Date(activity.start_date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activity.source === 'strava_screenshot'
                        ? 'bg-[#FC5200]/15 text-[#FC5200]'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {activity.source === 'strava_screenshot' ? 'Strava' : 'Fit3 OK'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                </div>

                {/* Métricas Principales */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--glass-border)] text-center">
                  <div className="liquid-glass-pill p-2">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Distancia</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{distanceKm} km</span>
                  </div>
                  <div className="liquid-glass-pill p-2">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Ritmo</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{paceMinPerKm} /km</span>
                  </div>
                  <div className="liquid-glass-pill p-2">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Cadencia</span>
                    <span className="text-xs font-bold text-amber-500 font-mono">{cadence} ppm</span>
                  </div>
                  <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] text-rose-500 block">Pulso Medio</span>
                    <span className="text-xs font-bold text-rose-500 font-mono">{activity.avg_hr || 142} bpm</span>
                  </div>
                </div>

                {/* Nota o alerta biomecánica */}
                {isHighHr ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Pulso superior a Zona 2. Añade más minutos caminando para cuidar tus articulaciones (101 kg).</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Zona aeróbica perfecta (Z2). Rodillas y tendón rotuliano protegidos.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA REGISTRAR RODAJE FIT3 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md liquid-glass-card bg-[var(--glass-surface-thick)] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Registrar Rodaje Fit3</h2>
                <p className="text-xs text-[var(--text-secondary)]">Datos obtenidos de tu Samsung Galaxy Fit3</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-full liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Nombre de la sesión</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDistanceKm}
                    onChange={(e) => setFormDistanceKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    value={formDurationMin}
                    onChange={(e) => setFormDurationMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">FC Media (bpm)</label>
                  <input
                    type="number"
                    value={formAvgHr}
                    onChange={(e) => setFormAvgHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">FC Máx (bpm)</label>
                  <input
                    type="number"
                    value={formMaxHr}
                    onChange={(e) => setFormMaxHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Cadencia (ppm)</label>
                  <input
                    type="number"
                    value={formCadence}
                    onChange={(e) => setFormCadence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Sensaciones & Notas Biomecánicas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl liquid-glass-pill text-[var(--text-secondary)] text-xs font-bold hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#FC5200] text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-[#FC5200]/25"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Rodaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE ACTIVIDAD CON GRÁFICA MULTICAPA */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md overflow-y-auto pb-24 pt-[env(safe-area-inset-top,20px)] px-4 animate-in fade-in duration-200">
          <div className="max-w-md mx-auto space-y-4 liquid-glass-card bg-[var(--glass-surface-thick)] p-5 rounded-3xl">
            {/* Header del Modal */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectActivity(null)}
                className="p-2 rounded-full liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                {selectedActivity.source === 'strava_screenshot' ? 'Telemetría Strava' : 'Detalle Galaxy Fit3'}
              </span>
              <div className="w-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedActivity.name}</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {new Date(selectedActivity.start_date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>

            {/* Grid 4 Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Distancia</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{(selectedActivity.distance / 1000).toFixed(2)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">km</span>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Tiempo</span>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{Math.round(selectedActivity.elapsed_time / 60)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">min</span>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Cadencia</span>
                <span className="text-sm font-bold text-amber-500 font-mono">{selectedActivity.avg_cadence || 168}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">ppm</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[10px] text-rose-500 block">FC Media</span>
                <span className="text-sm font-bold text-rose-500 font-mono">{selectedActivity.avg_hr || 142}</span>
                <span className="text-[9px] text-rose-400 block">bpm</span>
              </div>
            </div>

            {/* Notas Biomecánicas */}
            {selectedActivity.notes && (
              <div className="p-3.5 rounded-2xl liquid-glass-pill text-xs text-[var(--text-secondary)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FC5200] tracking-wider block">
                  Notas de la sesión & Biomecánica
                </span>
                <p className="leading-relaxed text-[var(--text-primary)]">{selectedActivity.notes}</p>
              </div>
            )}

            {/* Parciales por Kilómetro (Splits Strava) */}
            {selectedActivity.splits && selectedActivity.splits.length > 0 && (
              <div className="p-4 rounded-3xl liquid-glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#FC5200]/15 flex items-center justify-center text-[#FC5200]">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Parciales por Kilómetro (Splits)
                      </h3>
                      <p className="text-[10px] text-[var(--text-secondary)]">Ritmo exacto detectado de Strava</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full liquid-glass-pill text-[#FC5200] font-bold">
                    {selectedActivity.splits.length} km
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedActivity.splits.map((split) => (
                    <div
                      key={split.km}
                      className="flex items-center justify-between p-2.5 rounded-2xl liquid-glass-pill text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-xl bg-[#FC5200]/15 text-[#FC5200] font-bold text-[11px] flex items-center justify-center font-mono">
                          {split.km}k
                        </span>
                        <span className="font-bold text-[var(--text-primary)] font-mono">{split.pace}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {split.avg_hr && (
                          <span className="text-[10px] font-mono text-rose-500 font-semibold">
                            {split.avg_hr} bpm
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Subir y Analizar Capturas de Strava con IA */}
      <StravaUploadModal
        isOpen={isStravaModalOpen}
        onClose={() => setIsStravaModalOpen(false)}
        onActivitySaved={() => {
          setIsStravaModalOpen(false);
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
