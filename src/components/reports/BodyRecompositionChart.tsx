'use client';

// ====================================================================
// COMPONENTE: GRÁFICA DE RECOMPOSICIÓN CORPORAL (Recharts Reactivo)
// Evolución de Peso Real vs Meta de Competición (88-86 kg) y Déficit Acumulado
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

export interface BodyRecompositionPoint {
  date: string;
  weightKg?: number;
  targetWeightKg: number;
  calories?: number;
  deficitKcal?: number;
}

interface BodyRecompositionChartProps {
  data: BodyRecompositionPoint[];
  currentWeightKg?: number;
  targetWeightKg?: number;
}

export const BodyRecompositionChart: React.FC<BodyRecompositionChartProps> = ({
  data,
  currentWeightKg = 101,
  targetWeightKg = 86,
}) => {
  return (
    <div className="liquid-glass-card border border-[var(--glass-border)] rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold">
            Recomposición Corporal Activa
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Trayectoria de Peso vs Meta Media Maratón (28-Feb-2027)
          </h3>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D68C4]" />
            <span className="text-[var(--text-secondary)]">Actual:</span>
            <strong className="text-[var(--text-primary)]">{currentWeightKg} kg</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[var(--text-secondary)]">Objetivo:</span>
            <strong className="text-emerald-500">{targetWeightKg} kg</strong>
          </div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--glass-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              domain={[80, 105]}
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
              unit="kg"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--glass-surface-thick)',
                borderColor: 'var(--glass-border)',
                borderRadius: '12px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'weightKg') return [`${value} kg`, 'Peso Registrado'];
                if (name === 'targetWeightKg') return [`${value} kg`, 'Objetivo Competición'];
                return [value, name];
              }}
            />
            <ReferenceLine
              y={targetWeightKg}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: `Meta 21K: ${targetWeightKg} kg`,
                fill: '#10b981',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="#2D68C4"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2D68C4' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="targetWeightKg"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
        💡 Cada kilogramo de grasa reducido reduce aproximadamente 2.5 - 3 segundos por kilómetro en ritmo de carrera y alivia ~4 veces su magnitud en la fuerza de impacto sobre el tendón rotuliano.
      </p>
    </div>
  );
};
export default BodyRecompositionChart;
