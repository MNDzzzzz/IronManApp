// ====================================================================
// COMPONENTE: DailyCheckInSheet.tsx (Apple Bottom Sheet)
// Formulario y selector fluido para publicar el check-in de entreno
// con soporte para foto de máquina opcional (Check-in de Oro +50 XP)
// ====================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { X, Camera, Sparkles, CheckCircle2, Flame, Dumbbell, Route, ShieldAlert, Loader2 } from 'lucide-react';
import { CheckInActivityType, WorkoutCheckIn, UserProfile } from '@/types/social';

export interface DailyCheckInInitialData {
  activityType?: CheckInActivityType;
  title?: string;
  metricsNote?: string;
  volume_sets?: number;
  distance_km?: number;
  duration_min?: number | null;
  avg_hr?: number | null;
  badge_label?: string;
}

interface DailyCheckInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInCreated: (checkin: WorkoutCheckIn) => void;
  initialData?: DailyCheckInInitialData | null;
  currentProfile?: UserProfile | null;
}

export const DailyCheckInSheet: React.FC<DailyCheckInSheetProps> = ({
  isOpen,
  onClose,
  onCheckInCreated,
  initialData,
  currentProfile,
}) => {
  const [activityType, setActivityType] = useState<CheckInActivityType>('strength');
  const [title, setTitle] = useState('');
  const [metricsNote, setMetricsNote] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);
  const [photoVerificationResult, setPhotoVerificationResult] = useState<{
    isVerified: boolean;
    equipmentName?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialData) {
        if (initialData.activityType) setActivityType(initialData.activityType);
        if (initialData.title) setTitle(initialData.title);
        if (initialData.metricsNote) setMetricsNote(initialData.metricsNote);
      } else if (!title) {
        // Sugerencia de título inicial según tipo
        setTitle(
          activityType === 'strength'
            ? 'Entreno de Fuerza en Sala'
            : activityType === 'running'
            ? 'Rodaje Aeróbico Z2'
            : 'Sesión Híbrida'
        );
      }
    } else {
      document.body.style.overflow = '';
      setPhotoBase64(null);
      setPhotoVerificationResult(null);
      setErrorMsg('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialData, activityType]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const cleanBase64 = base64.split(',')[1] || base64;
      setPhotoBase64(base64);
      setIsVerifyingPhoto(true);
      setErrorMsg('');

      try {
        const res = await fetch('/api/checkins/verify-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: cleanBase64,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setPhotoVerificationResult({
            isVerified: json.data.is_gym_equipment,
            equipmentName: json.data.detected_equipment,
          });
        }
      } catch (err: unknown) {
        console.error('Error al verificar foto:', err);
      } finally {
        setIsVerifyingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Introduce un título para tu entreno');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const isGold = Boolean(photoBase64 && photoVerificationResult?.isVerified);

      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentProfile?.id,
          activityType,
          title: title.trim(),
          metrics: {
            notes: metricsNote.trim() || undefined,
            volume_sets: activityType === 'strength' ? initialData?.volume_sets : undefined,
            distance_km: activityType === 'running' ? initialData?.distance_km : undefined,
            duration_min: initialData?.duration_min,
            avg_hr: initialData?.avg_hr,
          },
          hasPhoto: Boolean(photoBase64),
          photoUrl: photoBase64 || undefined,
          isGoldCheckin: isGold,
          geminiDetectedEquipment: photoVerificationResult?.equipmentName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al guardar check-in');
      }

      onCheckInCreated(json.data);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar Check-in de Hoy"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] max-h-[88vh] flex flex-col overflow-hidden animate-apple-slide-up"
      >
        {/* Tirador táctil en móvil */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white apple-title">Check-in de Hoy</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
              🔥 Racha Activa
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-white apple-pressable apple-btn-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {initialData && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{initialData.badge_label || 'Datos reales de tu sesión completada precargados automáticamente.'}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de Tipo de Actividad (Apple Segmented Control) */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Tipo de Entrenamiento
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/30 dark:bg-white/[0.04] border border-[var(--glass-border)]">
              <button
                type="button"
                onClick={() => {
                  setActivityType('strength');
                  setTitle('Entreno de Fuerza en Sala');
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
                  activityType === 'strength'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Fuerza</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivityType('running');
                  setTitle('Rodaje de Carrera Z2');
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
                  activityType === 'running'
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Carrera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivityType('hybrid');
                  setTitle('Sesión Híbrida 21K');
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
                  activityType === 'hybrid'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Híbrido</span>
              </button>
            </div>
          </div>

          {/* Título de la sesión */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
              Título del Entreno
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Día 1 Torso (16 series) o Rodaje 8K Z2"
              className="w-full px-4 py-2.5 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]"
            />
          </div>

          {/* Notas o sensaciones */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
              Notas para tu Tribu (Opcional)
            </label>
            <textarea
              rows={2}
              value={metricsNote}
              onChange={(e) => setMetricsNote(e.target.value)}
              placeholder="Sensaciones, ritmo medio, RPE o cargas..."
              className="w-full px-4 py-2.5 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)] resize-none"
            />
          </div>

          {/* Sección Opcional: Foto de Máquina / Proof of Workout */}
          <div className="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  Check-in de Oro (Proof of Workout)
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/20">
                +50 XP Bonus
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
              Haz una foto a una máquina que hayas usado hoy en el gimnasio. Nuestra IA (Gemini) confirmará el equipo para otorgarte la insignia dorada en el feed.
            </p>

            {photoBase64 ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden max-h-48 border border-white/10">
                  <img
                    src={photoBase64}
                    alt="Previsualización máquina"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBase64(null);
                      setPhotoVerificationResult(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                {isVerifyingPhoto ? (
                  <div className="flex items-center gap-2 text-xs text-amber-300 p-2 rounded-xl bg-amber-500/10">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini Vision analizando la máquina...</span>
                  </div>
                ) : photoVerificationResult?.isVerified ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Máquina confirmada: <strong>{photoVerificationResult.equipmentName}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-200/80 p-2 rounded-xl bg-amber-500/10">
                    Foto adjuntada (se registrará con tu check-in)
                  </div>
                )}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-amber-400/40 hover:bg-amber-500/10 cursor-pointer text-amber-300 text-xs font-semibold transition-all apple-pressable">
                <Camera className="w-4 h-4" />
                <span>Capturar o Subir Foto de Máquina</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </label>
            )}
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 apple-pressable apple-btn-spring disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando en tu Tribu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirmar Check-in ({photoBase64 && photoVerificationResult?.isVerified ? '+150 XP' : '+100 XP'})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
