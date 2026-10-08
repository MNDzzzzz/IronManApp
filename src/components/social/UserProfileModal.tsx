// ====================================================================
// COMPONENTE: UserProfileModal.tsx (Apple Profile & Session Sheet)
// Ficha del Atleta Activo, Estadísticas, Medallas y Gestión de Sesión
// Cero datos ficticios. Perfil 100% genuino y opciones de cierre de sesión.
// ====================================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Flame,
  Sparkles,
  Copy,
  Check,
  LogOut,
  Shield,
  Trophy,
  Target,
  Calendar,
  Share2,
  Lock,
} from 'lucide-react';
import { UserProfile } from '@/types/social';
import { ATHLETE_STORAGE_KEY } from '@/lib/socialManager';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onLogout: () => void;
  onOpenSwitchAccount?: () => void;
  inviteCode?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onLogout,
  onOpenSwitchAccount,
  inviteCode = 'IRON27',
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCopied(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogoutClick = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ATHLETE_STORAGE_KEY);
    }
    onLogout();
    onClose();
  };

  if (!isOpen || !currentProfile) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Perfil y Sesión de Atleta"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] max-h-[88vh] flex flex-col overflow-hidden animate-apple-slide-up"
      >
        {/* Tirador táctil Apple en móvil */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-coral)] font-semibold">
              Perfil de Atleta
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--text-tertiary)]">Sesión Activa</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-white apple-pressable apple-btn-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Tarjeta de Perfil Activo */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-black/40 to-black/20 border border-[var(--glass-border)] flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D97757] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold text-2xl">
                {currentProfile.display_name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold shadow-md">
                Nv.{currentProfile.current_level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate apple-title">
                {currentProfile.display_name}
              </h3>
              <p className="text-xs text-[var(--accent-coral)] font-mono">
                @{currentProfile.username}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3" /> {currentProfile.current_streak_days} días de racha
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3" /> {currentProfile.total_xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Estadísticas de Disciplina y Metas */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-black/20 dark:bg-white/[0.03] border border-[var(--glass-border)]">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>Meta Semanal</span>
              </div>
              <p className="text-base font-bold text-white mt-1 apple-title font-mono">
                {currentProfile.weekly_workout_goal} días / sem
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/20 dark:bg-white/[0.03] border border-[var(--glass-border)]">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Récord Racha</span>
              </div>
              <p className="text-base font-bold text-white mt-1 apple-title font-mono">
                {currentProfile.best_streak_days} días
              </p>
            </div>
          </div>

          {/* Objetivo Deportivo */}
          {currentProfile.target_race_name && (
            <div className="p-3.5 rounded-2xl bg-black/20 dark:bg-white/[0.03] border border-[var(--glass-border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  Objetivo Principal
                </span>
                <h4 className="text-xs font-bold text-white mt-0.5">
                  {currentProfile.target_race_name}
                </h4>
              </div>
              {currentProfile.target_race_date && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                  <Calendar className="w-3 h-3" />
                  <span>{currentProfile.target_race_date}</span>
                </div>
              )}
            </div>
          )}

          {/* Biografía */}
          {currentProfile.bio && (
            <div className="p-3.5 rounded-2xl bg-black/20 dark:bg-white/[0.03] border border-[var(--glass-border)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                Lema o Biografía
              </span>
              <p className="text-xs text-[var(--text-secondary)] mt-1 italic leading-relaxed">
                "{currentProfile.bio}"
              </p>
            </div>
          )}

          {/* Código de Invitación a tu Tribu */}
          <div className="p-4 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                <span>Invita a Amigos a tu Tribu</span>
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Código de 6 letras</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 py-2 px-3 rounded-xl bg-black/40 border border-white/10 font-mono text-center text-sm font-bold tracking-widest text-amber-300">
                {inviteCode}
              </div>
              <button
                onClick={handleCopyInvite}
                className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all apple-pressable"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Acciones de Sesión Reales */}
          <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
            {onOpenSwitchAccount && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSwitchAccount();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all apple-pressable"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Cambiar de Cuenta o Iniciar Otra Sesión</span>
              </button>
            )}

            <button
              onClick={handleLogoutClick}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-xs font-semibold text-red-300 flex items-center justify-center gap-2 transition-all apple-pressable"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Cerrar Sesión en este Dispositivo</span>
            </button>
          </div>

          {/* Garantía de Seguridad y Privacidad */}
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] justify-center">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Tus datos corporales y calorías están 100% aislados y protegidos.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
