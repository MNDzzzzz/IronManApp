// ====================================================================
// COMPONENTE: MemberProfileSheet.tsx (Apple Bottom Sheet)
// Muestra el perfil público condensado y no-intrusivo de un compañero
// ====================================================================

'use client';

import React, { useEffect } from 'react';
import { X, Flame, Award, Dumbbell, Route, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { MemberPublicSummary } from '@/types/social';

interface MemberProfileSheetProps {
  member: MemberPublicSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberProfileSheet: React.FC<MemberProfileSheetProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !member) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${member.display_name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] max-h-[85vh] flex flex-col overflow-hidden animate-apple-slide-up"
      >
        {/* Tirador táctil Apple en móvil */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Cabecera con botón de cierre */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent-coral)] font-semibold">
              Perfil de Tribu
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--text-tertiary)]">Privacidad Protegida</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar perfil"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-white apple-pressable apple-btn-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Tarjeta de Identidad Atlética */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {member.display_name.charAt(0)}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold shadow-md">
                Nv.{member.current_level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-[var(--text-primary)] truncate apple-title">
                  {member.display_name}
                </h3>
              </div>
              <p className="text-xs text-[var(--accent-coral)] font-mono">
                @{member.username}
              </p>
              {member.bio && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                  {member.bio}
                </p>
              )}
            </div>
          </div>

          {/* Bento Grid de Disciplina (3 KPIs no-intrusivos) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Racha */}
            <div className="p-3 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
              <Flame className="w-4 h-4 text-orange-400 mb-1" />
              <span className="text-lg font-bold text-white tabular-nums apple-display">
                {member.current_streak_days}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">
                Días Racha
              </span>
            </div>

            {/* Adherencia */}
            <div className="p-3 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-lg font-bold text-white tabular-nums apple-display">
                {member.weekly_adherence_pct}%
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">
                Adherencia
              </span>
            </div>

            {/* XP Acumulado */}
            <div className="p-3 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
              <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-lg font-bold text-white tabular-nums apple-display">
                {member.total_xp}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">
                XP Total
              </span>
            </div>
          </div>

          {/* Volumen Deportivo de la Semana */}
          <div className="p-3.5 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)]">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2.5 flex items-center justify-between">
              <span>Volumen Semanal Acumulado</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">Últimos 7 días</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Route className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tabular-nums">
                    {member.weekly_km_total} km
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">Carrera y Cardio</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tabular-nums">
                    {member.weekly_strength_sets} series
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">Fuerza en Sala</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vitrina de Medallas */}
          {member.badges && member.badges.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Vitrina de Medallas ({member.badges_count})</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {member.badges.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                      🏅
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-white truncate">{b.title}</div>
                      <div className="text-[9px] text-[var(--text-tertiary)] truncate">
                        {b.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial Reciente de Check-ins (Últimos 5) */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
              Actividad Reciente en la Tribu
            </h4>
            <div className="space-y-2">
              {member.recent_checkins.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">
                      {c.activity_type === 'running' ? '🏃' : '🏋️'}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">{c.title}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{c.date}</div>
                    </div>
                  </div>
                  {c.is_gold_checkin && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                      <span>👑</span> Oro
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Nota de Privacidad Apple */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              Tus datos de peso, calorías y parámetros de salud permanecen 100% privados y encriptados en tu dispositivo.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
