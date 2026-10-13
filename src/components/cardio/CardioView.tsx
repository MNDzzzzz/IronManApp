'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Gauge,
  Camera,
  Award,
  ShieldCheck,
  Scale,
  Sparkles,
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
import { CardioActivity } from '@/types/database';
import { apiFetch, getActiveAthleteId } from '@/lib/api/apiClient';
import { StravaUploadModal } from '@/components/workout/StravaUploadModal';
import { simulateHalfMarathon2027 } from '@/lib/cardio/raceSimulatorEngine';
import dynamic from 'next/dynamic';
import { DailyCheckInSheet, DailyCheckInInitialData } from '@/components/social/DailyCheckInSheet';

const RaceSimulatorModal = dynamic(
  () => import('@/components/cardio/RaceSimulatorModal').then((m) => m.RaceSimulatorModal),
  { ssr: false }
);

interface CardioViewProps {
  activities: CardioActivity[];
  selectedActivity: CardioActivity | null;
  onSelectActivity: (act: CardioActivity | null) => void;
  onRefresh?: () => void;
  currentProfile?: any;
}

export const CardioView: React.FC<CardioViewProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
  onRefresh,
  currentProfile,
}) => {
  const [localActivities, setLocalActivities] = useState<CardioActivity[]>(activities);
  const [activeMetric, setActiveMetric] = useState<'all' | 'hr' | 'alt'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStravaModalOpen, setIsStravaModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  // Estados de Check-in en Tribu
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInInitialData, setCheckInInitialData] = useState<DailyCheckInInitialData | null>(null);

  const handleOpenCheckIn = (activity?: CardioActivity | null) => {
    const target = activity || localActivities[0];
    if (!target) return;
    const distKm = parseFloat((target.distance / 1000).toFixed(1));
    const durMin = Math.round((target.elapsed_time || target.moving_time || 0) / 60);
    setCheckInInitialData({
      activityType: 'running',
      title: target.name ? `Rodaje: ${target.name}` : `Rodaje Aeróbico Z2 (${distKm} km)`,
      distance_km: distKm,
      duration_min: durMin,
      avg_hr: target.avg_hr ?? undefined,
      metricsNote: `Rodaje aeróbico finalizado con ${distKm} km en ${durMin} min.${target.avg_hr ? ` FC media: ${target.avg_hr} bpm.` : ''}`,
      badge_label: `Rodaje finalizado: ${distKm} km • ${durMin} min`,
    });
    setIsCheckInOpen(true);
  };

  // Bloquear scroll de fondo cuando hay un modal abierto (UX fluida estilo Apple Bottom Sheet)
  useEffect(() => {
    if (selectedActivity || isAddModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedActivity, isAddModalOpen]);

  // Estimación determinista para Media Maratón 2027 basada en bioenergética
  const raceEstimate = useMemo(() => {
    return simulateHalfMarathon2027({
      currentWeightKg: 101,
      projectedWeightKg: 86,
      basePaceMinKm: 5.5,
      targetCadenceSpm: 172,
      cacoProtocol: true,
    });
  }, []);

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
    setCreateError('');
    try {
      let safeStartDate: string;
      try {
        const d = new Date(formDate);
        safeStartDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch {
        safeStartDate = new Date().toISOString();
      }

      const distanceMeters = Math.round(parseFloat(formDistanceKm) * 1000);
      const elapsedSeconds = Math.round(parseFloat(formDurationMin) * 60);
      const avgHr = formAvgHr ? parseInt(formAvgHr, 10) : undefined;
      const maxHr = formMaxHr ? parseInt(formMaxHr, 10) : undefined;
      const avgCadence = formCadence ? parseInt(formCadence, 10) : 168;

      const activeAthleteId = currentProfile?.id || getActiveAthleteId() || '';

      const res = await apiFetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-athlete-id': activeAthleteId,
        },
        body: JSON.stringify({
          userId: activeAthleteId,
          userProfile: currentProfile,
          name: formName.trim() || 'Rodaje CaCo Galaxy Fit3',
          type: 'Run',
          start_date: safeStartDate,
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al guardar el rodaje.');
      }

      if (json.activity) {
        setLocalActivities((prev) => [json.activity, ...prev]);

        // Auto-checkin inmediato en la Tribu activa
        try {
          const athlete = currentProfile || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ironman_athlete_profile') || 'null') : null);
          const effectiveId = athlete?.id || activeAthleteId;
          if (effectiveId) {
            const distKm = parseFloat((json.activity.distance / 1000).toFixed(1));
            const durMin = Math.round((json.activity.elapsed_time || json.activity.moving_time || 0) / 60);
            try {
              await apiFetch('/api/checkins', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-athlete-id': effectiveId,
                },
                body: JSON.stringify({
                  userId: effectiveId,
                  userProfile: athlete,
                  activityType: 'running',
                  title: json.activity.name || `Rodaje Aeróbico Z2 (${distKm} km)`,
                  stravaActivityId: String(json.activity.id),
                  metrics: {
                    distance_km: distKm,
                    duration_min: durMin,
                    avg_hr: json.activity.avg_hr,
                    notes: json.activity.notes,
                  },
                }),
              });
            } catch (cErr) {
              console.warn('Aviso en check-in:', cErr);
            }
          }
        } catch (checkinErr) {
          console.warn('Aviso publicando auto-checkin en tribu:', checkinErr);
        }
      }
      setIsAddModalOpen(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);

      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      console.error('Error registrando rodaje:', err);
      setCreateError(err instanceof Error ? err.message : 'Error al guardar la actividad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 sm:pb-16 font-sans">
      {/* ENCABEZADO MINIMALISTA ESTILO APPLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#FC5200] editorial-heading">
            Carrera & Aeróbico
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-tight apple-title">
            Cardio & Resistencia
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulatorModalOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-full liquid-glass-pill shadow-sm text-xs font-bold text-[#FC5200] hover:bg-[#FC5200]/10 apple-btn-spring"
            title="Simular ritmo y estrategia para la Media Maratón 2027"
          >
            <Award className="w-4 h-4" />
            <span className="apple-subhead font-semibold">Simulador 21K</span>
          </button>
          <button
            onClick={() => setIsStravaModalOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-full liquid-glass-pill shadow-sm text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring"
            title="Escanear captura de Strava con IA"
          >
            <Camera className="w-4 h-4" />
            <span className="apple-subhead font-semibold">Strava</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-full bg-[#FC5200] text-white font-bold text-xs shadow-md shadow-[#FC5200]/25 apple-btn-spring"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="apple-subhead font-semibold">Añadir</span>
          </button>
        </div>
      </div>

      {/* BENTO DUAL CARDIO: ZONAS Z2/Z4 & ESTIMACIONES 21K (Apple Liquid Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TARJETA 1: ZONAS DE FRECUENCIA CARDÍACA Z2 / Z4 */}
        <div className="p-5 sm:p-6 rounded-3xl liquid-glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FC5200] animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
                Zonas Cardíacas • 101 kg
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 data-tabular">
              Z2 Óptima
            </span>
          </div>

          {/* Barra de Zonas Cardíacas Segmentada Visual Apple */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-mono data-tabular">
              <span>Z1 &lt;130</span>
              <span className="text-emerald-500 font-bold">Z2 (130-145)</span>
              <span>Z3 (146-155)</span>
              <span className="text-rose-500 font-bold">Z4 &gt;156</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex p-0.5 gap-0.5">
              <div className="w-[20%] h-full rounded-l-full bg-blue-400/60" title="Z1 Calentamiento" />
              <div className="w-[40%] h-full bg-emerald-500 shadow-sm shadow-emerald-500/50" title="Z2 Salud Articular" />
              <div className="w-[20%] h-full bg-amber-400/70" title="Z3 Tempo" />
              <div className="w-[20%] h-full rounded-r-full bg-rose-500" title="Z4 Umbral Anaeróbico" />
            </div>
          </div>

          {/* Comparativa Z2 vs Z4 en Cuidado Articular */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--glass-border-subtle)]">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Zona 2 (130-145)</span>
              </div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                Protección Rotuliana
              </p>
              <p className="text-[9px] text-[var(--text-secondary)] leading-tight">
                Metabolismo graso y mínimo impacto a 101 kg.
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
              <div className="flex items-center gap-1.5 text-rose-500">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Zona 4 (&gt;156)</span>
              </div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                Alerta de Sobrecarga
              </p>
              <p className="text-[9px] text-[var(--text-secondary)] leading-tight">
                Fatiga articular. Si sube, caminar en CaCo.
              </p>
            </div>
          </div>

          {/* Métricas de Cadencia y Método CaCo */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Cadencia</p>
              <p className="text-base sm:text-lg font-bold font-mono text-[var(--text-primary)] data-tabular">165-175 <span className="text-[10px] text-[var(--text-tertiary)] font-normal">ppm</span></p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Método</p>
              <p className="text-base sm:text-lg font-bold font-mono text-amber-500 data-tabular">CaCo</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Impacto</p>
              <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 data-tabular">Bajo</p>
            </div>
          </div>
        </div>

        {/* TARJETA 2: ESTIMACIONES 21K (MEDIA MARATÓN 28-FEB-2027) */}
        <div className="p-5 sm:p-6 rounded-3xl liquid-glass-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FC5200]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
                  Proyección 21K • 28 Feb 2027
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FC5200]/15 text-[#FC5200] font-bold">
                21.097 km
              </span>
            </div>

            {/* Número grande Apple Display */}
            <div className="mt-3 text-center sm:text-left">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">
                Tiempo Estimado Final (Objetivo 86 kg)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#FC5200] font-mono data-tabular tracking-tight leading-none mt-1">
                {raceEstimate.totalTimeFormatted}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                <span className="text-[var(--text-secondary)]">
                  Ritmo: <strong className="text-emerald-500 data-tabular">{raceEstimate.projectedPaceStr}</strong>
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--text-secondary)]">
                  Ahorro peso: <strong className="text-[#FC5200] data-tabular">-{raceEstimate.weightTimeSavedMinutes} min</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de Carga Articular y Acceso a Simulador */}
          <div className="pt-2 border-t border-[var(--glass-border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Impacto acumulado estimado:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)] data-tabular">
                {raceEstimate.kneeImpactTons} tons
              </span>
            </div>

            <button
              onClick={() => setIsSimulatorModalOpen(true)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-white/60 dark:bg-white/[0.08] hover:bg-[#FC5200]/10 border border-white/70 dark:border-white/10 text-xs font-bold text-[#FC5200] flex items-center justify-center gap-2 apple-btn-spring transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Personalizar Simulación & Geles</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* BANNER SUTIL APPLE: PUBLICAR CHECK-IN EN TU TRIBU ⚡ */}
      {localActivities.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-[#FC5200]/15 border border-[#FC5200]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-orange-500/5 animate-apple-fade-in apple-interactive-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FC5200] via-orange-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] apple-title">
                  Publicar Check-in en tu Tribu ⚡
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  +100 XP
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Último rodaje: {(localActivities[0].distance / 1000).toFixed(1)} km • {Math.round(localActivities[0].elapsed_time / 60)} min {localActivities[0].avg_hr ? `• ${localActivities[0].avg_hr} bpm` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenCheckIn(localActivities[0])}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FC5200] via-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 apple-pressable active:scale-97 self-stretch sm:self-auto justify-center shrink-0"
          >
            <span>Publicar Check-in ⚡</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* LISTA DE ACTIVIDADES ESTILO TARJETA DE HOY */}
      {localActivities.length === 0 ? (
        <div className="p-8 rounded-3xl liquid-glass-card text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FC5200]/10 text-[#FC5200] flex items-center justify-center mx-auto text-xl">
            🏃
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Sin rodajes registrados</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Registra tu salida manualmente o escanea tu captura de Strava con IA.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] editorial-heading">
              Sesiones Registradas ({localActivities.length})
            </span>
          </div>

          {localActivities.map((activity) => {
            const distanceKm = (activity.distance / 1000).toFixed(2);
            const paceMinPerKm = activity.moving_time && activity.distance > 0
              ? ((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(2)
              : '5.30';
            const cadence = activity.avg_cadence || 168;
            const isHighHr = (activity.avg_hr || 0) > 152;

            return (
              <div
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className="p-5 rounded-3xl liquid-glass-card hover:border-[#FC5200]/40 transition-all cursor-pointer space-y-3 apple-interactive-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{activity.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {new Date(activity.start_date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })} • {activity.type || 'Carrera'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/40 dark:bg-white/[0.06] text-[var(--text-secondary)] border border-[var(--glass-border-subtle)]">
                      {activity.source === 'strava_screenshot' ? 'Strava' : 'Fit3'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                </div>

                {/* Métricas tabulares limpias con Tipografía Óptica Apple */}
                <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-[var(--glass-border-subtle)] text-center">
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Distancia</span>
                    <span className="text-base sm:text-lg font-black font-mono text-[var(--text-primary)] data-tabular tracking-tight apple-title">{distanceKm} <span className="text-xs font-normal text-[var(--text-tertiary)]">km</span></span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Ritmo</span>
                    <span className="text-base sm:text-lg font-black font-mono text-[var(--text-primary)] data-tabular tracking-tight apple-title">{paceMinPerKm} <span className="text-xs font-normal text-[var(--text-tertiary)]">/km</span></span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Cadencia</span>
                    <span className="text-base sm:text-lg font-black font-mono text-amber-500 data-tabular tracking-tight apple-title">{cadence} <span className="text-xs font-normal text-[var(--text-tertiary)]">ppm</span></span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Pulso</span>
                    <span className="text-base sm:text-lg font-black font-mono text-rose-500 data-tabular tracking-tight apple-title">{activity.avg_hr || 142} <span className="text-xs font-normal text-[var(--text-tertiary)]">bpm</span></span>
                  </div>
                </div>

                {/* Nota o alerta biomecánica */}
                {isHighHr ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Pulso superior a Zona 2. Añade más minutos caminando para cuidar tus articulaciones (101 kg).</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Zona aeróbica perfecta (Z2). Rodillas y tendón rotuliano protegidos.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA REGISTRAR RODAJE FIT3 - APPLE BOTTOM SHEET EN MÓVIL */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto liquid-glass-sheet p-6 pb-12 sm:pb-8 space-y-4 shadow-2xl rounded-t-[32px] sm:rounded-3xl animate-apple-scale-in">
            {/* Tirador táctil Apple para Bottom Sheet en móvil */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] apple-title">Registrar Rodaje Fit3</h2>
                <p className="text-xs text-[var(--text-secondary)]">Datos obtenidos de tu Samsung Galaxy Fit3</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 mb-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateActivity} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Nombre de la sesión</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDistanceKm}
                    onChange={(e) => setFormDistanceKm(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors data-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    value={formDurationMin}
                    onChange={(e) => setFormDurationMin(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors data-tabular"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">FC Media (bpm)</label>
                  <input
                    type="number"
                    value={formAvgHr}
                    onChange={(e) => setFormAvgHr(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors data-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">FC Máx (bpm)</label>
                  <input
                    type="number"
                    value={formMaxHr}
                    onChange={(e) => setFormMaxHr(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors data-tabular"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Cadencia (ppm)</label>
                  <input
                    type="number"
                    value={formCadence}
                    onChange={(e) => setFormCadence(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[#FC5200] transition-colors data-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Sensaciones & Notas Biomecánicas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[#FC5200] resize-none transition-colors"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl liquid-glass-pill text-[var(--text-secondary)] text-xs font-bold hover:text-[var(--text-primary)] apple-btn-spring"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[#FC5200] text-white text-xs font-bold disabled:opacity-50 apple-btn-spring transition-all shadow-md shadow-[#FC5200]/25"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Rodaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE ACTIVIDAD CON GRÁFICA MULTICAPA - APPLE BOTTOM SHEET EN MÓVIL */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectActivity(null);
          }}
        >
          <div className="max-h-[85vh] overflow-y-auto w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl liquid-glass-sheet p-6 pb-12 sm:pb-8 space-y-4 shadow-2xl animate-apple-scale-in">
            {/* Tirador táctil Apple para Bottom Sheet en móvil */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Header del Modal */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectActivity(null)}
                className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring"
                aria-label="Cerrar detalle"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] editorial-heading">
                {selectedActivity.source === 'strava_screenshot' ? 'Telemetría Strava' : 'Detalle Galaxy Fit3'}
              </span>
              <div className="w-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)] apple-title">{selectedActivity.name}</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {new Date(selectedActivity.start_date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>

            {/* Grid 4 Stats con Tipografía Óptica Apple */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Distancia</span>
                <span className="text-sm sm:text-base font-black text-[var(--text-primary)] font-mono data-tabular tracking-tight">{(selectedActivity.distance / 1000).toFixed(2)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">km</span>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Tiempo</span>
                <span className="text-sm sm:text-base font-black text-[var(--text-primary)] font-mono data-tabular tracking-tight">{Math.round(selectedActivity.elapsed_time / 60)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">min</span>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Cadencia</span>
                <span className="text-sm sm:text-base font-black text-amber-500 font-mono data-tabular tracking-tight">{selectedActivity.avg_cadence || 168}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">ppm</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[10px] text-rose-500 block">FC Media</span>
                <span className="text-sm sm:text-base font-black text-rose-500 font-mono data-tabular tracking-tight">{selectedActivity.avg_hr || 142}</span>
                <span className="text-[9px] text-rose-400 block">bpm</span>
              </div>
            </div>

            {/* Botón Publicar Check-in en tu Tribu desde Detalle */}
            <button
              onClick={() => handleOpenCheckIn(selectedActivity)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FC5200] via-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 apple-pressable active:scale-97"
            >
              <Sparkles className="w-4 h-4" />
              <span>Publicar Check-in en tu Tribu ⚡ (+100 XP)</span>
            </button>

            {/* Notas Biomecánicas (Contenedor con fondo completo sin desbordamiento) */}
            {selectedActivity.notes && (
              <div className="liquid-glass-card border border-[var(--glass-border)] rounded-2xl p-4 w-full break-words text-xs text-[var(--text-secondary)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FC5200] tracking-wider block">
                  Notas de la sesión & Biomecánica
                </span>
                <p className="leading-relaxed text-[var(--text-primary)] break-words">{selectedActivity.notes}</p>
              </div>
            )}

            {/* Parciales por Kilómetro (Splits Strava) */}
            {selectedActivity.splits && selectedActivity.splits.length > 0 && (
              <div className="p-4 rounded-3xl liquid-glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#FC5200]/15 flex items-center justify-center text-[#FC5200]">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Parciales por Kilómetro (Splits)
                      </h3>
                      <p className="text-[10px] text-[var(--text-secondary)]">Ritmo exacto detectado de Strava</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full liquid-glass-pill text-[#FC5200] font-bold">
                    {selectedActivity.splits.length} km
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedActivity.splits.map((split) => (
                    <div
                      key={split.km}
                      className="flex items-center justify-between p-2.5 rounded-2xl liquid-glass-pill text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-xl bg-[#FC5200]/15 text-[#FC5200] font-bold text-[11px] flex items-center justify-center font-mono">
                          {split.km}k
                        </span>
                        <span className="font-bold text-[var(--text-primary)] font-mono">{split.pace}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {split.avg_hr && (
                          <span className="text-[10px] font-mono text-rose-500 font-semibold">
                            {split.avg_hr} bpm
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Subir y Analizar Capturas de Strava con IA */}
      <StravaUploadModal
        isOpen={isStravaModalOpen}
        onClose={() => setIsStravaModalOpen(false)}
        onActivitySaved={(savedAct) => {
          setIsStravaModalOpen(false);
          if (savedAct) {
            setLocalActivities((prev) => [savedAct, ...prev]);

            // Auto-checkin inmediato en la Tribu activa
            try {
              let athlete = currentProfile;
              if (!athlete && typeof window !== 'undefined') {
                const stored = localStorage.getItem('ironman_athlete_profile');
                if (stored) athlete = JSON.parse(stored);
              }
              if (athlete?.id) {
                const distKm = parseFloat((savedAct.distance / 1000).toFixed(1));
                const durMin = Math.round((savedAct.elapsed_time || savedAct.moving_time || 0) / 60);
                fetch('/api/checkins', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-athlete-id': athlete.id,
                  },
                  body: JSON.stringify({
                    userId: athlete.id,
                    userProfile: athlete,
                    activityType: 'running',
                    title: savedAct.name || `Rodaje Strava (${distKm} km)`,
                    stravaActivityId: String(savedAct.id),
                    metrics: {
                      distance_km: distKm,
                      duration_min: durMin,
                      avg_hr: savedAct.avg_hr,
                      notes: savedAct.notes,
                    },
                  }),
                }).catch(() => {});
              }
            } catch (err) {
              console.warn('Aviso auto-checkin Strava:', err);
            }
          }
          if (onRefresh) onRefresh();
        }}
      />

      {/* Modal Simulador de Media Maratón 2027 */}
      {isSimulatorModalOpen && (
        <RaceSimulatorModal
          initialWeightKg={101}
          onClose={() => setIsSimulatorModalOpen(false)}
        />
      )}

      {/* Modal de Check-in en Tribu con datos de carrera precargados */}
      <DailyCheckInSheet
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInCreated={() => setIsCheckInOpen(false)}
        initialData={checkInInitialData}
        currentProfile={currentProfile}
      />

      {/* Toast Flotante de Confirmación Apple */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] py-3 px-5 rounded-full bg-emerald-600/95 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-apple-slide-down border border-emerald-400/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>¡Rodaje registrado con éxito!</span>
          <button
            onClick={() => {
              setShowSuccessToast(false);
              handleOpenCheckIn(localActivities[0]);
            }}
            className="ml-2 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-all"
          >
            Compartir en Tribu ⚡
          </button>
        </div>
      )}
    </div>
  );
};
