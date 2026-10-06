'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Keyboard, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeroVoiceButtonProps {
  onSuccessResult?: (result: any) => void;
  onStatusChange?: (statusText: string) => void;
}

export const HeroVoiceButton: React.FC<HeroVoiceButtonProps> = ({
  onSuccessResult,
  onStatusChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Limpiar temporizadores de feedback
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
      if (onStatusChange) onStatusChange('Permiso de micrófono no concedido. Usa el teclado.');
      setShowTextInput(true);
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
          if (onStatusChange) onStatusChange(data.replyText || data.reply || 'Datos procesados y aplicados con éxito.');
          if (onSuccessResult) onSuccessResult(data);
        } else {
          setFeedbackState('error');
          if (onStatusChange) onStatusChange(data.error || 'No se pudo interpretar el audio.');
        }
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error('Error enviando audio:', err);
      setIsProcessing(false);
      setFeedbackState('error');
      if (onStatusChange) onStatusChange('Error de red al procesar el audio.');
    }
  };

  // Enviar mensaje de texto secundario
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textMessage.trim() || isProcessing) return;

    setIsProcessing(true);
    if (onStatusChange) onStatusChange('Consultando al Coach...');

    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textMessage.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setTextMessage('');
        setShowTextInput(false);
        setFeedbackState('success');
        if (onStatusChange) onStatusChange(data.replyText || data.reply || 'Cambios aplicados correctamente.');
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
    <div className="flex flex-col items-center justify-center w-full my-3">
      {/* Input de texto secundario deslizable */}
      {showTextInput ? (
        <form
          onSubmit={handleSendText}
          className="w-full max-w-sm mb-3 flex items-center gap-2 p-1.5 rounded-2xl liquid-glass-card"
        >
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Ej: Desayuno 2 huevos y 50g avena..."
            className="flex-1 px-3 py-2 text-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={!textMessage.trim() || isProcessing}
            className="p-2 rounded-xl bg-[#D97757] text-white disabled:opacity-40 transition-transform active:scale-90"
            aria-label="Enviar texto"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowTextInput(false)}
            className="text-xs px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cerrar
          </button>
        </form>
      ) : null}

      {/* Botón Principal Hero de 80px */}
      <div className="relative flex items-center justify-center">
        {/* Halo de refracción expansiva durante la grabación */}
        {isRecording && (
          <div className="absolute inset-0 w-24 h-24 -m-2 rounded-full bg-[#D97757]/20 animate-ping pointer-events-none" />
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          aria-label={
            isRecording
              ? 'Detener grabación de voz'
              : 'Grabar mensaje de voz para el Head Coach'
          }
          className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-xl ${
            isRecording
              ? 'bg-rose-500 text-white shadow-rose-500/40'
              : feedbackState === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/30'
              : feedbackState === 'error'
              ? 'bg-amber-600 text-white shadow-amber-500/30'
              : 'liquid-glass-card hover:border-[#D97757]/60'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-[#D97757] animate-spin" />
          ) : isRecording ? (
            <Square className="w-7 h-7 fill-current animate-pulse" />
          ) : feedbackState === 'success' ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : feedbackState === 'error' ? (
            <AlertCircle className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8 text-[#D97757] dark:text-[#E28464] stroke-[2]" />
          )}
          <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5 opacity-80">
            {isRecording ? 'Parar' : isProcessing ? 'Pensando' : 'Voz Coach'}
          </span>
        </button>

        {/* Acceso secundario para escribir en teclado */}
        {!showTextInput && (
          <button
            onClick={() => setShowTextInput(true)}
            aria-label="Escribir mensaje en lugar de hablar"
            title="Escribir mensaje"
            className="absolute -right-12 p-2.5 rounded-full liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2 font-medium">
        {isRecording
          ? '🔴 Grabando... Toca para enviar al Coach'
          : isProcessing
          ? 'Calculando macros o adaptando el plan...'
          : 'Toca para registrar comidas o modificar entreno por voz'}
      </p>
    </div>
  );
};
