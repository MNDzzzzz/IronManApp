'use client';

// ====================================================================
// MODAL DE IMPORTACIÓN DIRECTA DE STRAVA: StravaUploadModal
// Permite al atleta subir capturas de Strava/Garmin directamente
// desde la interfaz web sin depender de Telegram.
// Diseño: Liquid Glass Dual Mode (iOS Minimalist)
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, CheckCircle2, AlertCircle, Loader2, Sparkles, Activity } from 'lucide-react';
import { CardioActivity } from '@/types/database';

interface StravaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySaved?: (activity: CardioActivity) => void;
}

interface StravaUploadResult {
  success: boolean;
  activity: CardioActivity;
  analysis?: {
    paceStr?: string;
    coachAssessment?: string;
    splits?: Array<{ km: number; pace: string; elevation_diff_m?: number }>;
  };
}

export const StravaUploadModal: React.FC<StravaUploadModalProps> = ({
  isOpen,
  onClose,
  onActivitySaved,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StravaUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bloqueo de scroll de fondo con experiencia fluida Apple Bottom Sheet
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remover prefijo data:image/xxx;base64,
      const cleanBase64 = base64String.split(',')[1] || base64String;
      setSelectedImage(cleanBase64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/activities/strava-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo procesar la captura de Strava');
      }

      setResult(data);
      if (onActivitySaved && data.activity) {
        onActivitySaved(data.activity);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión analizando la captura';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl liquid-glass-card border border-[var(--glass-border)] shadow-2xl p-6 pb-12 sm:pb-8 max-h-[85vh] overflow-y-auto flex flex-col animate-apple-scale-in">
        {/* Tirador táctil Apple para Bottom Sheet en móvil */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl liquid-glass-pill text-amber-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)] apple-title">
                Importar Carrera de Strava
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Extracción con IA de parciales, cadencia y cuidado articular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors apple-pressable"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <>
              {/* Zona de subida */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="strava-file-input"
              />

              {!selectedImage ? (
                <label
                  htmlFor="strava-file-input"
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--glass-border)] rounded-3xl cursor-pointer hover:border-amber-500/50 transition-all group liquid-glass-card"
                >
                  <div className="p-4 rounded-full liquid-glass-pill text-amber-500 group-hover:scale-110 transition-transform mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] text-center">
                    Selecciona una captura de Strava o Garmin
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] mt-1 text-center">
                    Formatos JPG, PNG o WebP de hasta 10MB
                  </span>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-500">
                    <Camera className="w-4 h-4" />
                    <span>Hacer foto o abrir galería</span>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] max-h-56 flex items-center justify-center bg-black/20">
                    <img
                      src={`data:${mimeType};base64,${selectedImage}`}
                      alt="Captura Strava"
                      className="object-contain max-h-56 w-full"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Cambiar imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleUploadAndAnalyze}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-[#D97757] text-white font-semibold text-sm shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analizando parciales y biometría con Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analizar y Guardar Sesión de Carrera</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Vista de Éxito y Resumen Biomecánico */
            <div className="space-y-4 animate-scale-up">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Sesión registrada con éxito</h4>
                  <p className="text-xs opacity-90">
                    {result.activity.name} • {result.activity.distance ? (result.activity.distance / 1000).toFixed(2) : 0} km
                  </p>
                </div>
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Ritmo</span>
                  <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {result.analysis?.paceStr || '--'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Pulso Med</span>
                  <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {result.activity.avg_hr ? `${result.activity.avg_hr} ppm` : '--'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl liquid-glass-pill text-center">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Cadencia</span>
                  <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {result.activity.avg_cadence ? `${result.activity.avg_cadence} ppm` : '--'}
                  </span>
                </div>
              </div>

              {/* Valoración del Coach para la rodilla */}
              {result.analysis?.coachAssessment && (
                <div className="p-4 rounded-2xl liquid-glass-card border border-[var(--glass-border)] w-full break-words">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Prescripción Biomecánica (Rodilla Álvaro)</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
                    {result.analysis.coachAssessment}
                  </p>
                </div>
              )}

              {/* Desglose de parciales (splits) si los hay */}
              {Array.isArray(result.analysis?.splits) && result.analysis.splits.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase font-mono px-1">
                    Parciales km a km
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {result.analysis.splits.map((s, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl liquid-glass-pill text-xs font-mono"
                      >
                        <span className="text-[var(--text-secondary)]">Km {s.km || idx + 1}</span>
                        <span className="font-bold text-[var(--text-primary)]">{s.pace || '--'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl liquid-glass-pill border border-[var(--glass-border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cerrar y Ver en Entrenamientos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
