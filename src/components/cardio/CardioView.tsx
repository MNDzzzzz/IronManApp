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
  ShieldAlert,
  Flame,
  Gauge,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CardioActivity } from '@/types/database';

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
      const distanceMeters = Math.round((parseFloat(formDistanceKm) || 4.0) * 1000);
      const elapsedSeconds = Math.round((parseFloat(formDurationMin) || 30) * 60);
      const avgHr = parseInt(formAvgHr, 10) || 142;
      const maxHr = parseInt(formMaxHr, 10) || 155;
      const avgCadence = parseInt(formCadence, 10) || 168;

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
    <div className="space-y-4 pb-24 px-4 pt-2">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Cardio & Rodajes</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-400 border border-orange-800/50 font-bold uppercase">
              Galaxy Fit3
            </span>
          </div>
          <p className="text-xs text-zinc-400">Preparación Media Maratón 28 Feb 2027</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Registrar Rodaje</span>
        </button>
      </div>

      {/* TARJETA BIOMECÁNICA: OBJETIVO ZONA 2 (101 KG) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-orange-500/20 shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs uppercase font-black tracking-wider text-orange-400">
                Fase 1: Base Aeróbica y CaCo
              </span>
              <p className="text-[11px] text-zinc-400">Control de impacto para peso de 101 kg</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400">
            Z2: 130-145 bpm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-zinc-900/60 p-2 rounded-2xl border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block">Cadencia Meta</span>
            <span className="text-xs font-black text-white">165-175</span>
            <span className="text-[9px] text-zinc-400 block">ppm (pasos cortos)</span>
          </div>
          <div className="bg-zinc-900/60 p-2 rounded-2xl border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block">Estrategia</span>
            <span className="text-xs font-black text-amber-400">Método CaCo</span>
            <span className="text-[9px] text-zinc-400 block">Caminar / Correr</span>
          </div>
          <div className="bg-zinc-900/60 p-2 rounded-2xl border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block">Protección</span>
            <span className="text-xs font-black text-emerald-400">Tendón / Rodilla</span>
            <span className="text-[9px] text-zinc-400 block">Impacto mínimo</span>
          </div>
        </div>
      </div>

      {/* LISTA DE ACTIVIDADES */}
      {activities.length === 0 ? (
        <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-900 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto text-2xl">
            🏃
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">Sin rodajes registrados</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Tus rodajes y sesiones CaCo aparecerán aquí al sincronizar la Galaxy Fit3 por Health Connect o registrándolos manualmente con el botón superior.
            </p>
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
                className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 active:scale-98 transition-all cursor-pointer space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                      🏃
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{activity.name}</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono">
                      Fit3 OK
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                {/* Métricas Principales */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-900 text-center">
                  <div className="bg-zinc-900/40 rounded-xl p-2">
                    <span className="text-[10px] text-zinc-500 block">Distancia</span>
                    <span className="text-xs font-black text-white">{distanceKm} km</span>
                  </div>
                  <div className="bg-zinc-900/40 rounded-xl p-2">
                    <span className="text-[10px] text-zinc-500 block">Ritmo</span>
                    <span className="text-xs font-black text-white">{paceMinPerKm} /km</span>
                  </div>
                  <div className="bg-zinc-900/40 rounded-xl p-2">
                    <span className="text-[10px] text-zinc-500 block">Cadencia</span>
                    <span className="text-xs font-black text-amber-400">{cadence} ppm</span>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-2">
                    <span className="text-[10px] text-rose-400 block">Pulso Medio</span>
                    <span className="text-xs font-black text-rose-400">{activity.avg_hr || 142} bpm</span>
                  </div>
                </div>

                {/* Nota o alerta biomecánica */}
                {isHighHr ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Pulso superior a Zona 2. Añade más minutos caminando para cuidar tus articulaciones (101 kg).</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Registrar Rodaje Fit3</h2>
                <p className="text-xs text-zinc-400">Datos obtenidos de tu Samsung Galaxy Fit3</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nombre de la sesión</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDistanceKm}
                    onChange={(e) => setFormDistanceKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    value={formDurationMin}
                    onChange={(e) => setFormDurationMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">FC Media (bpm)</label>
                  <input
                    type="number"
                    value={formAvgHr}
                    onChange={(e) => setFormAvgHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">FC Máx (bpm)</label>
                  <input
                    type="number"
                    value={formMaxHr}
                    onChange={(e) => setFormMaxHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Cadencia (ppm)</label>
                  <input
                    type="number"
                    value={formCadence}
                    onChange={(e) => setFormCadence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Sensaciones & Notas Biomecánicas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-black disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl overflow-y-auto pb-24 pt-[env(safe-area-inset-top,20px)] px-4 animate-in fade-in duration-200">
          <div className="max-w-md mx-auto space-y-4">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onSelectActivity(null)}
                className="p-2 rounded-full bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Detalle Galaxy Fit3
              </span>
              <div className="w-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">{selectedActivity.name}</h2>
              <p className="text-xs text-zinc-400">
                {new Date(selectedActivity.start_date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>

            {/* Grid 4 Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-center">
                <span className="text-[10px] text-zinc-500 block">Distancia</span>
                <span className="text-sm font-black text-white">{(selectedActivity.distance / 1000).toFixed(2)}</span>
                <span className="text-[9px] text-zinc-400 block">km</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-center">
                <span className="text-[10px] text-zinc-500 block">Tiempo</span>
                <span className="text-sm font-black text-white">{Math.round(selectedActivity.elapsed_time / 60)}</span>
                <span className="text-[9px] text-zinc-400 block">min</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-center">
                <span className="text-[10px] text-zinc-500 block">Cadencia</span>
                <span className="text-sm font-black text-amber-400">{selectedActivity.avg_cadence || 168}</span>
                <span className="text-[9px] text-zinc-400 block">ppm</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-center">
                <span className="text-[10px] text-rose-400 block">FC Media</span>
                <span className="text-sm font-black text-rose-400">{selectedActivity.avg_hr || 142}</span>
                <span className="text-[9px] text-rose-300 block">bpm</span>
              </div>
            </div>

            {/* Notas Biomecánicas */}
            {selectedActivity.notes && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider block">
                  Notas de la sesión & Biomecánica
                </span>
                <p className="leading-relaxed">{selectedActivity.notes}</p>
              </div>
            )}

            {/* Perfil de Desnivel (Strava) */}
            {selectedActivity.elevation_profile && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Perfil de Desnivel & Relieve (Strava)
                </span>
                <p className="leading-relaxed text-[11px] text-zinc-300">{selectedActivity.elevation_profile}</p>
              </div>
            )}

            {/* Parciales por Kilómetro (Splits Strava) */}
            {selectedActivity.splits && selectedActivity.splits.length > 0 && (
              <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Parciales por Kilómetro (Splits)
                      </h3>
                      <p className="text-[10px] text-zinc-500">Ritmo exacto y desnivel detectados de Strava</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-orange-400 font-bold">
                    {selectedActivity.splits.length} km
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedActivity.splits.map((split) => {
                    return (
                      <div
                        key={split.km}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-[11px] flex items-center justify-center font-mono">
                            {split.km}k
                          </span>
                          <span className="font-bold text-white tracking-tight">{split.pace}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {split.elevation_diff_m !== undefined && split.elevation_diff_m !== null && (
                            <span
                              className={`text-[11px] font-mono flex items-center gap-0.5 ${
                                split.elevation_diff_m > 0
                                  ? 'text-amber-400'
                                  : split.elevation_diff_m < 0
                                  ? 'text-cyan-400'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {split.elevation_diff_m > 0 ? `+${split.elevation_diff_m}m` : `${split.elevation_diff_m}m`}
                            </span>
                          )}
                          {split.avg_hr && (
                            <span className="text-[10px] font-mono text-rose-400">
                              {split.avg_hr} bpm
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GRÁFICA MULTICAPA O TELEMETRÍA */}
            <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Telemetría Fit3
                  </h3>
                  <p className="text-[11px] text-zinc-500">Pulso continuo sensor Fit3</p>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-rose-400 font-bold">FC Fit3</span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                {selectedActivity.merged_hr_data && selectedActivity.merged_hr_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={selectedActivity.merged_hr_data}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="time"
                        tickFormatter={(v) => `${Math.round(v / 60)}m`}
                        stroke="#52525b"
                        fontSize={10}
                      />
                      <YAxis stroke="#52525b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#09090b',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                        formatter={(value: any) => [`${value} bpm`, 'Pulso Fit3']}
                        labelFormatter={(label) => `Minuto: ${(Number(label) / 60).toFixed(1)}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="bpm"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: '#f97316' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-2">
                    <Heart className="w-6 h-6 text-zinc-700 animate-pulse" />
                    <span>Pulso medio registrado: {selectedActivity.avg_hr || 142} bpm</span>
                  </div>
                )}
              </div>
            </div>

            {/* ZONAS DE FRECUENCIA CARDÍACA (Z1 A Z5) */}
            <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Distribución por Zonas Cardíacas
                </h3>
                <span className="text-[10px] text-zinc-500">Galaxy Fit3</span>
              </div>

              <div className="space-y-2">
                {[
                  { zone: 'Z5', label: 'Máximo (> 170 bpm)', pct: 5, color: 'bg-rose-600' },
                  { zone: 'Z4', label: 'Umbral (155 - 170 bpm)', pct: 15, color: 'bg-orange-500' },
                  { zone: 'Z3', label: 'Aeróbico (145 - 155 bpm)', pct: 20, color: 'bg-amber-400' },
                  { zone: 'Z2', label: 'Resistencia Base (130 - 145 bpm)', pct: 50, color: 'bg-emerald-500' },
                  { zone: 'Z1', label: 'Recuperación (< 130 bpm)', pct: 10, color: 'bg-blue-400' },
                ].map((z) => (
                  <div key={z.zone} className="flex items-center gap-3 text-xs">
                    <span className="w-7 font-mono font-bold text-zinc-400">{z.zone}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-400">{z.label}</span>
                        <span className="font-bold text-white">{z.pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${z.color}`} style={{ width: `${z.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
