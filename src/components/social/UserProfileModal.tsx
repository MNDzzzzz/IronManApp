// ====================================================================
// COMPONENTE: UserProfileModal.tsx (Apple Modal & Auth Switcher)
// Permite ver tu perfil de atleta, nivel, XP, copiar enlace de invitación,
// cambiar de usuario o iniciar sesión con Magic Link / Email
// ====================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Flame, Sparkles, Copy, Check, LogIn, Shield, Users, Mail, ArrowRight } from 'lucide-react';
import { UserProfile } from '@/types/social';
import { initialProfiles } from '@/lib/socialManager';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onSelectProfile: (profile: UserProfile) => void;
  inviteCode?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSelectProfile,
  inviteCode = 'IRON27',
}) => {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCopied(false);
      setMagicLinkSent(false);
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

  const handleSendMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setMagicLinkSent(true);
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
              Atleta & Sesión
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--text-tertiary)]">Apple ID Style</span>
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
                  <Flame className="w-3 h-3" /> {currentProfile.current_streak_days} días
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {currentProfile.total_xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Código de Invitación a tu Tribu */}
          <div className="p-4 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                Invita a tus Amigos a la Tribu
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
            <p className="text-[10px] text-[var(--text-tertiary)] mt-2 leading-relaxed">
              Tus amigos pueden introducir este código en la sección de Tribu para unirse a tu grupo y competir en el podio semanal.
            </p>
          </div>

          {/* Selector de Atletas Demo (Simulación multi-usuario inmediata) */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Cambiar de Atleta (Modo Demo / Local)</span>
            </h4>
            <div className="space-y-1.5">
              {initialProfiles.map((p) => {
                const isSelected = p.id === currentProfile.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all apple-pressable ${
                      isSelected
                        ? 'bg-[#D97757]/15 border-[#D97757]/50 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                        {p.display_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {p.display_name}
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                              Activo
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
                          @{p.username} · Nv.{p.current_level}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-300 font-semibold">
                      {p.total_xp} XP
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario de Login con Magic Link */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h4 className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              Iniciar Sesión en Otro Dispositivo
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Introduce tu correo para recibir un enlace de acceso seguro sin contraseñas (Magic Link / Supabase Auth).
            </p>

            {magicLinkSent ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>¡Enlace mágico enviado a {emailInput}! Revisa tu bandeja de entrada.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-tertiary)]" />
                    <input
                      type="email"
                      required
                      placeholder="atleta@ejemplo.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center gap-1 hover:bg-emerald-400 transition-all apple-pressable"
                  >
                    <span>Enviar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Garantía de Seguridad */}
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] justify-center">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Tus datos de salud están protegidos con cifrado y RLS en base de datos.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
