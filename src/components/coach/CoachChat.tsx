'use client';

// ====================================================================
// COMPONENTE DE CHAT & DICTADO POR VOZ CON COACH: IronManApp
// Módulo de conversación multimodal con Gemini, notas de voz en directo,
// sugerencias biomecánicas y chips de acción rápida.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  Trash2,
  Loader2,
  Volume2,
} from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { CoachTurnResult } from '@/lib/coach/coachCore';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  isVoice?: boolean;
  voiceDuration?: number;
  timestamp: string;
  action?: string;
  coachTip?: string;
  dataSummary?: any;
}

interface CoachChatProps {
  onTurnCompleted?: (result: CoachTurnResult) => void;
  className?: string;
}

export const CoachChat: React.FC<CoachChatProps> = ({ onTurnCompleted, className = '' }) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: '¡Hola Álvaro! Soy tu Coach Deportivo. Puedes hablarme o escribirme para registrar comidas pesadas, apuntar series del gimnasio, cambiar días de entrenamiento o consultar cualquier molestia.',
      timestamp: 'Ahora',
      coachTip: 'Toca el micrófono para dictarme por voz en cualquier momento.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const {
    isRecording,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recorderError,
  } = useVoiceRecorder();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Enviar mensaje de texto al backend
  const handleSendText = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isProcessing) return;

    setInputText('');
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessageItem = {
      id: userMsgId,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsProcessing(true);
    setStatusNote('El Coach está analizando tu mensaje...');

    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) throw new Error('Error de conexión con el Coach');
      const data: CoachTurnResult = await res.json();

      const coachMsg: ChatMessageItem = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.replyText,
        coachTip: data.coachTip,
        action: data.action,
        dataSummary: data.dataSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, coachMsg]);
      if (onTurnCompleted) onTurnCompleted(data);
    } catch (err: any) {
      console.error('Error enviando al coach:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'coach',
          text: '⚠️ Disculpa, hubo un problema procesando tu mensaje. Inténtalo de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setStatusNote(null);
    }
  };

  // Detener y enviar nota de voz
  const handleStopAndSendVoice = async () => {
    const audioData = await stopRecording();
    if (!audioData) return;

    const userMsgId = `voice-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: '🎙️ Grabando nota de voz...',
        isVoice: true,
        voiceDuration: audioData.durationSeconds,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsProcessing(true);
    setStatusNote('Transcribiendo y analizando tu audio con Gemini...');

    try {
      const res = await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: audioData.base64,
          mimeType: audioData.mimeType,
        }),
      });

      if (!res.ok) throw new Error('Error procesando nota de voz');
      const data: CoachTurnResult = await res.json();

      // Actualizar el mensaje del usuario con la transcripción real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsgId
            ? { ...m, text: data.transcription || 'Nota de voz procesada' }
            : m
        )
      );

      const coachMsg: ChatMessageItem = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.replyText,
        coachTip: data.coachTip,
        action: data.action,
        dataSummary: data.dataSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, coachMsg]);
      if (onTurnCompleted) onTurnCompleted(data);
    } catch (err: any) {
      console.error('Error enviando audio:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'coach',
          text: '⚠️ No se pudo procesar la nota de voz. Por favor, asegúrate de hablar cerca del micrófono.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setStatusNote(null);
    }
  };

  const quickChips = [
    { label: '💧 +500ml agua', text: 'He bebido 500 ml de agua' },
    { label: '🥗 Comida pesada', text: 'He comido 200g pechuga de pollo cocinada y 200g patata hervida con 10g AOVE' },
    { label: '🔄 Cambiar entreno', text: 'Hoy no puedo correr, cámbiame el entreno a torso y corro mañana' },
    { label: '🩺 Molestia rodilla', text: 'Tengo un pinchazo sobre la rótula izquierda al flexionar' },
  ];

  return (
    <div className={`flex flex-col liquid-glass-card border border-[var(--glass-border)] shadow-2xl overflow-hidden rounded-3xl ${className}`}>
      {/* 1. CABECERA ELEGANTE DEL COACH */}
      <div className="px-5 py-3.5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-surface)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D97757] to-amber-500 flex items-center justify-center text-white font-bold shadow-md text-xs">
              ⚡
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--glass-surface)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">AI Coach Deportivo</h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#D97757]/15 text-[#D97757] font-mono border border-[#D97757]/30">
                Gemini Multi-Modal
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Nutrición de precisión, Fuerza & Media Maratón</p>
          </div>
        </div>

        {recorderError && (
          <span className="text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            Micrófono bloqueado
          </span>
        )}
      </div>

      {/* 2. HILO DE CONVERSACIÓN */}
      <div className="p-4 space-y-3.5 overflow-y-auto max-h-[380px] min-h-[220px] scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#D97757] text-white rounded-tr-xs shadow-md shadow-[#D97757]/20 font-medium'
                    : 'bg-[var(--glass-surface)] text-[var(--text-primary)] border border-[var(--glass-border)] rounded-tl-xs shadow-sm'
                }`}
              >
                {/* Badge de nota de voz */}
                {msg.isVoice && (
                  <div className={`flex items-center gap-1.5 mb-1.5 text-[11px] font-medium ${isUser ? 'text-white/90' : 'text-[#D97757]'}`}>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nota de voz ({msg.voiceDuration || 0}s)</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                {/* Consejo clínico del Coach si aplica */}
                {!isUser && msg.coachTip && (
                  <div className="mt-2.5 pt-2 border-t border-[var(--glass-border)] text-[11px] text-[#D97757] dark:text-[#E28464] flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#D97757]" />
                    <span>{msg.coachTip}</span>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1 font-mono">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* Indicador de procesamiento / pensamiento */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-[#D97757] bg-[#D97757]/10 px-3.5 py-2 rounded-2xl border border-[#D97757]/20 w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{statusNote || 'Procesando...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. CHIPS DE ACCIÓN RÁPIDA */}
      <div className="px-3.5 py-2 border-t border-[var(--glass-border)] flex items-center gap-2 overflow-x-auto no-scrollbar bg-[var(--glass-surface)]">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            disabled={isProcessing || isRecording}
            onClick={() => handleSendText(chip.text)}
            className="text-[11px] px-2.5 py-1 rounded-full liquid-glass-pill border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-all active:scale-95 disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 4. BARRA DE INTERACCIÓN (TEXTO Y GRABADORA DE VOZ EN VIVO) */}
      <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--glass-surface)]">
        {isRecording ? (
          // Vista de Grabación de Voz Activa con Ondas Sonoras
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <div className="flex items-center gap-1">
                {/* Visualizador de onda de audio */}
                <div
                  className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, audioLevel * 24)}px` }}
                />
                <div
                  className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(10, audioLevel * 32)}px` }}
                />
                <div
                  className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, audioLevel * 20)}px` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-rose-500">
                0:{duration < 10 ? `0${duration}` : duration}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">Escuchando...</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                title="Descartar nota"
                aria-label="Descartar nota"
                className="p-1.5 rounded-xl bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-thick)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] transition-colors active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleStopAndSendVoice}
                title="Enviar nota de voz"
                aria-label="Enviar nota de voz"
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        ) : (
          // Vista Normal: Entrada de Texto + Botón Micrófono
          <div className="flex items-center gap-2">
            <button
              onClick={startRecording}
              disabled={isProcessing}
              title="Grabar nota de voz"
              aria-label="Grabar nota de voz"
              className="p-2.5 rounded-2xl bg-[#D97757]/15 hover:bg-[#D97757]/25 text-[#D97757] border border-[#D97757]/30 transition-all active:scale-95 disabled:opacity-40 shadow-sm"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendText();
              }}
              placeholder="Habla o escribe al Coach..."
              disabled={isProcessing}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#D97757] transition-colors"
            />

            <button
              onClick={() => handleSendText()}
              disabled={!inputText.trim() || isProcessing}
              title="Enviar mensaje"
              aria-label="Enviar mensaje"
              className="p-2.5 rounded-2xl bg-[var(--glass-surface-thick)] hover:bg-[#D97757] hover:text-white text-[var(--text-secondary)] border border-[var(--glass-border)] transition-all active:scale-95 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
