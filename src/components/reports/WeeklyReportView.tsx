'use client';

// ====================================================================
// VISTA DE INFORME Y RESUMEN SEMANAL: IronManApp
// 100% Datos Reales de Samsung Galaxy Fit3, Strava, Gym, Nutrición y Báscula
// Con diagnóstico biomecánico, fisioterapia y descarga de PDF oficial.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Utensils,
  Printer,
  Sparkles,
  Leaf,
  Apple,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { WeeklyReportDataset } from '@/lib/reports/weeklyDataAggregator';
import { WeeklyClinicalAssessment } from '@/lib/reports/weeklyClinicalEngine';
import dynamic from 'next/dynamic';

const BodyRecompositionChart = dynamic(
  () => import('@/components/reports/BodyRecompositionChart').then((m) => m.BodyRecompositionChart),
  { ssr: false }
);

interface WeeklyReportViewProps {
  onClose?: () => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({ onClose }) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [dataset, setDataset] = useState<WeeklyReportDataset | null>(null);
  const [assessment, setAssessment] = useState<WeeklyClinicalAssessment | null>(null);
  const [isApplyingDiet, setIsApplyingDiet] = useState<boolean>(false);
  const [dietAppliedMessage, setDietAppliedMessage] = useState<string | null>(null);

  // Cargar datos de la semana seleccionada
  const fetchReport = useCallback(async (offset: number) => {
    setIsLoading(true);
    setDietAppliedMessage(null);
    try {
      const res = await fetch(`/api/reports/weekly?weekOffset=${offset}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDataset(data.dataset);
        setAssessment(data.assessment);
      }
    } catch (err) {
      console.error('Error cargando informe semanal:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(weekOffset);
  }, [weekOffset, fetchReport]);

  // Manejar descarga del PDF oficial generado en backend
  const handleDownloadPdf = async () => {
    if (!dataset) return;
    setIsDownloadingPdf(true);
    try {
      const downloadUrl = `/api/reports/weekly?weekOffset=${weekOffset}&format=pdf`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Error generando archivo PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `IronMan_Informe_Semana_${dataset.weekNumber}_${dataset.startDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar el PDF:', err);
      alert('Hubo un problema descargando el PDF. Inténtalo de nuevo.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Manejar aplicación de la dieta adaptada directamente al protocolo de la app
  const handleApplyDiet = async () => {
    if (!assessment) return;
    setIsApplyingDiet(true);
    setDietAppliedMessage(null);
    try {
      const res = await fetch('/api/protocol/adaptation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          adaptation: assessment.dietPlan?.adaptation,
          weekOffset,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error aplicando dieta');
      setDietAppliedMessage(data.message || '¡Dieta adaptada aplicada con éxito a la aplicación!');
    } catch (err: any) {
      alert(`Error aplicando la dieta: ${err.message}`);
    } finally {
      setIsApplyingDiet(false);
    }
  };

  // Datos para gráfica de barras Recharts
  const chartStepsData = dataset?.days.map((d) => ({
    name: d.dayName.substring(0, 3),
    fullName: d.dayName,
    date: d.date,
    pasos: d.health.steps,
    isRest: d.isRestDay,
    overstepped: d.isRestDay && d.health.steps > 9500,
  })) || [];

  // Datos para gráfica de recomposición corporal
  const recompositionData = useMemo(() => {
    if (!dataset) return [];
    return dataset.days.map((d) => ({
      date: d.dayName.substring(0, 3),
      weightKg: d.weight.weightKg || undefined,
      targetWeightKg: 86,
      calories: d.nutrition.totalCalories,
      deficitKcal: Math.max(0, 2400 - d.nutrition.totalCalories),
    }));
  }, [dataset]);

  return (
    <div className="w-full text-[var(--text-primary)] pb-12 pt-1 transition-all duration-300">
      {/* Barra de Navegación y Cabecera Nativa de Apple (WWDC Fluid Interfaces) */}
      <div className="liquid-glass-card bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 mb-5 shadow-sm">
        {/* Nivel 1: Barra de Navegación Nativa estilo iOS con botón de retorno y acciones */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[var(--glass-border-subtle)]">
          {/* Botón de retorno nativo estilo iOS "< Volver a Hoy" */}
          {onClose ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 -ml-1 rounded-xl text-[#D97757] dark:text-[#E28464] hover:bg-[#D97757]/10 active:bg-[#D97757]/15 apple-btn-spring apple-pressable font-semibold text-sm transition-colors touch-manipulation group"
              aria-label="Volver a la vista Hoy"
            >
              <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.5] transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="editorial-heading">Volver a Hoy</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D97757] dark:text-[#E28464]">
                Informe de Alto Rendimiento
              </span>
            </div>
          )}

          {/* Acciones principales de exportación e impresión */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isLoading || isDownloadingPdf}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C26243] hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-md shadow-orange-500/20 apple-btn-spring apple-pressable active:scale-[0.97] transition-all disabled:opacity-50 touch-manipulation"
              title="Descargar informe oficial en PDF"
            >
              <Download className={`w-4 h-4 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span className="hidden xs:inline sm:inline">
                {isDownloadingPdf ? 'Generando PDF...' : 'Descargar Informe (PDF)'}
              </span>
              <span className="inline xs:hidden sm:hidden">
                {isDownloadingPdf ? 'Generando...' : 'PDF'}
              </span>
            </button>

            <button
              onClick={() => window.print()}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-hover)] apple-btn-spring apple-pressable active:scale-[0.97] transition-colors hidden sm:flex items-center justify-center touch-manipulation shadow-sm"
              title="Imprimir versión A4"
              aria-label="Imprimir versión A4"
            >
              <Printer className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-hover)] text-xs font-medium apple-btn-spring apple-pressable active:scale-[0.97] transition-colors flex sm:hidden items-center justify-center touch-manipulation"
                title="Cerrar informe"
                aria-label="Cerrar informe"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Nivel 2: Selector de Semana Táctil de Alta Precisión con Micro-resortes */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          {/* Stepper de Semanas */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] hover:bg-[var(--glass-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring apple-pressable active:scale-[0.96] transition-all flex items-center justify-center touch-manipulation shadow-sm"
              title="Semana anterior"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center sm:text-left px-2 flex-1 sm:flex-initial">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-bold text-base sm:text-lg text-[var(--text-primary)] font-mono data-tabular tabular-nums tracking-tight">
                  Semana {dataset?.weekNumber || '--'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D97757]/15 text-[#D97757] dark:text-[#E28464] border border-[#D97757]/30 font-medium tracking-tight">
                  {weekOffset === 0 ? 'Esta Semana' : weekOffset === -1 ? 'Semana Pasada' : `${Math.abs(weekOffset)} sem. atrás`}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono data-tabular tabular-nums tracking-tight">
                {dataset ? `${dataset.startDate}  al  ${dataset.endDate}` : 'Cargando fechas...'}
              </p>
            </div>

            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              disabled={weekOffset >= 0}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] apple-btn-spring apple-pressable transition-all flex items-center justify-center touch-manipulation shadow-sm ${
                weekOffset >= 0
                  ? 'opacity-35 cursor-not-allowed'
                  : 'hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-primary)] active:scale-[0.96]'
              }`}
              title="Semana siguiente"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Indicador de telemetría consolidada en tiempo real */}
          <div className="hidden md:flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span>Telemetría consolidada 100% Real (Fit3 & Strava)</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Auditando telemetrías reales y generando informe clínico...</p>
        </div>
      ) : dataset && assessment ? (
        <div className="space-y-5">
          {/* Tarjeta de Resumen Ejecutivo y Puntuación Semanal */}
          <div className="liquid-glass-card border border-[var(--glass-border)] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#D97757] dark:text-[#E28464] tracking-wider uppercase">
                    Informe de Alto Rendimiento
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-pill border border-[var(--glass-border)] text-[var(--text-secondary)]">
                    Fase {dataset.progressionPlan.phase}: {dataset.progressionPlan.phaseName}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1 tracking-tight editorial-heading">
                  {assessment.executiveHeadline}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
                  Evaluación basada en 100% de datos reales registrados. Cuenta atrás: {dataset.countdown.daysRemaining} días ({dataset.countdown.weeksRemaining} semanas) para la Media Maratón del 28 de Febrero de 2027.
                </p>
              </div>

              {/* Puntuación de Adherencia */}
              <div className="flex items-center gap-3 bg-[var(--glass-surface)] border border-[var(--glass-border)] px-4 py-3 rounded-2xl shadow-sm">
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold editorial-heading">Puntuación</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] leading-none mt-0.5 font-mono data-tabular">
                    {assessment.overallScore}<span className="text-xs text-[#D97757]">/100</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 flex items-center justify-center text-[#D97757]">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Cuadrícula de KPIs Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Variación de Peso */}
            <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-4">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold editorial-heading">Variación Peso</span>
              <div className="flex items-baseline gap-1 mt-1 font-mono data-tabular">
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {dataset.summary.weightDeltaKg !== null
                    ? `${dataset.summary.weightDeltaKg > 0 ? '+' : ''}${dataset.summary.weightDeltaKg} kg`
                    : 'Sin cambio'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Actual: <strong className="text-[var(--text-primary)]">{dataset.summary.latestWeightKg} kg</strong>
              </p>
            </div>

            {/* KPI 2: Pasos Diarios */}
            <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-4">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold editorial-heading">Pasos Fit3 Media</span>
              <div className="flex items-baseline gap-1 mt-1 font-mono data-tabular">
                <span className="text-xl font-bold text-[#2D68C4] dark:text-[#5B95E0]">
                  {dataset.summary.avgDailySteps.toLocaleString()}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">/día</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Descanso: {dataset.summary.restDaysAvgSteps.toLocaleString()}
              </p>
            </div>

            {/* KPI 3: Cardio / Rodajes */}
            <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-4">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Volumen Running</span>
              <div className="flex items-baseline gap-1 mt-1 font-mono">
                <span className="text-xl font-black text-[#FC5200]">
                  {dataset.summary.totalCardioKm} km
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Ritmo: {dataset.summary.avgCardioPaceStr || 'N/A'}
              </p>
            </div>

            {/* KPI 4: Gimnasio & Cargas */}
            <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-4">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Fuerza & Blindaje</span>
              <div className="flex items-baseline gap-1 mt-1 font-mono">
                <span className="text-xl font-black text-emerald-500">
                  {(dataset.summary.totalGymVolumeKg / 1000).toFixed(1)} tn
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {dataset.summary.gymSessionsCount} sesiones ({dataset.summary.kneeProtectorSetsCount} sets rodilla)
              </p>
            </div>
          </div>

          {/* Gráfica de Pasos Diarios vs Línea de Descanso */}
          <div className="liquid-glass-card border border-[var(--glass-border)] rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Telemetría de Pasos Diarios (Fit3)</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Línea de advertencia en 9.000 pasos para permitir la desinflamación tendinosa en días de descanso.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full liquid-glass-pill border border-[var(--glass-border)] text-[var(--text-secondary)] font-mono">
                {dataset.summary.daysWithHealthCount}/7 días registrados
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStepsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--glass-surface-thick)',
                      borderColor: 'var(--glass-border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} pasos`, 'Total Pasos']}
                  />
                  <ReferenceLine y={9000} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Tope Descanso (9k)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="pasos" radius={[6, 6, 0, 0]}>
                    {chartStepsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.overstepped ? '#f43f5e' : entry.isRest ? '#f59e0b' : '#2D68C4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica de Recomposición Corporal (Recharts Dinámico) */}
          <BodyRecompositionChart
            data={recompositionData}
            currentWeightKg={dataset.summary.latestWeightKg}
            targetWeightKg={86}
          />

          {/* Diagnóstico Clínico del Coach: Fortalezas y Áreas de Mejora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna: Lo que fue bien */}
            <div className="liquid-glass-card border border-emerald-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Lo Que Ha Ido Bien (Fortalezas)</h3>
              </div>
              <div className="space-y-3">
                {assessment.strengths.map((str, idx) => (
                  <div key={idx} className="bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl p-3">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">{str.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{str.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna: Puntos a mejorar */}
            <div className="liquid-glass-card border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400">Puntos a Mejorar para la Próxima Semana</h3>
              </div>
              <div className="space-y-3">
                {assessment.improvements.map((imp, idx) => (
                  <div key={idx} className="bg-[var(--glass-surface)] border border-[var(--glass-border)] rounded-xl p-3">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">{imp.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{imp.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semáforo Articular y Prescripción de Fisioterapia */}
          <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-[#D97757]" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Semáforo Articular: Rodillas & Tendones</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Tendón Cuadricipital (Rodilla Izq.)</span>
                <p className="text-xs font-medium text-[var(--text-primary)] mt-1">{assessment.articularDiagnosis.tendonCuadricipitalStatus}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Tubérculo de Gerdy & Fascia Lata</span>
                <p className="text-xs font-medium text-[var(--text-primary)] mt-1">{assessment.articularDiagnosis.gerdyTubercleStatus}</p>
              </div>
            </div>

            <div className="bg-[#D97757]/10 border border-[#D97757]/20 rounded-xl p-3">
              <span className="text-[10px] font-bold text-[#D97757] uppercase tracking-wider">Protocolo de Descarga Activa:</span>
              <ul className="text-xs text-[var(--text-primary)] mt-1 space-y-1 list-disc list-inside">
                {assessment.articularDiagnosis.recommendedProtocols.map((p, idx) => (
                  <li key={idx} className="leading-relaxed">{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prescripción de la Semana N+1 (Plan de Acción) */}
          <div className="liquid-glass-card border border-[#2D68C4]/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-mono text-[#2D68C4] uppercase tracking-wider font-bold">
                  Planificación Prescrita
                </span>
                <h3 className="font-bold text-base text-[var(--text-primary)] mt-0.5">
                  Microciclo de la Semana {assessment.nextWeekPrescription.targetWeekNumber} ({assessment.nextWeekPrescription.phaseName})
                </h3>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#2D68C4]/15 border border-[#2D68C4]/30 text-[#2D68C4] text-xs font-semibold font-mono">
                Objetivo: {assessment.nextWeekPrescription.calorieTarget} kcal / {assessment.nextWeekPrescription.proteinTargetG}g P
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <p className="font-bold text-[#FC5200] mb-1">🏃‍♂️ Jueves: Rodaje Base</p>
                <p className="text-[var(--text-primary)]">{assessment.nextWeekPrescription.runningSessions.thursday.session}</p>
                <p className="text-[var(--text-secondary)] text-[11px] mt-1 font-mono">Ritmo: {assessment.nextWeekPrescription.runningSessions.thursday.targetPace}</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <p className="font-bold text-[#FC5200] mb-1">🏃‍♂️ Domingo: Tirada Larga CaCo</p>
                <p className="text-[var(--text-primary)]">{assessment.nextWeekPrescription.runningSessions.sunday.session}</p>
                <p className="text-[var(--text-secondary)] text-[11px] mt-1 font-mono">{assessment.nextWeekPrescription.runningSessions.sunday.cacoProtocol}</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <p className="font-bold text-emerald-500 mb-1">🏋️‍♂️ Fuerza & Blindaje Articular</p>
                <p className="text-[var(--text-primary)]">{assessment.nextWeekPrescription.gymAdjustments.legShieldFocus}</p>
                <p className="text-emerald-500 text-[11px] mt-1">{assessment.nextWeekPrescription.gymAdjustments.isometricsPrescribed}</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <p className="font-bold text-amber-500 mb-1">🛑 Regla de Oro de Descanso</p>
                <p className="text-[var(--text-primary)]">{assessment.nextWeekPrescription.restDaysRule}</p>
                <p className="text-[var(--text-secondary)] text-[11px] mt-1">{assessment.nextWeekPrescription.targetWeightRecommendation}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Adaptación Dinámica de Dieta y Macros */}
          {assessment.dietPlan && (
            <div className="liquid-glass-card border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500">
                      Adaptación Dinámica Semanal (100% Datos Reales)
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Prescripción de Dieta para la Semana {assessment.nextWeekPrescription.targetWeekNumber}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleApplyDiet}
                  disabled={isApplyingDiet}
                  className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  {isApplyingDiet ? 'Aplicando...' : '⚡ Aplicar Esta Dieta a la App'}
                </button>
              </div>

              {dietAppliedMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{dietAppliedMessage}</span>
                </div>
              )}

              {/* Grid de Macros Adaptados */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Calorías</span>
                  <p className="text-base font-black text-[var(--text-primary)]">{assessment.dietPlan.adaptation.calories} <span className="text-[10px] text-[var(--text-secondary)] font-normal">kcal</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Proteína</span>
                  <p className="text-base font-black text-emerald-500">{assessment.dietPlan.adaptation.protein_g}g <span className="text-[10px] text-[var(--text-secondary)] font-normal">2.0g/kg</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Carbohidratos</span>
                  <p className="text-base font-black text-amber-500">{assessment.dietPlan.adaptation.carbs_g}g <span className="text-[10px] text-[var(--text-secondary)] font-normal">Glucógeno</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Grasas</span>
                  <p className="text-base font-black text-[#2D68C4] dark:text-[#5B95E0]">{assessment.dietPlan.adaptation.fat_g}g <span className="text-[10px] text-[var(--text-secondary)] font-normal">Hormonal</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Hidratación</span>
                  <p className="text-base font-black text-cyan-500">{(assessment.dietPlan.adaptation.water_ml / 1000).toFixed(1)}L <span className="text-[10px] text-[var(--text-secondary)] font-normal">Agua</span></p>
                </div>
              </div>

              {/* Justificación y Tips */}
              <div className="p-3 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs space-y-2">
                <p className="text-[var(--text-primary)] leading-relaxed">
                  <strong className="text-emerald-500">Razón Biomecánica:</strong> {assessment.dietPlan.adaptation.reason}
                </p>
                <div className="pt-2 border-t border-[var(--glass-border)] text-[11px] text-[var(--text-secondary)] space-y-1">
                  {assessment.dietPlan.recommendations.map((rec, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500">•</span>
                      <span>{rec}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auditoría Bromatológica Semanal & Diversidad de Alimentos */}
          {dataset.foodDiversity && (
            <div className="liquid-glass-card border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500">
                      Nutrición Avanzada & Microbioma
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Auditoría Bromatológica Semanal & Variedad de Alimentos
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl liquid-glass-pill border border-[var(--glass-border)] flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">Score Variedad:</span>
                    <span className={`text-sm font-black font-mono ${
                      dataset.foodDiversity.diversityScore >= 80 ? 'text-emerald-500' :
                      dataset.foodDiversity.diversityScore >= 60 ? 'text-blue-500' :
                      dataset.foodDiversity.diversityScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {dataset.foodDiversity.diversityScore}/100
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                    dataset.foodDiversity.diversityLevel === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                    dataset.foodDiversity.diversityLevel === 'GOOD' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                    dataset.foodDiversity.diversityLevel === 'MODERATE' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  }`}>
                    {dataset.foodDiversity.diversityLevel}
                  </span>
                </div>
              </div>

              {/* Barra de Progreso de Plant Points (Objetivo 30 plantas de The American Gut Project) */}
              <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Apple className="w-3.5 h-3.5 text-emerald-500" /> Plant Points (Variedad Vegetal)
                  </span>
                  <span className="font-mono text-[var(--text-secondary)] text-[11px]">
                    <strong>{dataset.foodDiversity.uniquePlantCount}</strong> / {dataset.foodDiversity.plantScoreTarget} plantas únicas ({dataset.foodDiversity.plantScorePercentage}%)
                  </span>
                </div>
                <div className="w-full bg-[var(--glass-surface-thick)] h-2 rounded-full overflow-hidden border border-[var(--glass-border)]">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dataset.foodDiversity.plantScorePercentage}%` }}
                  />
                </div>
                {dataset.foodDiversity.plantPoints.length > 0 && (
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2 italic truncate">
                    Plantas registradas: {dataset.foodDiversity.plantPoints.slice(0, 10).join(', ')}
                    {dataset.foodDiversity.plantPoints.length > 10 ? ` y ${dataset.foodDiversity.plantPoints.length - 10} más` : ''}
                  </p>
                )}
              </div>

              {/* Desglose de Grupos Bromatológicos */}
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2">Grupos Bromatológicos Consumidos esta Semana</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.values(dataset.foodDiversity.groupsBreakdown).map((group, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl text-left border text-xs transition-colors ${
                        group.detected
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-primary)]'
                          : 'bg-[var(--glass-surface)] border-[var(--glass-border)] opacity-60 text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold truncate">{group.name}</span>
                        {group.detected && (
                          <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-500 font-bold">
                            {group.count}x
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 truncate">
                        {group.detected && group.examples.length > 0 ? group.examples.join(', ') : 'Sin ingesta'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas de Sobreconsumo / Monotonía */}
              {dataset.foodDiversity.abuseWarnings.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Alertas de Monotonía / Sobreconsumo</span>
                  </div>
                  <ul className="text-xs text-[var(--text-primary)] space-y-1 list-disc list-inside">
                    {dataset.foodDiversity.abuseWarnings.map((warn) => (
                      <li key={warn.id} className="leading-relaxed">
                        <strong>{warn.food}:</strong> {warn.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alertas de Carencias */}
              {dataset.foodDiversity.deficiencyAlerts.length > 0 && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Carencias Nutricionales a Subsanar</span>
                  </div>
                  <div className="space-y-1.5">
                    {dataset.foodDiversity.deficiencyAlerts.map((def) => (
                      <div key={def.id} className="text-xs text-[var(--text-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-[var(--glass-surface)] p-2 rounded-xl border border-[var(--glass-border)]">
                        <div>
                          <strong className="text-rose-500">{def.groupName}:</strong> {def.message}
                        </div>
                        <span className="text-[10px] text-emerald-500 font-semibold self-start sm:self-auto shrink-0">
                          Recomendado: {def.recommendedFood}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendaciones de Rotación de Mercadona */}
              {dataset.foodDiversity.rotationSuggestions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Propuestas de Rotación Saludable (Mercadona)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {dataset.foodDiversity.rotationSuggestions.map((sug, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[var(--text-secondary)] line-through">
                            {sug.originalFood}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-500">
                            → {sug.alternativeFood}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-primary)]">{sug.benefit}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] italic">
                          🛒 {sug.mercadonaProduct}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla de Telemetría Detallada Día a Día */}
          <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-5 overflow-x-auto">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Desglose Diario Auditado (100% Datos Reales)</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--glass-border)] text-[var(--text-secondary)] text-[10px] uppercase font-semibold">
                  <th className="py-2 pr-3">Día</th>
                  <th className="py-2 px-3">Pasos</th>
                  <th className="py-2 px-3">FC Reposo</th>
                  <th className="py-2 px-3">Sueño</th>
                  <th className="py-2 px-3">Kcal</th>
                  <th className="py-2 px-3">Proteína</th>
                  <th className="py-2 pl-3">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {dataset.days.map((day, idx) => (
                  <tr key={idx} className="hover:bg-[var(--glass-surface)] transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)]">
                      {day.dayName} <span className="text-[10px] text-[var(--text-secondary)] font-normal">{day.date.substring(5)}</span>
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${day.isRestDay && day.health.steps > 9500 ? 'text-rose-500 font-bold' : 'text-[var(--text-secondary)]'}`}>
                      {day.health.steps > 0 ? day.health.steps.toLocaleString() : 'Sin reg.'}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                      {day.health.restingHr ? `${day.health.restingHr} bpm` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                      {day.health.sleepMinutes ? `${(day.health.sleepMinutes / 60).toFixed(1)} h` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                      {day.nutrition.hasData ? `${day.nutrition.totalCalories}` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                      {day.nutrition.hasData ? `${day.nutrition.totalProteinG} g` : '--'}
                    </td>
                    <td className="py-2.5 pl-3">
                      {day.cardio.hasActivity ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FC5200]/15 text-[#FC5200] border border-[#FC5200]/30 text-[10px] font-mono">
                          Run {day.cardio.totalDistanceKm}k @ {day.cardio.avgPaceStr || ''}
                        </span>
                      ) : day.gym.hasWorkout ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                          Gym ({day.gym.totalSets} series)
                        </span>
                      ) : day.isRestDay ? (
                        <span className="text-[var(--text-secondary)] text-[11px]">Descanso</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)] text-[11px]">Sin registros</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pie de navegación ergonómico para volver a Hoy tras la lectura completa */}
          {onClose && (
            <div className="pt-4 pb-6 flex items-center justify-center">
              <button
                onClick={onClose}
                className="flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-hover)] border border-[var(--glass-border)] text-sm font-semibold text-[var(--text-primary)] hover:text-[#D97757] dark:hover:text-[#E28464] apple-btn-spring apple-pressable active:scale-[0.97] transition-all shadow-sm touch-manipulation group"
                aria-label="Volver a la vista Hoy"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Volver a la vista Hoy</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
