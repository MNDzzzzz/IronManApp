'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Send, Sparkles, CheckCircle2, AlertCircle, CornerDownLeft } from 'lucide-react';
import { CoachTurnResult } from '@/lib/coach/coachCore';

interface CoachCommandBarProps {
  onSuccessResult?: (result: CoachTurnResult) => void;
  onStatusChange?: (statusText: string) => void;
  placeholder?: string;
}

/**
 * Componente CoachCommandBar
 * Inspirado en la interfaz de comandos de Anthropic Claude y el Spotlight de Apple.
 * Sustituye el botón circular gigante de 80px por una cápsula flotante horizontal
 * multimodal (texto inmediato + voz háptica reactiva) de alta precisión.
 */
export const CoachCommandBar: React.FC<CoachCommandBarProps> = ({
  onSuccessResult,
  onStatusChange,
  placeholder = 'Registra comidas, consulta tu plan o habla con el Coach...',
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Limpiar temporizador de feedback
  useEffect(() => {
    if (feedbackState !== 'idle') {
      const timer = setTimeout(() => setFeedbackState('idle'), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackState]);

  // Iniciar grabación de audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleSendAudio(audioBlob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (onStatusChange) onStatusChange('Escuchando... Di lo que has comido o tu entreno');
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      if (onStatusChange) onStatusChange('Micrófono no disponible. Escribe tu mensaje en la barra.');
    }
  };

  // Detener grabación de audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Enviar audio codificado en Base64 al Coach
  const handleSendAudio = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    if (onStatusChange) onStatusChange('Procesando nota de voz con el Head Coach...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string)?.split(',')[1];
        if (!base64data) throw new Error('No se pudo codificar el audio');

        const res = await fetch('/api/coach/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64data,
            mimeType,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setFeedbackState('success');
          if (onStatusChange) onStatusChange(data.replyText || data.reply || 'Datos procesados y aplicados.');
          if (onSuccessResult) onSuccessResult(data);
        } else {
          setFeedbackState('error');
          if (onStatusChange) onStatusChange(data.error || 'No se pudo interpretar el audio.');
        }
        setIsProcessing(false);
      };
    } catch (err) {
      console.error('Error enviando audio:', err);
      setIsProcessing(false);
      setFeedbackState('error');
      if (onStatusChange) onStatusChange('Error de red al procesar el audio.');
    }
  };

  // Enviar mensaje de texto
  const handleSendText = async (customText?: string) => {
    const textToSend = customText || inputText.trim();
    if (!textToSend || isProcessing) return;

    setIsProcessing(true);
    if (onStatusChange) onStatusChange('Consultando al Head Coach...');

    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });

      const data = await res.json();
      if (data.success) {
        setInputText('');
        setFeedbackState('success');
        if (onStatusChange) onStatusChange(data.replyText || data.reply || 'Cambios aplicados con éxito.');
        if (onSuccessResult) onSuccessResult(data);
      } else {
        setFeedbackState('error');
        if (onStatusChange) onStatusChange(data.error || 'Error procesando tu mensaje.');
      }
    } catch (err) {
      setFeedbackState('error');
      if (onStatusChange) onStatusChange('Error de conexión con el Coach.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Barra de Comandos Principal estilo Spotlight / Siri de Apple */}
      <div
        className={`relative w-full rounded-2xl backdrop-blur-2xl backdrop-saturate-150 p-2 sm:p-2.5 flex items-center gap-2.5 transition-all duration-300 ${
          isRecording
            ? 'bg-white/80 dark:bg-[#111520]/90 border border-purple-500/40 shadow-[0_0_30px_rgba(217,119,87,0.3),inset_0_1px_1px_rgba(255,255,255,0.7)] ring-2 ring-[#D97757]/30'
            : 'bg-white/70 dark:bg-[#111520]/80 border border-white/40 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.15)]'
        }`}
      >
        {/* Botón de Voz Izquierdo Háptico estilo Apple Action / Siri */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          aria-label={isRecording ? 'Detener grabación de voz' : 'Grabar mensaje de voz'}
          className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 shadow-sm ${
            isRecording
              ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
              : feedbackState === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : feedbackState === 'error'
              ? 'bg-amber-600 text-white shadow-amber-600/30'
              : 'bg-white/60 dark:bg-white/[0.08] text-[#D97757] dark:text-[#E28464] border border-white/60 dark:border-white/10 hover:bg-[#D97757]/15 hover:text-[#D97757]'
          }`}
          title={isRecording ? 'Detener grabación' : 'Hablar por micrófono con el Coach'}
        >
          {isRecording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#D97757] dark:text-[#E28464]" />
          ) : feedbackState === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : feedbackState === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Input de Texto Central O Visualizador de Onda Sonora Interactiva estilo Siri */}
        {isRecording ? (
          <div
            onClick={stopRecording}
            className="flex-1 flex items-center justify-between px-2 sm:px-3 py-1 cursor-pointer select-none group"
            title="Toca para finalizar y procesar audio"
          >
            {/* Visualizador de Onda Sonora Espectral Siri */}
            <div className="flex items-center gap-1 sm:gap-1.5 h-6">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#D97757] to-rose-500 animate-apple-wave-1" />
              <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500 animate-apple-wave-2" />
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 animate-apple-wave-3" />
              <span className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600 animate-apple-wave-4" />
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-[#D97757] animate-apple-wave-5" />
              <span className="w-1 h-3 rounded-full bg-gradient-to-b from-purple-400 to-rose-500 animate-apple-wave-2 hidden sm:block" />
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 animate-apple-wave-3 hidden sm:block" />
            </div>

            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-rose-500 transition-colors flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                Escuchando...
              </span>
              <span className="text-[9.5px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
                Toca para enviar
              </span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex-1 flex items-center gap-2 min-w-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={placeholder}
              disabled={isProcessing}
              className="w-full bg-transparent px-2 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="shrink-0 p-2 sm:p-2.5 rounded-xl bg-[#D97757] text-white disabled:opacity-20 hover:opacity-90 transition-all active:scale-90 flex items-center justify-center shadow-sm"
              aria-label="Enviar al Coach"
              title="Enviar (Enter)"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CornerDownLeft className="w-4 h-4" />
              )}
            </button>
          </form>
        )}
      </div>

      {/* Micro-Sugerencias de Entrada Rápida (Pills de Cristal Líquido estilo Apple) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] shrink-0 flex items-center gap-1 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#D97757] dark:text-[#E28464]" />
          Atajos:
        </span>
        <button
          type="button"
          onClick={() => handleSendText('Añadir 250ml de agua')}
          className="shrink-0 text-[10.5px] px-3 py-1 rounded-full bg-white/50 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-sky-500/40 shadow-sm transition-all active:scale-95"
        >
          💧 +250ml agua
        </button>
        <button
          type="button"
          onClick={() => handleSendText('¿Qué toca entrenar hoy?')}
          className="shrink-0 text-[10.5px] px-3 py-1 rounded-full bg-white/50 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#D97757]/40 shadow-sm transition-all active:scale-95"
        >
          🏃 ¿Qué toca hoy?
        </button>
        <button
          type="button"
          onClick={() => handleSendText('Tengo molestia leve en la rodilla nivel 2')}
          className="shrink-0 text-[10.5px] px-3 py-1 rounded-full bg-white/50 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 shadow-sm transition-all active:scale-95"
        >
          ⚡ Molestia leve rodilla
        </button>
        <button
          type="button"
          onClick={() => handleSendText('Comida: 200g pechuga de pollo y 150g arroz')}
          className="shrink-0 text-[10.5px] px-3 py-1 rounded-full bg-white/50 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-500/40 shadow-sm transition-all active:scale-95"
        >
          🍗 Log pollo y arroz
        </button>
      </div>
    </div>
  );
};
