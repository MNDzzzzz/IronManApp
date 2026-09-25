'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Compass,
  Mic,
  Database,
  RefreshCw,
  Sparkles,
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
  const stravaWebhookUrl = `${currentOrigin}/api/strava/webhook`;
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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl overflow-y-auto pb-24 pt-[env(safe-area-inset-top,20px)] px-4 animate-in fade-in duration-200">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-900 text-zinc-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Configuración & Integraciones</span>
          <div className="w-9" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Puentes & Webhooks</h2>
          <p className="text-xs text-zinc-400">Direcciones para conectar tu Android, Strava y Telegram</p>
        </div>

        {/* 1. PUENTE ANDROID (GALAXY FIT3) */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Smartphone className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Android Puente (Health Connect)</h3>
          </div>
          <p className="text-[11px] text-zinc-400">Endpoint HTTP POST para enviar el JSON de métricas desde el teléfono secundario.</p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <span className="truncate pr-2">{bridgeUrl}</span>
            <button
              onClick={() => copyToClipboard(bridgeUrl, 'bridge')}
              className="text-orange-400 hover:text-orange-300"
            >
              {copiedKey === 'bridge' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[10px] text-zinc-500">Cabecera obligatoria: <code className="text-orange-400">x-bridge-token: ironman_secret_fit3_token_2026</code></div>
        </div>

        {/* 2. STRAVA WEBHOOK */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-2">
          <div className="flex items-center gap-2 text-brand-strava">
            <Compass className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Webhook de Strava</h3>
          </div>
          <p className="text-[11px] text-zinc-400">Callback URL para recibir tus carreras y caminatas del iPhone 15 Pro.</p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <span className="truncate pr-2">{stravaWebhookUrl}</span>
            <button
              onClick={() => copyToClipboard(stravaWebhookUrl, 'strava')}
              className="text-orange-400 hover:text-orange-300"
            >
              {copiedKey === 'strava' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[10px] text-zinc-500">Verify Token: <code className="text-orange-400">ironman_strava_webhook_token_secure</code></div>
        </div>

        {/* 3. TELEGRAM BOT (NUTRICIÓN CON IA & ASISTENTE 360) */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Mic className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Bot de Telegram (Entrenador & Dieta por Voz)</h3>
          </div>
          <p className="text-[11px] text-zinc-400">URL del Webhook para recibir audios, registrar comidas/entrenamientos y responder dudas clínicas.</p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <span className="truncate pr-2">{telegramWebhookUrl}</span>
            <button
              onClick={() => copyToClipboard(telegramWebhookUrl, 'telegram')}
              className="text-orange-400 hover:text-orange-300"
            >
              {copiedKey === 'telegram' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-1">
            <button
              onClick={handleActivateTelegram}
              disabled={isActivatingTelegram}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isActivatingTelegram ? 'animate-spin' : ''}`} />
              {isActivatingTelegram ? 'Comprobando en Telegram...' : '⚡ Comprobar & Vincular Webhook'}
            </button>
            {telegramStatus && (
              <p className="mt-2 text-[11px] text-zinc-300 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                {telegramStatus}
              </p>
            )}
          </div>
        </div>

        {/* 4. HERRAMIENTAS DE PRUEBA (QA SEEDER) */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Herramientas de QA y Simulación</h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            Genera al instante datos realistas de prueba: una carrera de Strava con pulso fusionado, sueño completo de la Fit3, y comidas.
          </p>

          <button
            onClick={handleReseed}
            disabled={isReseeding}
            className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isReseeding ? 'animate-spin text-orange-400' : ''}`} />
            {isReseeding ? 'Regenerando datos...' : 'Recargar Datos de Simulación'}
          </button>

          {reseedStatus && (
            <p className="text-center text-xs font-semibold text-emerald-400">{reseedStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
};
