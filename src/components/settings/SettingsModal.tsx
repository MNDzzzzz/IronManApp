'use client';

// ====================================================================
// MODAL DE CONFIGURACIÓN & INTEGRACIONES: IronManApp
// Puentes de conexión para Health Connect (Fit3), Telegram Webhook
// y simulador de datos de prueba para QA.
// Idioma: Español (Strict TypeScript / Clean Architecture / Liquid Glass)
// ====================================================================

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Mic,
  Database,
  RefreshCw,
  Gauge,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReseedMockData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onReseedMockData,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isReseeding, setIsReseeding] = useState(false);
  const [reseedStatus, setReseedStatus] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isActivatingTelegram, setIsActivatingTelegram] = useState(false);

  const handleActivateTelegram = async () => {
    setIsActivatingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await fetch('/api/telegram/webhook?setup=true');
      const data = await res.json();
      if (data.telegram_bot?.webhook_setup_result?.ok) {
        setTelegramStatus('✅ Webhook vinculado y activo en Telegram con éxito.');
      } else if (!data.telegram_bot?.bot_token_configured) {
        setTelegramStatus('⚠️ Falta configurar TELEGRAM_BOT_TOKEN en las variables de entorno de Vercel.');
      } else if (data.telegram_bot?.telegram_api_webhook_info?.ok) {
        const info = data.telegram_bot.telegram_api_webhook_info.result;
        setTelegramStatus(
          `ℹ️ Estado Telegram: ${info.url ? `Conectado a ${info.url}` : 'Sin URL registrada'}. Pendientes: ${info.pending_update_count}${info.last_error_message ? ` | Error: ${info.last_error_message}` : ''}`
        );
      } else {
        setTelegramStatus('ℹ️ Verificado. Revisa la configuración de Telegram.');
      }
    } catch (err: any) {
      setTelegramStatus('❌ Error al conectar con el servidor.');
    } finally {
      setIsActivatingTelegram(false);
    }
  };

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tu-app.vercel.app';

  const bridgeUrl = `${currentOrigin}/api/bridge/sync`;
  const telegramWebhookUrl = `${currentOrigin}/api/telegram/webhook`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReseed = async () => {
    setIsReseeding(true);
    setReseedStatus(null);
    try {
      await onReseedMockData();
      setReseedStatus('✅ Datos de prueba sembrados con éxito.');
    } catch (e: any) {
      setReseedStatus('❌ Error al sembrar datos');
    } finally {
      setIsReseeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md overflow-y-auto pb-24 pt-[env(safe-area-inset-top,20px)] px-4 animate-in fade-in duration-200 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto space-y-4 liquid-glass-card bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] rounded-3xl p-5 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-8" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Configuración & Integraciones</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">Puentes & Integraciones</h2>
          <p className="text-xs text-[var(--text-secondary)]">Direcciones para sincronizar tu Samsung Galaxy Fit3 y Telegram</p>
        </div>

        {/* 1. PUENTE ANDROID (GALAXY FIT3) */}
        <div className="p-4 rounded-3xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
          <div className="flex items-center gap-2 text-emerald-500">
            <Smartphone className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Android Puente (Health Connect)</h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Endpoint HTTP POST para enviar el JSON de métricas (pasos, pulso continuo, sueño y SpO2) desde tu móvil secundario.</p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)]">
            <span className="truncate pr-2">{bridgeUrl}</span>
            <button
              onClick={() => copyToClipboard(bridgeUrl, 'bridge')}
              className="text-[#D97757] hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Copiar endpoint de puente"
            >
              {copiedKey === 'bridge' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] font-mono">Cabecera: <code className="text-[#D97757]">x-bridge-token: ironman_secret_fit3_token_2026</code></div>
        </div>

        {/* 2. REGISTRO DIRECTO FIT3 (SIN STRAVA API DE PAGO) */}
        <div className="p-4 rounded-3xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-2">
          <div className="flex items-center gap-2 text-[#FC5200]">
            <Gauge className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Flujo Cardio Galaxy Fit3</h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            La integración opera 100% libre de Strava (sin cuotas de pago). Tus rodajes, cadencia y FC se sincronizan desde Health Connect o registrándolos directamente en la pestaña Cardio.
          </p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)]">
            <span className="truncate pr-2">{currentOrigin}/api/activities</span>
            <button
              onClick={() => copyToClipboard(`${currentOrigin}/api/activities`, 'act')}
              className="text-[#D97757] hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Copiar endpoint de actividades"
            >
              {copiedKey === 'act' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] font-mono">Método: <code className="text-[#D97757]">POST JSON</code> (Admite cadencia ppm, pulso y zonas)</div>
        </div>

        {/* 3. TELEGRAM BOT (NUTRICIÓN CON IA & ASISTENTE 360) */}
        <div className="p-4 rounded-3xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-3">
          <div className="flex items-center gap-2 text-[#2D68C4]">
            <Mic className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Bot de Telegram (Entrenador & Dieta por Voz)</h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">URL del Webhook para recibir audios, registrar comidas/entrenamientos y responder dudas clínicas.</p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)]">
            <span className="truncate pr-2">{telegramWebhookUrl}</span>
            <button
              onClick={() => copyToClipboard(telegramWebhookUrl, 'telegram')}
              className="text-[#D97757] hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Copiar webhook de Telegram"
            >
              {copiedKey === 'telegram' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-1">
            <button
              onClick={handleActivateTelegram}
              disabled={isActivatingTelegram}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#2D68C4]/15 border border-[#2D68C4]/30 text-[#2D68C4] hover:bg-[#2D68C4]/25 text-xs font-bold transition-all disabled:opacity-50 active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isActivatingTelegram ? 'animate-spin' : ''}`} />
              {isActivatingTelegram ? 'Comprobando en Telegram...' : '⚡ Comprobar & Vincular Webhook'}
            </button>
            {telegramStatus && (
              <p className="mt-2 text-[11px] text-[var(--text-primary)] bg-[var(--glass-surface-thick)] p-2.5 rounded-xl border border-[var(--glass-border)]">
                {telegramStatus}
              </p>
            )}
          </div>
        </div>

        {/* 4. HERRAMIENTAS DE PRUEBA (QA SEEDER) */}
        <div className="p-4 rounded-3xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Herramientas de QA y Simulación</h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Genera al instante datos realistas de prueba: una carrera de Strava con pulso fusionado, sueño completo de la Fit3, y comidas.
          </p>

          <button
            onClick={handleReseed}
            disabled={isReseeding}
            className="w-full py-3 rounded-2xl bg-[var(--glass-surface-thick)] border border-[var(--glass-border)] hover:border-[#D97757]/50 text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isReseeding ? 'animate-spin text-[#D97757]' : ''}`} />
            {isReseeding ? 'Regenerando datos...' : 'Recargar Datos de Simulación'}
          </button>

          {reseedStatus && (
            <p className="text-center text-xs font-semibold text-emerald-500">{reseedStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
};
