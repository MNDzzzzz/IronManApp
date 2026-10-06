'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Bot } from 'lucide-react';

interface DynamicIslandCoachProps {
  message: string;
  subtext?: string;
  statusType?: 'info' | 'success' | 'warning';
}

export const DynamicIslandCoach: React.FC<DynamicIslandCoachProps> = ({
  message,
  subtext = 'Head Coach Multimodal',
  statusType = 'info',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      role="status"
      aria-live="polite"
      className="w-full max-w-md mx-auto my-2 px-1"
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full cursor-pointer liquid-glass-pill px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-300 hover:border-[#D97757]/40 active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
          <div className="p-1.5 rounded-full bg-[#D97757]/15 text-[#D97757] dark:text-[#E28464] shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {message}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
              {subtext}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Contraer aviso del Coach' : 'Expandir aviso del Coach'}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0 p-1"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Contenido expandido suavemente */}
      {isExpanded && (
        <div className="mt-2 p-4 rounded-2xl liquid-glass-card text-xs text-[var(--text-secondary)] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-xs">
            <Bot className="w-4 h-4 text-[#D97757]" />
            <span>Indicación Completa del Coach</span>
          </div>
          <p className="leading-relaxed text-[var(--text-primary)]">
            {message}
          </p>
          <div className="pt-2 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Objetivo: Media Maratón (28-Feb-2027)</span>
            <span>Blindaje Articular Z2</span>
          </div>
        </div>
      )}
    </section>
  );
};
