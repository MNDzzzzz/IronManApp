'use client';

// ====================================================================
// COMPONENTE DE SEGUIMIENTO DE PESO CORPORAL: IronManApp
// Gráfica de evolución con límites dinámicos, KPIs de recomposición,
// registro rápido con notas y persistencia en Supabase.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Calendar,
  Plus,
  X,
  History,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { WeightLog } from '@/types/database';

interface WeightTrackerProps {
  logs: WeightLog[];
  currentWeight: number;
  onAddWeight?: (weightKg: number, notes?: string, date?: string) => Promise<void>;
  onDeleteWeight?: (weightId: string) => Promise<void>;
}

type TimeframeType = 'dias' | 'semanas' | 'meses';

export const WeightTracker: React.FC<WeightTrackerProps> = ({
  logs = [],
  currentWeight = 101.0,
  onAddWeight,
  onDeleteWeight,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeType>('dias');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState(String(currentWeight));
  const [notes, setNotes] = useState('Antes de cenar, después de entrenar');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Orden cronológico (antiguo -> nuevo) para la gráfica
  const chronologicalLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs]);

  // Cálculos estadísticos
  const initialWeight = chronologicalLogs[0]?.weight_kg || 102.5;
  const latestWeight = chronologicalLogs[chronologicalLogs.length - 1]?.weight_kg || currentWeight;
  const totalChangeKg = Number((latestWeight - initialWeight).toFixed(2));

  // Estimación fisiológica de grasa corporal y recomposición
  const estimatedBodyFatPct = useMemo(() => {
    const basePct = 19.8;
    const deltaKg = latestWeight - 101.0;
    const estimated = basePct + (deltaKg * 0.35);
    return Number(Math.max(12, Math.min(30, estimated)).toFixed(1));
  }, [latestWeight]);

  // Datos para la gráfica según el selector temporal
  const chartData = useMemo(() => {
    if (timeframe === 'dias') {
      return chronologicalLogs.map((log) => {
        const d = new Date(log.date);
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = `${dayNames[d.getUTCDay()]} ${d.getUTCDate()}`;
        return {
          date: log.date,
          label,
          weight: log.weight_kg,
          notes: log.notes || 'Antes de cenar, después de entrenar',
        };
      });
    }

    if (timeframe === 'semanas') {
      const weekMap = new Map<string, { weights: number[]; lastDate: string }>();
      chronologicalLogs.forEach((log) => {
        const d = new Date(log.date);
        const weekKey = `Sem ${Math.ceil(d.getUTCDate() / 7)} (${d.toLocaleString('es-ES', { month: 'short' })})`;
        const entry = weekMap.get(weekKey) || { weights: [], lastDate: log.date };
        entry.weights.push(log.weight_kg);
        weekMap.set(weekKey, entry);
      });

      return Array.from(weekMap.entries()).map(([label, val]) => {
        const avg = Number((val.weights.reduce((a, b) => a + b, 0) / val.weights.length).toFixed(2));
        const last = val.weights[val.weights.length - 1];
        return {
          date: val.lastDate,
          label,
          weight: last,
          avgWeight: avg,
          notes: `Promedio semanal: ${avg} kg (${val.weights.length} pesajes)`,
        };
      });
    }

    // Meses
    const monthMap = new Map<string, { weights: number[]; lastDate: string }>();
    chronologicalLogs.forEach((log) => {
      const d = new Date(log.date);
      const monthKey = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      const entry = monthMap.get(monthKey) || { weights: [], lastDate: log.date };
      entry.weights.push(log.weight_kg);
      monthMap.set(monthKey, entry);
    });

    return Array.from(monthMap.entries()).map(([label, val]) => {
      const avg = Number((val.weights.reduce((a, b) => a + b, 0) / val.weights.length).toFixed(2));
      const last = val.weights[val.weights.length - 1];
      return {
        date: val.lastDate,
        label,
        weight: last,
        notes: `Promedio mes: ${avg} kg`,
      };
    });
  }, [chronologicalLogs, timeframe]);

  // Límites dinámicos del eje Y
  const yDomain = useMemo(() => {
    if (!chartData.length) return [98, 104];
    const weights = chartData.map((d) => d.weight);
    const min = Math.floor(Math.min(...weights) - 0.6);
    const max = Math.ceil(Math.max(...weights) + 0.6);
    return [min, max];
  }, [chartData]);

  // Manejar envío de nuevo peso
  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(val) || val < 40 || val > 250) return;

    setIsSaving(true);
    try {
      if (onAddWeight) {
        await onAddWeight(val, notes, date);
      } else {
        await fetch('/api/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight_kg: val, notes, date }),
        });
      }
      setShowAddModal(false);
    } catch (err) {
      console.error('Error guardando peso:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="liquid-glass-card p-4 sm:p-6 rounded-3xl space-y-4">
      {/* Encabezado con KPI de Peso y Botón */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="apple-title text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Evolución de Peso & Grasa
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">Pesaje antes de cenar / post-entreno</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-full liquid-glass-pill border border-[var(--glass-border)] text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 apple-pressable apple-btn-spring active:scale-95 transition-all hover:bg-emerald-500/10 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Anotar</span>
        </button>
      </div>

      {/* Tarjetas de Resumen KPI (Peso, Grasa Corporal, Variación, Inicio) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Actual */}
        <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-left min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-secondary)] block truncate tracking-wider">Actual</span>
          <div className="apple-display text-lg sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 font-mono truncate tabular-nums tracking-tight">
            {latestWeight.toFixed(1)} <span className="text-[10px] font-normal text-[var(--text-secondary)] font-sans">kg</span>
          </div>
          <span className="text-[9px] text-[var(--text-tertiary)] block truncate font-mono">Último pesaje</span>
        </div>

        {/* Grasa Corporal Est. */}
        <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-left min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-cyan-500 block truncate tracking-wider">Grasa Est.</span>
          <div className="apple-display text-lg sm:text-2xl font-black text-cyan-500 dark:text-cyan-400 mt-0.5 font-mono truncate tabular-nums tracking-tight">
            {estimatedBodyFatPct}%
          </div>
          <span className="text-[9px] text-cyan-600 dark:text-cyan-400 block truncate font-medium">Recomposición</span>
        </div>

        {/* Variación */}
        <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-left min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-secondary)] block truncate tracking-wider">Variación</span>
          <div
            className={`apple-display text-lg sm:text-2xl font-black mt-0.5 flex items-center gap-0.5 font-mono truncate tabular-nums tracking-tight ${
              totalChangeKg <= 0 ? 'text-emerald-500' : 'text-amber-500'
            }`}
          >
            {totalChangeKg <= 0 ? (
              <TrendingDown className="w-4 h-4 inline shrink-0" />
            ) : (
              <TrendingUp className="w-4 h-4 inline shrink-0" />
            )}
            <span>{totalChangeKg > 0 ? `+${totalChangeKg}` : totalChangeKg}</span>
            <span className="text-[10px] font-normal text-[var(--text-secondary)] font-sans">kg</span>
          </div>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block truncate font-medium">Desde el inicio</span>
        </div>

        {/* Inicio */}
        <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-left min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-secondary)] block truncate tracking-wider">Inicio</span>
          <div className="apple-display text-lg sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 font-mono truncate tabular-nums tracking-tight">
            {initialWeight.toFixed(1)} <span className="text-[10px] font-normal text-[var(--text-secondary)] font-sans">kg</span>
          </div>
          <span className="text-[9px] text-[var(--text-tertiary)] block truncate font-mono">Punto de partida</span>
        </div>
      </div>

      {/* Selector Temporal (Días / Semanas / Meses) */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5 editorial-heading">
          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          Rango de Visualización
        </span>

        <div className="flex p-0.5 rounded-xl liquid-glass-pill border border-[var(--glass-border)] text-[11px]">
          {(['dias', 'semanas', 'meses'] as TimeframeType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              className={`px-3 py-1 rounded-lg font-semibold apple-pressable transition-all ${
                timeframe === tab
                  ? 'bg-emerald-500 text-black shadow-md font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfica Recharts */}
      <div className="w-full min-w-0 overflow-hidden h-56 pt-2">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                stroke="var(--text-tertiary)"
                fontSize={10}
                tickLine={false}
              />

              <YAxis
                domain={yDomain}
                stroke="var(--text-tertiary)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val.toFixed(1)}`}
                allowDecimals={true}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[var(--glass-surface-thick)] backdrop-blur-md p-3 rounded-2xl border border-[var(--glass-border)] shadow-2xl text-xs space-y-1">
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                          {data.date} • {data.label}
                        </div>
                        <div className="text-base font-black text-[var(--text-primary)] flex items-center gap-1 font-mono">
                          <span className="text-emerald-500">{data.weight} kg</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                            ({data.weight - initialWeight <= 0 ? '' : '+'}
                            {(data.weight - initialWeight).toFixed(1)} kg)
                          </span>
                        </div>
                        {data.notes && (
                          <div className="text-[10px] text-[var(--text-secondary)] italic border-t border-[var(--glass-border)] pt-1 mt-1">
                            {data.notes}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine
                y={initialWeight}
                stroke="var(--text-tertiary)"
                strokeDasharray="3 3"
                label={{
                  value: `Inicio: ${initialWeight}kg`,
                  fill: 'var(--text-tertiary)',
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />

              <Area
                type="monotone"
                dataKey="weight"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#weightGradient)"
                dot={{ r: 4, fill: '#10B981', stroke: 'var(--background)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#34D399', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-tertiary)]">
            Cargando gráfica de peso...
          </div>
        )}
      </div>

      {/* Historial Detallado de Pesajes */}
      <div className="pt-2 border-t border-[var(--glass-border)] space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
          <History className="w-3.5 h-3.5" />
          Registros Recientes ({chronologicalLogs.length} Pesajes)
        </span>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {[...chronologicalLogs].reverse().map((item, idx) => {
            const isLatest = idx === 0;
            return (
              <div
                key={item.id || item.date}
                className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                  isLatest
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-[var(--glass-surface)] border-[var(--glass-border)]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[var(--text-primary)]">
                      {new Date(item.date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {isLatest && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                        Último
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                    {item.notes || 'Antes de cenar, después de entrenar'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--text-primary)] block font-mono">
                      {item.weight_kg.toFixed(1)} <span className="text-[10px] font-normal text-[var(--text-secondary)]">kg</span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        item.weight_kg - initialWeight <= 0 ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {item.weight_kg - initialWeight <= 0 ? '' : '+'}
                      {(item.weight_kg - initialWeight).toFixed(1)} kg
                    </span>
                  </div>
                  {onDeleteWeight && item.id && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar pesaje de ${item.weight_kg}kg del ${item.date}?`)) {
                          onDeleteWeight(item.id);
                        }
                      }}
                      className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
                      title="Eliminar pesaje"
                      aria-label="Eliminar pesaje"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Registro Rápido */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 animate-apple-fade-in motion-reduce:transition-none">
          <div className="liquid-glass-sheet rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 border-t border-t-white/30 dark:border-t-white/15 shadow-2xl animate-apple-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="apple-title text-sm font-black text-[var(--text-primary)]">Registrar Pesaje</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] apple-pressable active:scale-90"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Peso Corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="ej: 101.0"
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] font-mono text-lg font-black tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-xs focus:outline-none focus:border-emerald-500 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Momento / Notas
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej: Antes de cenar, después de entrenar"
                  className="w-full bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-pressable active:scale-95 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black shadow-lg shadow-emerald-500/20 apple-pressable active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Pesaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
