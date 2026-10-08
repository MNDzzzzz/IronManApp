'use client';

// ====================================================================
// COMPONENTE: CoachResponseModal (IronManApp)
// Modal / Bottom Sheet Liquid Glass para presentar la respuesta y
// desglose detallado del Head Coach tras interactuar por voz o texto.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React from 'react';
import {
  Sparkles,
  X,
  MessageSquare,
  CheckCircle2,
  Utensils,
  Droplet,
  Calendar,
  AlertTriangle,
  Flame,
  ChevronRight,
  Mic,
} from 'lucide-react';
import { CoachTurnResult } from '@/lib/coach/coachCore';

interface CoachResponseModalProps {
  isOpen: boolean;
  result: CoachTurnResult | null;
  userQuery?: string;
  onClose: () => void;
  onOpenFullChat?: () => void;
}

export const CoachResponseModal: React.FC<CoachResponseModalProps> = ({
  isOpen,
  result,
  userQuery,
  onClose,
  onOpenFullChat,
}) => {
  if (!isOpen || !result) return null;

  // Determinar icono y badge de la acción
  const getActionBadge = () => {
    switch (result.action) {
      case 'log_nutrition':
      case 'log_multiple_dishes':
        return {
          label: result.action === 'log_multiple_dishes' ? 'Comidas Registradas' : 'Comida Registrada',
          icon: <Utensils className="w-3.5 h-3.5 text-amber-500" />,
          colorClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        };
      case 'log_water':
        return {
          label: 'Hidratación Actualizada',
          icon: <Droplet className="w-3.5 h-3.5 text-sky-500" />,
          colorClass: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
        };
      case 'schedule_swap':
      case 'schedule_reassign':
        return {
          label: 'Planificación Ajustada',
          icon: <Calendar className="w-3.5 h-3.5 text-indigo-500" />,
          colorClass: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
        };
      case 'discomfort_report':
        return {
          label: 'Adaptación Biomecánica',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
          colorClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
      case 'audio_unclear':
        return {
          label: 'Audio no inteligible',
          icon: <Mic className="w-3.5 h-3.5 text-zinc-400" />,
          colorClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
        };
      default:
        return {
          label: 'Respuesta del Coach',
          icon: <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />,
          colorClass: 'bg-[#D97757]/15 text-[#D97757] border-[#D97757]/30',
        };
    }
  };

  const badge = getActionBadge();
  const transcriptionText = result.transcription || userQuery;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg liquid-glass-card bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-response-title"
      >
        {/* Cabecera con Badge y Botón Cerrar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${badge.colorClass}`}
            >
              {badge.icon}
              {badge.label}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lo que escuchó / Transcripción del usuario */}
        {transcriptionText && transcriptionText.trim() && (
          <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5 text-[var(--text-secondary)]">
              <Mic className="w-3.5 h-3.5 text-[#D97757]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
                Tú dijiste:
              </span>
              <p className="text-xs text-[var(--text-primary)] italic font-medium leading-relaxed mt-0.5">
                &ldquo;{transcriptionText}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Mensaje Editorial del Head Coach */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#D97757]/20 flex items-center justify-center text-[#D97757]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 id="coach-response-title" className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Head Coach
            </h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">
            {result.replyText}
          </div>
        </div>

        {/* Desglose de Nutrición / Macros si aplica */}
        {result.breakdownText && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider">
              Desglose Nutricional
            </span>
            <p className="text-xs font-mono text-[var(--text-primary)] font-medium">
              {result.breakdownText}
            </p>
          </div>
        )}

        {/* Consejo Técnico Clave */}
        {result.coachTip && (
          <div className="p-2.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] leading-snug">
              💡 <span className="font-semibold text-[var(--text-primary)]">Consejo:</span> {result.coachTip}
            </span>
          </div>
        )}

        {/* Botones de Acción al Pie */}
        <div className="flex items-center gap-2.5 pt-2">
          {onOpenFullChat && (
            <button
              onClick={() => {
                onClose();
                onOpenFullChat();
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ver en el chat</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#D97757] hover:bg-[#c66849] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#D97757]/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Entendido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
