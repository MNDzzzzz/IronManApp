'use client';

import React from 'react';
import {
  HeartPulse,
  Moon,
  Wind,
  Footprints,
  Activity,
  CheckCircle,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { DailyHealthMetric } from '@/types/database';

interface HealthViewProps {
  health: DailyHealthMetric | null;
  history: DailyHealthMetric[];
}

export const HealthView: React.FC<HealthViewProps> = ({ health, history }) => {
  const current = health || {
    id: 'default',
    date: new Date().toISOString().split('T')[0],
    resting_hr: 52,
    sleep_duration_minutes: 465,
    sleep_score: 88,
    deep_sleep_minutes: 95,
    rem_sleep_minutes: 110,
    light_sleep_minutes: 230,
    awake_minutes: 30,
    spo2_avg: 97.4,
    spo2_min: 94.0,
    total_steps: 11450,
    active_calories: 680,
  };

  const totalSleepMinutes = current.sleep_duration_minutes || 465;
  const deepPct = Math.round(((current.deep_sleep_minutes || 95) / totalSleepMinutes) * 100);
  const remPct = Math.round(((current.rem_sleep_minutes || 110) / totalSleepMinutes) * 100);
  const lightPct = Math.round(((current.light_sleep_minutes || 230) / totalSleepMinutes) * 100);
  const awakePct = Math.max(0, 100 - (deepPct + remPct + lightPct));

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Salud Galaxy Fit3</h1>
          <p className="text-xs text-zinc-400">Métricas pasivas extraídas vía Health Connect</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sincronizado
        </span>
      </div>

      {/* 1. SUEÑO Y RECUPERACIÓN (FIT3) */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Moon className="w-4 h-4 fill-indigo-400/20" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-300">Análisis del Sueño</h2>
              <p className="text-[10px] text-zinc-500">
                {Math.floor(totalSleepMinutes / 60)}h {totalSleepMinutes % 60}m de descanso total
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block">Puntuación</span>
            <span className="text-xl font-black text-indigo-400">{current.sleep_score || 88}<span className="text-xs font-normal text-zinc-500">/100</span></span>
          </div>
        </div>

        {/* Barra Visual de Fases de Sueño */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Fases de la Noche</span>
            <span className="text-emerald-400 font-medium">Recuperación Excelente</span>
          </div>

          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex">
            <div style={{ width: `${deepPct}%` }} className="bg-indigo-600 h-full" title="Profundo" />
            <div style={{ width: `${remPct}%` }} className="bg-purple-500 h-full" title="REM" />
            <div style={{ width: `${lightPct}%` }} className="bg-cyan-500 h-full" title="Ligero" />
            <div style={{ width: `${awakePct}%` }} className="bg-orange-500/60 h-full" title="Despierto" />
          </div>

          {/* Leyenda de Fases */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <div>
                <span className="text-[10px] text-zinc-400 block">Profundo (Físico)</span>
                <span className="text-xs font-bold text-white">
                  {current.deep_sleep_minutes}m ({deepPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <div>
                <span className="text-[10px] text-zinc-400 block">REM (Cognitivo)</span>
                <span className="text-xs font-bold text-white">
                  {current.rem_sleep_minutes}m ({remPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <div>
                <span className="text-[10px] text-zinc-400 block">Ligero</span>
                <span className="text-xs font-bold text-white">
                  {current.light_sleep_minutes}m ({lightPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500/60" />
              <div>
                <span className="text-[10px] text-zinc-400 block">Despierto</span>
                <span className="text-xs font-bold text-white">
                  {current.awake_minutes}m ({awakePct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. OXÍGENO EN SANGRE (SpO2) Y PULSO REPOSO */}
      <div className="grid grid-cols-2 gap-3">
        {/* SpO2 */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-2">
          <div className="flex items-center justify-between text-cyan-400">
            <Wind className="w-5 h-5" />
            <span className="text-[10px] font-mono text-emerald-400">Normal</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">SpO2 Nocturno</span>
            <div className="text-2xl font-black text-white">{current.spo2_avg || 97.4}%</div>
            <p className="text-[10px] text-zinc-400 mt-1">Mínimo: {current.spo2_min || 94.0}%</p>
          </div>
        </div>

        {/* FC Reposo */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-2">
          <div className="flex items-center justify-between text-rose-500">
            <HeartPulse className="w-5 h-5" />
            <span className="text-[10px] font-mono text-emerald-400">-2 bpm</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">FC en Reposo</span>
            <div className="text-2xl font-black text-white">{current.resting_hr || 52} <span className="text-xs font-normal text-zinc-500">bpm</span></div>
            <p className="text-[10px] text-emerald-400 mt-1">Excelente forma física</p>
          </div>
        </div>
      </div>

      {/* 3. HISTORIAL DE LOS ÚLTIMOS DÍAS */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Historial Reciente de Recuperación
        </h3>
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-white block">
                  {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {Math.floor((item.sleep_duration_minutes || 0) / 60)}h descanso • {item.total_steps.toLocaleString()} pasos
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-indigo-400">{item.sleep_score || 80}/100</span>
                <span className="text-[10px] text-rose-400 block">{item.resting_hr || 54} bpm reposo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
