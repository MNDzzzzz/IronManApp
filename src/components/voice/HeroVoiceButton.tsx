'use client';

import React from 'react';
import { CoachCommandBar } from '@/components/voice/CoachCommandBar';
import { CoachTurnResult } from '@/lib/coach/coachCore';

export interface HeroVoiceButtonProps {
  onSuccessResult?: (result: CoachTurnResult) => void;
  onStatusChange?: (statusText: string) => void;
}

/**
 * HeroVoiceButton (Compatibilidad y Fachada)
 * Redirige a la moderna CoachCommandBar (Anthropic Claude x Apple Spotlight)
 * eliminando el botón circular de 80px en favor de una barra de comandos flotante multimodal.
 */
export const HeroVoiceButton: React.FC<HeroVoiceButtonProps> = (props) => {
  return <CoachCommandBar {...props} />;
};
