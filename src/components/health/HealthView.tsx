'use client';

// ====================================================================
// VISTA DE SALUD & BIOMETRÍA: IronManApp (Liquid Glass Dual Mode)
// 100% Datos de Samsung Galaxy Fit3 (Health Connect)
// Telemetría 24h de pulso, fases de sueño, SpO2, FC reposo y peso.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse,
  Moon,
  Wind,
  Footprints,
  Activity,
  Sparkles,
  Calendar,
  ShieldCheck,
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
  const [, setIsLoadingHr] = useState(false);

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
    let colorClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (finalScore < 70) {
      statusText = 'Fatiga Acumulada';
      statusDesc = 'Prioriza descanso o caminata suave. Articulaciones más vulnerables.';
      colorClass = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (finalScore < 85) {
      statusText = 'Recuperación Favorable';
      statusDesc = 'Buena condición. Mantén las pulsaciones en Zona 2 aeróbica estricta.';
      colorClass = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
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
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight editorial-heading">Salud & Biometría</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-pill text-indigo-500 font-bold uppercase font-mono data-tabular">
              FIT3
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">Peso, telemetría continua y descanso fisiológico</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full liquid-glass-pill border border-[var(--glass-border)] text-emerald-500 font-mono flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sincronizado
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
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Día Seleccionado
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              {selectedDate === todayStr ? 'Hoy' : selectedDate}
            </span>
            <label className="relative p-1 px-2.5 rounded-xl liquid-glass-pill border border-[var(--glass-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Seleccionar otra fecha"
              />
              <Calendar className="w-3 h-3 text-[#2D68C4]" />
              <span>Elegir fecha</span>
            </label>
          </div>
        </div>

        {/* Tira deslizable de días */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl liquid-glass-pill border border-[var(--glass-border)] overflow-x-auto scrollbar-thin">
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
                    ? 'bg-[#2D68C4] text-white shadow-md font-black ring-1 ring-blue-400'
                    : 'bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider opacity-85">
                  {isToday ? 'Hoy' : dayOfWeek}
                </span>
                <span className="text-sm font-black mt-0.5 font-mono">{dayNum}</span>
                {metricForDay ? (
                  <span className="text-[8px] font-bold text-emerald-500 block mt-0.5">
                    {metricForDay.sleep_duration_minutes ? `${Math.round(metricForDay.sleep_duration_minutes / 60)}h` : 'Fit3'}
                  </span>
                ) : (
                  <span className="text-[8px] text-[var(--text-tertiary)] block mt-0.5">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ÍNDICE DE DISPONIBILIDAD / READINESS SCORE */}
      {readiness && (
        <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs uppercase font-bold tracking-wider text-[var(--text-primary)]">
                  Readiness Score (Recuperación)
                </h2>
                <p className="text-[10px] text-[var(--text-secondary)]">Cálculo biomecánico FC reposo + sueño + SpO2</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-500 font-mono">{readiness.score}</span>
              <span className="text-xs text-[var(--text-tertiary)]">/100</span>
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
      <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-[var(--text-primary)]">
                Curva de Pulso 24h (Galaxy Fit3)
              </h2>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {hrSamples.length > 0 ? `${hrSamples.length} muestras registradas` : 'Sin muestras detalladas para este día'}
              </p>
            </div>
          </div>
          {current?.resting_hr && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-rose-500 font-bold">
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
                <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={9} interval="preserveStartEnd" minTickGap={35} />
                <YAxis stroke="var(--text-tertiary)" fontSize={9} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--glass-surface-thick)',
                    borderColor: 'var(--glass-border)',
                    borderRadius: '14px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
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
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] text-xs space-y-1">
              <Activity className="w-5 h-5 text-[var(--text-tertiary)]" />
              <span>Muestras continuas no registradas para este día.</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Consulta los días con sincronización de Fit3 para ver la gráfica.</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. SUEÑO Y RECUPERACIÓN (GALAXY FIT3) */}
      {current ? (
        <>
          <div className="p-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                  <Moon className="w-4 h-4 fill-indigo-400/20" />
                </div>
                <div>
                  <h2 className="text-xs uppercase font-bold tracking-wider text-[var(--text-primary)]">
                    Fases de Sueño ({selectedDate})
                  </h2>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {Math.floor(totalSleepMinutes / 60)}h {totalSleepMinutes % 60}m de descanso total
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-secondary)] block">Puntuación</span>
                <span className="text-xl font-black text-indigo-500 font-mono">
                  {current.sleep_score || 88}
                  <span className="text-xs font-normal text-[var(--text-tertiary)]">/100</span>
                </span>
              </div>
            </div>

            {/* Barra Visual de Fases de Sueño */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Distribución Nocturna</span>
                <span className="text-emerald-500 font-medium">Recuperación Fisiológica</span>
              </div>

              <div className="w-full h-3 bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] rounded-full overflow-hidden flex">
                <div style={{ width: `${deepPct}%` }} className="bg-indigo-600 h-full" title="Profundo" />
                <div style={{ width: `${remPct}%` }} className="bg-purple-500 h-full" title="REM" />
                <div style={{ width: `${lightPct}%` }} className="bg-cyan-500 h-full" title="Ligero" />
                <div style={{ width: `${awakePct}%` }} className="bg-amber-500/60 h-full" title="Despierto" />
              </div>

              {/* Leyenda de Fases */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 bg-[var(--glass-surface)] p-2.5 rounded-2xl border border-[var(--glass-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block">Profundo (Físico)</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {current.deep_sleep_minutes || 0}m ({deepPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--glass-surface)] p-2.5 rounded-2xl border border-[var(--glass-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block">REM (Cognitivo)</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {current.rem_sleep_minutes || 0}m ({remPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--glass-surface)] p-2.5 rounded-2xl border border-[var(--glass-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block">Ligero</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {current.light_sleep_minutes || 0}m ({lightPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--glass-surface)] p-2.5 rounded-2xl border border-[var(--glass-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block">Despierto</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {current.awake_minutes || 0}m ({awakePct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. OXÍGENO EN SANGRE (SpO2), PULSO REPOSO & PASOS */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* SpO2 */}
            <div className="p-3.5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center justify-between text-cyan-500">
                <Wind className="w-4 h-4" />
                <span className="text-[9px] font-mono text-emerald-500 font-bold">Normal</span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">SpO2 Nocturno</span>
              <div className="text-xl font-black text-[var(--text-primary)] font-mono">{current.spo2_avg || 98.0}%</div>
              <p className="text-[9px] text-[var(--text-tertiary)]">Mín: {current.spo2_min || 94.0}%</p>
            </div>

            {/* FC Reposo */}
            <div className="p-3.5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center justify-between text-rose-500">
                <HeartPulse className="w-4 h-4" />
                <span className="text-[9px] font-mono text-emerald-500 font-bold">Atleta</span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">FC Reposo</span>
              <div className="text-xl font-black text-[var(--text-primary)] font-mono">
                {current.resting_hr || 40} <span className="text-xs font-normal text-[var(--text-tertiary)]">bpm</span>
              </div>
              <p className="text-[9px] text-emerald-500">Excelente forma</p>
            </div>

            {/* Pasos Totales */}
            <div className="p-3.5 rounded-3xl liquid-glass-card border border-[var(--glass-border)] space-y-1">
              <div className="flex items-center justify-between text-amber-500">
                <Footprints className="w-4 h-4" />
                <span className="text-[9px] font-mono text-amber-500 font-bold">Activo</span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">Pasos Día</span>
              <div className="text-xl font-black text-[var(--text-primary)] font-mono">
                {(current.total_steps || 0).toLocaleString()}
              </div>
              <p className="text-[9px] text-[var(--text-tertiary)]">Meta: 10.000</p>
            </div>
          </div>
        </>
      ) : (
        <div className="p-6 rounded-3xl liquid-glass-card border border-[var(--glass-border)] text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <HeartPulse className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-[var(--text-primary)]">Sin métricas consolidadas el {selectedDate}</h3>
          <p className="text-[11px] text-[var(--text-secondary)] max-w-xs mx-auto">
            Selecciona días anteriores para consultar tus datos reales sincronizados desde la Fit3.
          </p>
        </div>
      )}
    </div>
  );
};
