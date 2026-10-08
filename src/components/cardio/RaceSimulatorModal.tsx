'use client';

// ====================================================================
// MODAL: SIMULADOR DE MEDIA MARATÓN (28-FEB-2027)
// Proyección de Ritmo por Peso, Avituallamiento de Geles & Estrategia Articular
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Zap,
  Timer,
  Scale,
  ShieldCheck,
  Flame,
  Award,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  simulateHalfMarathon2027,
  RaceSimulationParams,
  RACE_DISTANCE_KM,
  RACE_DATE_TARGET,
} from '@/lib/cardio/raceSimulatorEngine';

interface RaceSimulatorModalProps {
  initialWeightKg?: number;
  onClose: () => void;
}

export const RaceSimulatorModal: React.FC<RaceSimulatorModalProps> = ({
  initialWeightKg = 101,
  onClose,
}) => {
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(initialWeightKg);
  const [projectedWeightKg, setProjectedWeightKg] = useState<number>(86);
  const [basePaceMinKm, setBasePaceMinKm] = useState<number>(5.5); // 5:30 min/km
  const [targetCadenceSpm, setTargetCadenceSpm] = useState<number>(174);
  const [cacoProtocol, setCacoProtocol] = useState<boolean>(false);

  // Bloquear scroll de fondo para comportamiento nativo Apple Bottom Sheet
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Ejecutar motor de simulación
  const simulation = useMemo(() => {
    const params: RaceSimulationParams = {
      currentWeightKg,
      projectedWeightKg,
      basePaceMinKm,
      targetCadenceSpm,
      cacoProtocol,
    };
    return simulateHalfMarathon2027(params);
  }, [currentWeightKg, projectedWeightKg, basePaceMinKm, targetCadenceSpm, cacoProtocol]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="race-sim-title"
      className="fixed inset-0 z-50 bg-[#0A0D14]/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-apple-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="liquid-glass-card border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-5 text-[var(--text-primary)] animate-apple-scale-in">
        {/* Tirador táctil Apple para Bottom Sheet en móvil */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 sm:hidden shrink-0" />
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FC5200]/15 text-[#FC5200] flex items-center justify-center border border-[#FC5200]/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#FC5200]">
                SIMULADOR DE COMPETICIÓN 21K
              </span>
              <h2 id="race-sim-title" className="text-base sm:text-lg font-black tracking-tight">
                Media Maratón (28 de Febrero de 2027)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar simulador"
            className="p-2 rounded-xl bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 border border-[var(--glass-border)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarjeta de Salida Principal: Tiempo Proyectado y Ritmo */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#FC5200]/15 via-[var(--glass-surface)] to-emerald-500/10 border border-[#FC5200]/30 text-center space-y-1 shadow-lg">
          <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
            Tiempo Final Estimado (21.097 km)
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#FC5200]">
            {simulation.totalTimeFormatted}
          </div>
          <div className="flex items-center justify-center gap-3 text-xs font-mono pt-1">
            <span className="text-[var(--text-primary)]">
              Ritmo Crucero: <strong className="text-emerald-500">{simulation.projectedPaceStr}</strong>
            </span>
            <span className="text-[var(--text-secondary)]">•</span>
            <span className="text-emerald-500 font-bold">
              ⚡ -{simulation.weightTimeSavedMinutes} min por peso
            </span>
          </div>
        </div>

        {/* Controles Interactivos de Parámetros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Control: Peso Actual vs Objetivo */}
          <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-blue-500" /> Peso en Competición
              </span>
              <span className="font-mono text-emerald-500 font-bold">{projectedWeightKg} kg</span>
            </div>
            <input
              type="range"
              min={80}
              max={101}
              step={0.5}
              value={projectedWeightKg}
              onChange={(e) => setProjectedWeightKg(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
              <span>Meta: 86 kg</span>
              <span>Actual: {currentWeightKg} kg (-{(currentWeightKg - projectedWeightKg).toFixed(1)} kg)</span>
            </div>
          </div>

          {/* Control: Ritmo Base de Entrada */}
          <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-amber-500" /> Ritmo Base en Z2
              </span>
              <span className="font-mono text-amber-500 font-bold">
                {Math.floor(basePaceMinKm)}:{String(Math.round((basePaceMinKm % 1) * 60)).padStart(2, '0')} /km
              </span>
            </div>
            <input
              type="range"
              min={4.5}
              max={6.5}
              step={0.05}
              value={basePaceMinKm}
              onChange={(e) => setBasePaceMinKm(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
              <span>Rápido: 4:30</span>
              <span>Conservador: 6:30</span>
            </div>
          </div>

          {/* Control: Cadencia Objetivo */}
          <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" /> Cadencia de Carrera
              </span>
              <span className="font-mono text-cyan-500 font-bold">{targetCadenceSpm} ppm</span>
            </div>
            <input
              type="range"
              min={158}
              max={182}
              step={2}
              value={targetCadenceSpm}
              onChange={(e) => setTargetCadenceSpm(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
              <span>Baja: 158</span>
              <span>Protectora: 174+ ppm</span>
            </div>
          </div>

          {/* Selector de Protocolo CaCo vs Continuo */}
          <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[var(--text-primary)] block">Protocolo CaCo Planificado</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                9 min correr / 1 min caminar activo
              </span>
            </div>
            <button
              onClick={() => setCacoProtocol((prev) => !prev)}
              className={`py-1.5 px-3 rounded-xl font-bold font-mono text-xs transition-all ${
                cacoProtocol
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
              }`}
            >
              {cacoProtocol ? 'ACTIVADO' : 'CONTINUO'}
            </button>
          </div>
        </div>

        {/* Estrategia de Nutrición: Geles e Hidratación */}
        <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2.5">
          <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" /> Cronograma de Geles & Avituallamientos
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {simulation.gelMilestones.map((gel, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FC5200]">
                    Km {gel.km} (~minuto {gel.timingMinutes})
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                    {gel.carbsG}g Carbohidratos {gel.hasCaffeine ? '+ 50mg Cafeína' : ''}
                  </span>
                </div>
                <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                  {gel.advice}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Protección Articular y Carga Rotuliana */}
        <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Impacto Articular Estimado en Rodilla
            </span>
            <span className="font-mono font-bold text-amber-500">
              {simulation.kneeImpactTons} toneladas absorbidas
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {simulation.cadenceAdvice}
          </p>
        </div>
      </div>
    </div>
  );
};
