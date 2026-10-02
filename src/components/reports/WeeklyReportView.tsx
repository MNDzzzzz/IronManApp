'use client';

// ====================================================================
// VISTA DE INFORME Y RESUMEN SEMANAL: IronManApp
// 100% Datos Reales de Samsung Galaxy Fit3, Strava, Gym, Nutrición y Báscula
// Con diagnóstico biomecánico, fisioterapia y descarga de PDF oficial.
// ====================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Activity,
  Dumbbell,
  Utensils,
  Footprints,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Printer,
  Sparkles,
  ArrowRight,
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

  return (
    <div className="pb-24 pt-2 text-zinc-100 max-w-4xl mx-auto px-4">
      {/* Barra de Navegación Semanal */}
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 mb-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Controles de Semana */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center sm:text-left px-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">
                  Semana {dataset?.weekNumber || '--'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                  {weekOffset === 0 ? 'Esta Semana' : weekOffset === -1 ? 'Semana Pasada' : `${Math.abs(weekOffset)} sem. atrás`}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {dataset ? `${dataset.startDate}  al  ${dataset.endDate}` : 'Cargando fechas...'}
              </p>
            </div>

            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              disabled={weekOffset >= 0}
              className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 transition-colors ${
                weekOffset >= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-800'
              }`}
              title="Semana siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadPdf}
              disabled={isLoading || isDownloadingPdf}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs tracking-wide shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'Generando PDF...' : 'Descargar Informe (PDF)'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors hidden sm:block"
              title="Imprimir versión A4"
            >
              <Printer className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Auditando telemetrías reales y generando informe clínico...</p>
        </div>
      ) : dataset && assessment ? (
        <div className="space-y-5">
          {/* Tarjeta de Resumen Ejecutivo y Puntuación Semanal */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-orange-400 tracking-wider uppercase">
                    Informe de Alto Rendimiento
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    Fase {dataset.progressionPlan.phase}: {dataset.progressionPlan.phaseName}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {assessment.executiveHeadline}
                </h1>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Evaluación basada en 100% de datos reales registrados. Cuenta atrás: {dataset.countdown.daysRemaining} días ({dataset.countdown.weeksRemaining} semanas) para la Media Maratón del 28 de Febrero de 2027.
                </p>
              </div>

              {/* Puntuación de Adherencia */}
              <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-4 py-3 rounded-2xl">
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Puntuación</p>
                  <p className="text-2xl font-black text-white leading-none mt-0.5">
                    {assessment.overallScore}<span className="text-xs text-orange-400">/100</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Cuadrícula de KPIs Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Variación de Peso */}
            <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Variación Peso</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-white">
                  {dataset.summary.weightDeltaKg !== null
                    ? `${dataset.summary.weightDeltaKg > 0 ? '+' : ''}${dataset.summary.weightDeltaKg} kg`
                    : 'Sin cambio'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Actual: <strong className="text-zinc-200">{dataset.summary.latestWeightKg} kg</strong>
              </p>
            </div>

            {/* KPI 2: Pasos Diarios */}
            <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Pasos Fit3 Media</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-blue-400">
                  {dataset.summary.avgDailySteps.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">/día</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Descanso: {dataset.summary.restDaysAvgSteps.toLocaleString()}
              </p>
            </div>

            {/* KPI 3: Cardio / Rodajes */}
            <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Volumen Running</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-orange-400">
                  {dataset.summary.totalCardioKm} km
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ritmo: {dataset.summary.avgCardioPaceStr || 'N/A'}
              </p>
            </div>

            {/* KPI 4: Gimnasio & Cargas */}
            <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Fuerza & Blindaje</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-400">
                  {(dataset.summary.totalGymVolumeKg / 1000).toFixed(1)} tn
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {dataset.summary.gymSessionsCount} sesiones ({dataset.summary.kneeProtectorSetsCount} sets rodilla)
              </p>
            </div>
          </div>

          {/* Gráfica de Pasos Diarios vs Línea de Descanso */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Telemetría de Pasos Diarios (Fit3)</h3>
                <p className="text-xs text-zinc-400">
                  Línea de advertencia en 9.000 pasos para permitir la desinflamación tendinosa en días de descanso.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                {dataset.summary.daysWithHealthCount}/7 días registrados
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStepsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} pasos`, 'Total Pasos']}
                  />
                  <ReferenceLine y={9000} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Tope Descanso (9k)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="pasos" radius={[6, 6, 0, 0]}>
                    {chartStepsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.overstepped ? '#f43f5e' : entry.isRest ? '#f59e0b' : '#0284c7'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagnóstico Clínico del Coach: Fortalezas y Áreas de Mejora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna: Lo que fue bien */}
            <div className="bg-zinc-950/80 border border-emerald-950/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-emerald-400">Lo Que Ha Ido Bien (Fortalezas)</h3>
              </div>
              <div className="space-y-3">
                {assessment.strengths.map((str, idx) => (
                  <div key={idx} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-white">{str.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{str.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna: Puntos a mejorar */}
            <div className="bg-zinc-950/80 border border-amber-950/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-amber-400">Puntos a Mejorar para la Próxima Semana</h3>
              </div>
              <div className="space-y-3">
                {assessment.improvements.map((imp, idx) => (
                  <div key={idx} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-white">{imp.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{imp.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semáforo Articular y Prescripción de Fisioterapia */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-sm text-white">Semáforo Articular: Rodillas & Tendones</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Tendón Cuadricipital (Rodilla Izq.)</span>
                <p className="text-xs font-medium text-zinc-200 mt-1">{assessment.articularDiagnosis.tendonCuadricipitalStatus}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Tubérculo de Gerdy & Fascia Lata</span>
                <p className="text-xs font-medium text-zinc-200 mt-1">{assessment.articularDiagnosis.gerdyTubercleStatus}</p>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Protocolo de Descarga Activa:</span>
              <ul className="text-xs text-zinc-300 mt-1 space-y-1 list-disc list-inside">
                {assessment.articularDiagnosis.recommendedProtocols.map((p, idx) => (
                  <li key={idx} className="leading-relaxed">{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prescripción de la Semana N+1 (Plan de Acción) */}
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-blue-900/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold">
                  Planificación Prescrita
                </span>
                <h3 className="font-bold text-base text-white mt-0.5">
                  Microciclo de la Semana {assessment.nextWeekPrescription.targetWeekNumber} ({assessment.nextWeekPrescription.phaseName})
                </h3>
              </div>
              <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                Objetivo: {assessment.nextWeekPrescription.calorieTarget} kcal / {assessment.nextWeekPrescription.proteinTargetG}g P
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <p className="font-bold text-orange-400 mb-1">🏃‍♂️ Jueves: Rodaje Base</p>
                <p className="text-zinc-300">{assessment.nextWeekPrescription.runningSessions.thursday.session}</p>
                <p className="text-zinc-500 text-[11px] mt-1">Ritmo: {assessment.nextWeekPrescription.runningSessions.thursday.targetPace}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <p className="font-bold text-orange-400 mb-1">🏃‍♂️ Domingo: Tirada Larga CaCo</p>
                <p className="text-zinc-300">{assessment.nextWeekPrescription.runningSessions.sunday.session}</p>
                <p className="text-zinc-500 text-[11px] mt-1">{assessment.nextWeekPrescription.runningSessions.sunday.cacoProtocol}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <p className="font-bold text-emerald-400 mb-1">🏋️‍♂️ Fuerza & Blindaje Articular</p>
                <p className="text-zinc-300">{assessment.nextWeekPrescription.gymAdjustments.legShieldFocus}</p>
                <p className="text-emerald-400 text-[11px] mt-1">{assessment.nextWeekPrescription.gymAdjustments.isometricsPrescribed}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <p className="font-bold text-amber-400 mb-1">🛑 Regla de Oro de Descanso</p>
                <p className="text-zinc-300">{assessment.nextWeekPrescription.restDaysRule}</p>
                <p className="text-zinc-500 text-[11px] mt-1">{assessment.nextWeekPrescription.targetWeightRecommendation}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Adaptación Dinámica de Dieta y Macros */}
          {assessment.dietPlan && (
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                      Adaptación Dinámica Semanal (100% Datos Reales)
                    </span>
                    <h3 className="text-sm font-bold text-white">
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
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{dietAppliedMessage}</span>
                </div>
              )}

              {/* Grid de Macros Adaptados */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Calorías</span>
                  <p className="text-base font-black text-white">{assessment.dietPlan.adaptation.calories} <span className="text-[10px] text-zinc-500 font-normal">kcal</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Proteína</span>
                  <p className="text-base font-black text-emerald-400">{assessment.dietPlan.adaptation.protein_g}g <span className="text-[10px] text-zinc-500 font-normal">2.0g/kg</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Carbohidratos</span>
                  <p className="text-base font-black text-amber-400">{assessment.dietPlan.adaptation.carbs_g}g <span className="text-[10px] text-zinc-500 font-normal">Glucógeno</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Grasas</span>
                  <p className="text-base font-black text-blue-400">{assessment.dietPlan.adaptation.fat_g}g <span className="text-[10px] text-zinc-500 font-normal">Hormonal</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 block">Hidratación</span>
                  <p className="text-base font-black text-cyan-400">{(assessment.dietPlan.adaptation.water_ml / 1000).toFixed(1)}L <span className="text-[10px] text-zinc-500 font-normal">Agua</span></p>
                </div>
              </div>

              {/* Justificación y Tips */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-2">
                <p className="text-zinc-300 leading-relaxed">
                  <strong className="text-emerald-400">Razón Biomecánica:</strong> {assessment.dietPlan.adaptation.reason}
                </p>
                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  {assessment.dietPlan.recommendations.map((rec, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{rec}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Telemetría Detallada Día a Día */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 overflow-x-auto">
            <h3 className="font-bold text-sm text-white mb-3">Desglose Diario Auditado (100% Datos Reales)</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-semibold">
                  <th className="py-2 pr-3">Día</th>
                  <th className="py-2 px-3">Pasos</th>
                  <th className="py-2 px-3">FC Reposo</th>
                  <th className="py-2 px-3">Sueño</th>
                  <th className="py-2 px-3">Kcal</th>
                  <th className="py-2 px-3">Proteína</th>
                  <th className="py-2 pl-3">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {dataset.days.map((day, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-white">
                      {day.dayName} <span className="text-[10px] text-zinc-500 font-normal">{day.date.substring(5)}</span>
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${day.isRestDay && day.health.steps > 9500 ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>
                      {day.health.steps > 0 ? day.health.steps.toLocaleString() : 'Sin reg.'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {day.health.restingHr ? `${day.health.restingHr} bpm` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {day.health.sleepMinutes ? `${(day.health.sleepMinutes / 60).toFixed(1)} h` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {day.nutrition.hasData ? `${day.nutrition.totalCalories}` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {day.nutrition.hasData ? `${day.nutrition.totalProteinG} g` : '--'}
                    </td>
                    <td className="py-2.5 pl-3">
                      {day.cardio.hasActivity ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">
                          Run {day.cardio.totalDistanceKm}k @ {day.cardio.avgPaceStr || ''}
                        </span>
                      ) : day.gym.hasWorkout ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          Gym ({day.gym.totalSets} series)
                        </span>
                      ) : day.isRestDay ? (
                        <span className="text-zinc-500 text-[11px]">Descanso</span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">Sin registros</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
