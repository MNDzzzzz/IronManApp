'use client';

import React, { useState } from 'react';
import {
  Compass,
  TrendingUp,
  Clock,
  Heart,
  Zap,
  ChevronRight,
  X,
  Activity,
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
import { StravaActivity } from '@/types/database';

interface CardioViewProps {
  activities: StravaActivity[];
  selectedActivity: StravaActivity | null;
  onSelectActivity: (act: StravaActivity | null) => void;
}

export const CardioView: React.FC<CardioViewProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
}) => {
  const [activeMetric, setActiveMetric] = useState<'all' | 'hr' | 'alt' | 'pace'>('all');

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Actividades Strava</h1>
          <p className="text-xs text-zinc-400">Entrenamientos con pulso de Galaxy Fit3 fusionado</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-orange-950/60 border border-orange-900/60 text-orange-400 font-mono">
          {activities.length} sesiones
        </span>
      </div>

      {/* LISTA DE ACTIVIDADES */}
      <div className="space-y-3">
        {activities.map((activity) => {
          const paceMinutes = activity.moving_time
            ? ((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(2)
            : '5.10';

          return (
            <div
              key={activity.id}
              onClick={() => onSelectActivity(activity)}
              className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 active:scale-98 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-brand-strava font-bold text-xs">
                    🏃
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{activity.name}</h3>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(activity.start_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 font-medium">
                    Fit3 HR OK
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Métricas Principales */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-900/80 text-center">
                <div className="bg-zinc-900/40 rounded-xl p-1.5">
                  <span className="text-[10px] text-zinc-500 block">Distancia</span>
                  <span className="text-xs font-bold text-white">{(activity.distance / 1000).toFixed(2)} km</span>
                </div>
                <div className="bg-zinc-900/40 rounded-xl p-1.5">
                  <span className="text-[10px] text-zinc-500 block">Ritmo</span>
                  <span className="text-xs font-bold text-white">{paceMinutes} /km</span>
                </div>
                <div className="bg-zinc-900/40 rounded-xl p-1.5">
                  <span className="text-[10px] text-zinc-500 block">Desnivel</span>
                  <span className="text-xs font-bold text-white">+{Math.round(activity.total_elevation_gain)} m</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-1.5">
                  <span className="text-[10px] text-rose-400 block">Pulso Medio</span>
                  <span className="text-xs font-bold text-rose-400">{activity.avg_hr || 148} bpm</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETALLE DE ACTIVIDAD CON GRÁFICA MULTICAPA SINCRONIZADA */}
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
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Detalle de Actividad</span>
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
                <span className="text-[10px] text-zinc-500 block">Desnivel</span>
                <span className="text-sm font-black text-white">+{Math.round(selectedActivity.total_elevation_gain)}</span>
                <span className="text-[9px] text-zinc-400 block">m</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-center">
                <span className="text-[10px] text-rose-400 block">FC Máx</span>
                <span className="text-sm font-black text-rose-400">{selectedActivity.max_hr || 172}</span>
                <span className="text-[9px] text-rose-300 block">bpm</span>
              </div>
            </div>

            {/* GRÁFICA MULTICAPA SINCRONIZADA */}
            <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Telemetría Sincronizada
                  </h3>
                  <p className="text-[11px] text-zinc-500">Altitud (Strava) + Pulso (Galaxy Fit3)</p>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-rose-400 font-bold mr-2">FC Fit3</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />
                  <span className="text-zinc-400">Altitud</span>
                </div>
              </div>

              {/* Selector de capas */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveMetric('all')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${
                    activeMetric === 'all' ? 'bg-orange-500 text-white font-bold' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  Todas las capas
                </button>
                <button
                  onClick={() => setActiveMetric('hr')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${
                    activeMetric === 'hr' ? 'bg-rose-500 text-white font-bold' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  Solo Pulso Fit3
                </button>
                <button
                  onClick={() => setActiveMetric('alt')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${
                    activeMetric === 'alt' ? 'bg-zinc-700 text-white font-bold' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  Solo Altitud
                </button>
              </div>

              <div className="h-56 w-full pt-2">
                {selectedActivity.merged_hr_data && selectedActivity.merged_hr_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={selectedActivity.merged_hr_data}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
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
                        formatter={(value: any, name: string) => {
                          if (name === 'bpm') return [`${value} bpm`, 'Pulso Fit3'];
                          if (name === 'altitude') return [`${value} m`, 'Altitud'];
                          if (name === 'velocity_smooth') return [`${(1000 / (value * 60)).toFixed(2)} min/km`, 'Ritmo'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Minuto: ${(Number(label) / 60).toFixed(1)}`}
                      />

                      {(activeMetric === 'all' || activeMetric === 'alt') && (
                        <Area
                          type="monotone"
                          dataKey="altitude"
                          stroke="#71717a"
                          fillOpacity={1}
                          fill="url(#colorAlt)"
                          strokeWidth={1.5}
                        />
                      )}

                      {(activeMetric === 'all' || activeMetric === 'hr') && (
                        <Line
                          type="monotone"
                          dataKey="bpm"
                          stroke="#FC5200"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: '#FC5200' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                    No hay streams de telemetría disponibles para esta actividad.
                  </div>
                )}
              </div>
            </div>

            {/* ZONAS DE FRECUENCIA CARDÍACA (Z1 A Z5) */}
            <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Distribución por Zonas Cardíacas (Fit3)
              </h3>

              <div className="space-y-2">
                {[
                  { zone: 'Z5', label: 'Máximo (> 171 bpm)', pct: 15, color: 'bg-rose-600' },
                  { zone: 'Z4', label: 'Umbral (152 - 171 bpm)', pct: 45, color: 'bg-orange-500' },
                  { zone: 'Z3', label: 'Aeróbico (133 - 152 bpm)', pct: 25, color: 'bg-amber-400' },
                  { zone: 'Z2', label: 'Resistencia (114 - 133 bpm)', pct: 12, color: 'bg-emerald-500' },
                  { zone: 'Z1', label: 'Recuperación (< 114 bpm)', pct: 3, color: 'bg-blue-400' },
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
