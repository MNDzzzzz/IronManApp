// ====================================================================
// COMPONENTE: EmptySquadView.tsx (Módulo Social de Tribu - Apple Design)
// Estado vacío premium para atletas sin grupo, con modales fluidos
// para [Crear Tribu] (selector de emoji) y [Unirme con Código] (PIN 6 letras)
// Estética: Apple visionOS / iOS 18+ Liquid Glass, resortes y active:scale-97
// Idioma: Español (Strict TypeScript & Clean Architecture)
// ====================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Shield,
  Sparkles,
  Plus,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Flame,
  Trophy,
  ArrowRight,
  Smile,
  Hash,
} from 'lucide-react';
import { SquadGroup, UserProfile } from '@/types/social';
import { SQUAD_STORAGE_KEY } from '@/lib/socialManager';
import { apiFetch, getActiveAthleteId } from '@/lib/api/apiClient';

interface EmptySquadViewProps {
  currentProfile: UserProfile;
  onGroupJoined?: (group: SquadGroup) => void;
  onGroupCreatedOrJoined?: (group: SquadGroup) => void;
}

const TRIBE_EMOJIS = ['⚡', '🔥', '👑', '🐺', '🦁', '🛡️', '🦅', '🏆', '🚀', '🦾', '⛰️', '⚔️'];

export const EmptySquadView: React.FC<EmptySquadViewProps> = ({
  currentProfile,
  onGroupJoined,
  onGroupCreatedOrJoined,
}) => {
  const notifyGroupJoined = (group: SquadGroup) => {
    if (onGroupCreatedOrJoined) onGroupCreatedOrJoined(group);
    if (onGroupJoined) onGroupJoined(group);
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Estados para Crear Tribu
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚡');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Estados para Unirme con Código (PIN de 6 caracteres)
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Bloquear scroll al abrir modales
  useEffect(() => {
    if (isCreateModalOpen || isJoinModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCreateError('');
      setJoinError('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCreateModalOpen, isJoinModalOpen]);

  // Manejar cambio en casilla de PIN de 6 letras
  const handlePinChange = (index: number, value: string) => {
    const cleanChar = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newDigits = [...pinDigits];
    newDigits[index] = cleanChar;
    setPinDigits(newDigits);
    setJoinError('');

    // Avanzar foco a la siguiente casilla si se introdujo un caracter
    if (cleanChar && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pastedText) return;

    const newDigits = [...pinDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedText[i] || '';
    }
    setPinDigits(newDigits);
    setJoinError('');

    const nextIndex = Math.min(pastedText.length, 5);
    pinInputRefs.current[nextIndex]?.focus();
  };

  const currentPinCode = pinDigits.join('');

  // Enviar Creación de Tribu
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Introduce un nombre para la tribu');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const effectiveId = currentProfile?.id || getActiveAthleteId() || '';

      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-athlete-id': effectiveId,
        },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || undefined,
          avatarEmoji: selectedEmoji,
          userId: effectiveId,
          userProfile: currentProfile,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al fundar la tribu');
      }

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(SQUAD_STORAGE_KEY);
          const existing = cached ? JSON.parse(cached) : [];
          const updated = [json.data, ...existing.filter((g: any) => g.id !== json.data.id)];
          localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }

      setIsCreateModalOpen(false);
      notifyGroupJoined(json.data);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear la tribu');
    } finally {
      setIsCreating(false);
    }
  };

  // Enviar Unirse a Tribu con PIN de 6 letras
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinCode.length < 6) {
      setJoinError('Introduce el código completo de 6 caracteres');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const effectiveId = currentProfile?.id || getActiveAthleteId() || '';

      const res = await apiFetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-athlete-id': effectiveId,
        },
        body: JSON.stringify({
          code: currentPinCode,
          userId: effectiveId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Código de invitación no válido o tribu llena');
      }

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(SQUAD_STORAGE_KEY);
          const existing = cached ? JSON.parse(cached) : [];
          const updated = [json.data, ...existing.filter((g: any) => g.id !== json.data.id)];
          localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }

      setIsJoinModalOpen(false);
      notifyGroupJoined(json.data);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Error al unirse a la tribu');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 sm:py-12 px-4 animate-apple-fade-in">
      {/* 1. Tarjeta Hero Estado Vacío (Liquid Glass) */}
      <div className="liquid-glass-card rounded-[32px] p-6 sm:p-10 border border-[var(--glass-border)] shadow-2xl relative overflow-hidden text-center">
        {/* Aura de fondo sutil */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Glifo Hero Flotante */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#D97757]/20 via-amber-500/20 to-[#FC5200]/20 border border-white/20 shadow-xl mb-6 apple-interactive-card">
          <Users className="w-10 h-10 text-[#D97757]" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Título y Subtítulo Apple Optical */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] apple-display tracking-tight mb-3">
          Tu Tribu de Rendimiento
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-8">
          Entrenar en solitario te hace fuerte, pero una tribu te lleva al día de la carrera.
          Comparte tus check-ins de gimnasio y rodaje, compite sanamente y nunca rompas la racha.
        </p>

        {/* Bento de Beneficios Apple Design */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-8">
          <div className="p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border border-[var(--glass-border)] flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">Check-in de Oro</h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                Verifica tus fotos de máquina con IA para ganar +50 XP adicionales.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border border-[var(--glass-border)] flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">Leaderboard Semanal</h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                Podio semanal basado en constancia, rachas y volumen de entrenamiento.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border border-[var(--glass-border)] flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 mb-2">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">Máximo 15 Atletas</h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                Grupos cerrados, privados y sin ruido para asegurar verdadero compromiso.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción Primarios */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D97757] via-amber-500 to-[#FC5200] text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 apple-pressable active:scale-97"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Tribu</span>
          </button>

          <button
            onClick={() => {
              setPinDigits(['', '', '', '', '', '']);
              setIsJoinModalOpen(true);
            }}
            className="w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 apple-pressable active:scale-97 backdrop-blur-md"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Unirme con Código</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL 1: CREAR TRIBU (Apple Bottom Sheet & Emoji Picker) */}
      {/* ================================================================ */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crear Nueva Tribu"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-apple-slide-up"
          >
            {/* Tirador táctil en móvil */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[var(--glass-border)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-coral)] font-bold">
                  Fundar Tribu
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-[var(--text-tertiary)]">Privada (máx 15)</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario con padding inferior seguro */}
            <form onSubmit={handleCreateSubmit} className="p-5 pb-12 sm:pb-8 overflow-y-auto space-y-4">
              {createError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Selector de Emoji de Tribu */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Emblema de la Tribu
                </label>
                <div className="grid grid-cols-6 gap-2 p-2.5 rounded-2xl bg-black/30 dark:bg-white/[0.03] border border-[var(--glass-border)]">
                  {TRIBE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-11 rounded-xl text-xl flex items-center justify-center transition-transform apple-pressable active:scale-97 ${
                        selectedEmoji === emoji
                          ? 'bg-amber-500/20 border-2 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                          : 'bg-white/5 border border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre de la Tribu */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Nombre de la Tribu
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="ej: Tribu 21K 2027 o Los Sub-2h"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[#D97757] transition-all"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Lema o Descripción (opcional)
                </label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="ej: Preparación estricta para Media Maratón y fuerza hipertrofia."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[#D97757] transition-all resize-none"
                />
              </div>

              {/* Botón Fundar Tribu */}
              <button
                type="submit"
                disabled={!createName.trim() || isCreating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D97757] via-amber-500 to-[#FC5200] text-white font-bold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-40 transition-all flex items-center justify-center gap-2 apple-pressable active:scale-97 mt-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando código y fundando tribu...</span>
                  </>
                ) : (
                  <>
                    <span>Fundar Tribu ({selectedEmoji})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL 2: UNIRME CON CÓDIGO (PIN de 6 letras estilo iOS) */}
      {/* ================================================================ */}
      {isJoinModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unirme a una Tribu con Código"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-apple-slide-up"
          >
            {/* Tirador táctil en móvil */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[var(--glass-border)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-500 dark:text-amber-400 font-bold">
                  Código de Invitación
                </span>
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                <span className="text-[10px] text-[var(--text-tertiary)]">6 Caracteres</span>
              </div>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario de PIN con padding inferior seguro */}
            <form onSubmit={handleJoinSubmit} className="p-5 pb-12 sm:pb-8 overflow-y-auto space-y-5 text-center">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] apple-title mb-1">
                  Introduce el Código de tu Tribu
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pídele el código de 6 letras (ej: <span className="font-mono text-amber-500 dark:text-amber-300 font-bold">IRON27</span>) al creador del grupo.
                </p>
              </div>

              {joinError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-500 dark:text-rose-300 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              {/* Casillas PIN de 6 caracteres estilo Apple iOS */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePinPaste : undefined}
                    autoFocus={idx === 0}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono uppercase rounded-2xl bg-black/5 dark:bg-black/40 border-2 border-black/15 dark:border-white/15 focus:border-amber-500 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-white/10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Botón Unirse a la Tribu */}
              <button
                type="submit"
                disabled={currentPinCode.length < 6 || isJoining}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-[#D97757] text-white font-bold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-40 transition-all flex items-center justify-center gap-2 apple-pressable active:scale-97"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando código de tribu...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Unirme a la Tribu</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
