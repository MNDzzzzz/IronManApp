'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse,
  Moon,
  Wind,
  Footprints,
  Activity,
  CheckCircle,
  TrendingDown,
  Sparkles,
  Calendar,
  Zap,
  ShieldCheck,
  Flame,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DailyHealthMetric, WeightLog } from '@/types/database';
import { WeightTracker } from '../weight/WeightTracker';

interface HealthViewProps {
  health: DailyHealthMetric | null;
  history: DailyHealthMetric[];
  weightLogs?: WeightLog[];
  currentWeight?: number;
  onAddWeight?: (weightKg: number, notes?: string, date?: string) => Promise<void>;
  onDeleteWeight?: (weightId: string) => Promise<void>;
}

export const HealthView: React.FC<HealthViewProps> = ({
  health,
  history,
  weightLogs = [],
  currentWeight = 101.0,
  onAddWeight,
  onDeleteWeight,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Seleccionar por defecto la fecha más reciente con datos o hoy
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (health?.date) return health.date;
    if (history.length > 0) return history[0].date;
    return todayStr;
  });

  const [hrSamples, setHrSamples] = useState<{ timestamp: string; bpm: number }[]>([]);
  const [isLoadingHr, setIsLoadingHr] = useState(false);

  // Lista de fechas disponibles (últimos 14 días + días con métricas)
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    datesSet.add(todayStr);
    history.forEach((h) => datesSet.add(h.date));

    // Generar los últimos 7 días continuos
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      datesSet.add(d.toISOString().split('T')[0]);
    }
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [history, todayStr]);

  // Métrica activa según la fecha seleccionada
  const current = useMemo(() => {
    return history.find((m) => m.date === selectedDate) || (selectedDate === health?.date ? health : null);
  }, [history, selectedDate, health]);

  // Cargar telemetría continua de FC (24h de Fit3) al cambiar fecha
  useEffect(() => {
    let isCancelled = false;
    const fetchHrSamples = async () => {
      setIsLoadingHr(true);
      try {
        const res = await fetch(`/api/health?date=${selectedDate}`, { cache: 'no-store' });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          setHrSamples(data.hr_samples || []);
        }
      } catch (e) {
        console.error('Error cargando muestras de pulso:', e);
      } finally {
        if (!isCancelled) setIsLoadingHr(false);
      }
    };

    fetchHrSamples();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  // Fases de sueño
  const totalSleepMinutes = current?.sleep_duration_minutes || 0;
  const deepPct =
    totalSleepMinutes > 0
      ? Math.round(((current?.deep_sleep_minutes || 0) / totalSleepMinutes) * 100)
      : 0;
  const remPct =
    totalSleepMinutes > 0
      ? Math.round(((current?.rem_sleep_minutes || 0) / totalSleepMinutes) * 100)
      : 0;
  const lightPct =
    totalSleepMinutes > 0
      ? Math.round(((current?.light_sleep_minutes || 0) / totalSleepMinutes) * 100)
      : 0;
  const awakePct = Math.max(0, 100 - (deepPct + remPct + lightPct));

  // PUNTUACIÓN DE PREPARACIÓN / READINESS SCORE (0 - 100)
  const readiness = useMemo(() => {
    if (!current) return null;
    let score = 50;

    // Calidad del sueño (40%)
    const sleepScore = current.sleep_score || 80;
    score += (sleepScore - 70) * 0.8;

    // Frecuencia cardíaca en reposo (30%)
    // 40 bpm o menos es excelente (atleta de resistencia)
    const rhr = current.resting_hr || 50;
    if (rhr <= 42) score += 18;
    else if (rhr <= 48) score += 12;
    else if (rhr <= 55) score += 5;
    else score -= 10;

    // SpO2 nocturno (15%)
    const spo2 = current.spo2_avg || 97;
    if (spo2 >= 97) score += 10;
    else if (spo2 >= 95) score += 5;
    else score -= 10;

    // Minutos de descanso total (15%)
    const hours = (current.sleep_duration_minutes || 0) / 60;
    if (hours >= 7.5) score += 12;
    else if (hours >= 6.5) score += 6;
    else score -= 10;

    const finalScore = Math.min(99, Math.max(40, Math.round(score)));

    let statusText = 'Excelente Preparación';
    let statusDesc = 'Sistema nervioso y corazón totalmente recuperados. Apto para rodaje Z2 o fuerza pesada.';
    let colorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60';

    if (finalScore < 70) {
      statusText = 'Fatiga Acumulada';
      statusDesc = 'Prioriza descanso o caminata suave. Articulaciones más vulnerables.';
      colorClass = 'text-rose-400 bg-rose-950/40 border-rose-900/60';
    } else if (finalScore < 85) {
      statusText = 'Recuperación Favorable';
      statusDesc = 'Buena condición. Mantén las pulsaciones en Zona 2 aeróbica estricta.';
      colorClass = 'text-amber-400 bg-amber-950/40 border-amber-900/60';
    }

    return { score: finalScore, statusText, statusDesc, colorClass };
  }, [current]);

  // Formatear muestras de pulso para la gráfica de 24h
  const chartData = useMemo(() => {
    return hrSamples.map((s) => {
      const d = new Date(s.timestamp);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return {
        time: timeStr,
        bpm: s.bpm,
      };
    });
  }, [hrSamples]);

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Salud & Biometría</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 font-bold uppercase">
              Galaxy Fit3
            </span>
          </div>
          <p className="text-xs text-zinc-400">Peso, telemetría continua y descanso fisiológico</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Health Connect
        </span>
      </div>

      {/* 1. SEGUIMIENTO DE PESO CORPORAL CON GRÁFICA INTERACTIVA */}
      <WeightTracker
        logs={weightLogs}
        currentWeight={currentWeight}
        onAddWeight={onAddWeight}
        onDeleteWeight={onDeleteWeight}
      />

      {/* 2. SELECTOR DESLIZABLE DE FECHAS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Día Seleccionado
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">
              {selectedDate === todayStr ? 'Hoy' : selectedDate}
            </span>
            <label className="relative p-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Seleccionar otra fecha"
              />
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>Elegir fecha</span>
            </label>
          </div>
        </div>

        {/* Tira deslizable de días */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-x-auto scrollbar-thin">
          {availableDates.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === todayStr;
            const metricForDay = history.find((m) => m.date === dStr);
            const dObj = new Date(dStr + 'T12:00:00');
            const dayOfWeek = dObj.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = dObj.getDate();

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDate(dStr)}
                className={`py-1.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex flex-col items-center min-w-[68px] relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md font-black ring-1 ring-indigo-400'
                    : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider opacity-75">
                  {isToday ? 'Hoy' : dayOfWeek}
                </span>
                <span className="text-sm font-black mt-0.5">{dayNum}</span>
                {metricForDay ? (
                  <span className="text-[8px] font-bold text-emerald-400 block mt-0.5">
                    {metricForDay.sleep_duration_minutes ? `${Math.round(metricForDay.sleep_duration_minutes / 60)}h` : 'Fit3'}
                  </span>
                ) : (
                  <span className="text-[8px] text-zinc-600 block mt-0.5">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ÍNDICE DE DISPONIBILIDAD / READINESS SCORE */}
      {readiness && (
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                  Readiness Score (Recuperación)
                </h2>
                <p className="text-[10px] text-zinc-500">Cálculo biomecánico FC reposo + sueño + SpO2</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">{readiness.score}</span>
              <span className="text-xs text-zinc-500">/100</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-2xl border text-xs flex items-center gap-2 ${readiness.colorClass}`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-black block">{readiness.statusText}</span>
              <span className="text-[11px] opacity-90 leading-tight">{readiness.statusDesc}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TELEMETRÍA CONTINUA DE FRECUENCIA CARDÍACA (24H GALAXY FIT3) */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                Curva de Pulso 24h (Galaxy Fit3)
              </h2>
              <p className="text-[10px] text-zinc-500">
                {hrSamples.length > 0 ? `${hrSamples.length} muestras registradas` : 'Sin muestras detalladas para este día'}
              </p>
            </div>
          </div>
          {current?.resting_hr && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-rose-400 font-bold">
              Reposo: {current.resting_hr} bpm
            </span>
          )}
        </div>

        <div className="h-44 w-full pt-1">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFit3Hr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#52525b" fontSize={9} interval="preserveStartEnd" minTickGap={35} />
                <YAxis stroke="#52525b" fontSize={9} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                  formatter={(value: any) => [`${value} bpm`, 'Pulso Fit3']}
                  labelFormatter={(label) => `Hora: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="bpm"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFit3Hr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs space-y-1">
              <Activity className="w-5 h-5 text-zinc-600" />
              <span>Muestras detalladas del día no sincronizadas aún.</span>
              <span className="text-[10px] text-zinc-600">Navega a los días 24, 25 o 26 para ver la telemetría histórica.</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. SUEÑO Y RECUPERACIÓN (GALAXY FIT3) */}
      {current ? (
        <>
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Moon className="w-4 h-4 fill-indigo-400/20" />
                </div>
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                    Fases de Sueño ({selectedDate})
                  </h2>
                  <p className="text-[10px] text-zinc-500">
                    {Math.floor(totalSleepMinutes / 60)}h {totalSleepMinutes % 60}m de descanso total
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Puntuación</span>
                <span className="text-xl font-black text-indigo-400">
                  {current.sleep_score || 88}
                  <span className="text-xs font-normal text-zinc-500">/100</span>
                </span>
              </div>
            </div>

            {/* Barra Visual de Fases de Sueño */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Distribución Nocturna</span>
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
                      {current.deep_sleep_minutes || 0}m ({deepPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <div>
                    <span className="text-[10px] text-zinc-400 block">REM (Cognitivo)</span>
                    <span className="text-xs font-bold text-white">
                      {current.rem_sleep_minutes || 0}m ({remPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Ligero</span>
                    <span className="text-xs font-bold text-white">
                      {current.light_sleep_minutes || 0}m ({lightPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500/60" />
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Despierto</span>
                    <span className="text-xs font-bold text-white">
                      {current.awake_minutes || 0}m ({awakePct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. OXÍGENO EN SANGRE (SpO2), PULSO REPOSO & PASOS */}
          <div className="grid grid-cols-3 gap-2">
            {/* SpO2 */}
            <div className="p-3.5 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-1">
              <div className="flex items-center justify-between text-cyan-400">
                <Wind className="w-4 h-4" />
                <span className="text-[9px] font-mono text-emerald-400">Normal</span>
              </div>
              <span className="text-[10px] text-zinc-500 block">SpO2 Nocturno</span>
              <div className="text-xl font-black text-white">{current.spo2_avg || 98.0}%</div>
              <p className="text-[9px] text-zinc-400">Mín: {current.spo2_min || 94.0}%</p>
            </div>

            {/* FC Reposo */}
            <div className="p-3.5 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-1">
              <div className="flex items-center justify-between text-rose-500">
                <HeartPulse className="w-4 h-4" />
                <span className="text-[9px] font-mono text-emerald-400">Atleta</span>
              </div>
              <span className="text-[10px] text-zinc-500 block">FC Reposo</span>
              <div className="text-xl font-black text-white">
                {current.resting_hr || 40} <span className="text-xs font-normal text-zinc-500">bpm</span>
              </div>
              <p className="text-[9px] text-emerald-400">Excelente forma</p>
            </div>

            {/* Pasos Totales */}
            <div className="p-3.5 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-1">
              <div className="flex items-center justify-between text-amber-400">
                <Footprints className="w-4 h-4" />
                <span className="text-[9px] font-mono text-amber-400">Activo</span>
              </div>
              <span className="text-[10px] text-zinc-500 block">Pasos Día</span>
              <div className="text-xl font-black text-white">
                {(current.total_steps || 0).toLocaleString()}
              </div>
              <p className="text-[9px] text-zinc-400">Meta: 10.000</p>
            </div>
          </div>
        </>
      ) : (
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <HeartPulse className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white">Sin métricas consolidadas el {selectedDate}</h3>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
            Selecciona los días anteriores (24, 25 o 26 de septiembre) para consultar tus datos reales sincronizados desde la Fit3.
          </p>
        </div>
      )}
    </div>
  );
};
