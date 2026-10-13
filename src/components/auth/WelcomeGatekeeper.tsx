// ====================================================================
// COMPONENTE: WelcomeGatekeeper.tsx (Onboarding & Auth Gatekeeper)
// Estilo: Apple ID / visionOS Liquid Glass Segmented Control
// Propósito: Bloquear el acceso a telemetría si no hay atleta autenticado.
// Evita exponer datos de Álvaro a visitantes o amigos que abran el enlace.
// Idioma: Español (Strict TypeScript & Apple Design)
// ====================================================================

'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  AtSign,
  Mail,
  Target,
  LogIn,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { UserProfile } from '@/types/social';
import { ATHLETE_STORAGE_KEY } from '@/lib/socialManager';

interface WelcomeGatekeeperProps {
  onAuthenticated: (profile: UserProfile) => void;
}

export const WelcomeGatekeeper: React.FC<WelcomeGatekeeperProps> = ({ onAuthenticated }) => {
  // Selector segmentado directo estilo iOS: por defecto 'login' para permitir acceso ágil
  const [mode, setMode] = useState<'register' | 'login'>('login');

  // Estados de Registro
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regGoal, setRegGoal] = useState('Media Maratón 21K 2027');
  const [regWeeklyGoal, setRegWeeklyGoal] = useState(5);

  // Estados de Login
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Manejo de Registro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMessage('Por favor, indica tu nombre completo o apodo.');
      return;
    }
    const cleanUsername = regUsername.replace(/^@/, '').toLowerCase().trim();
    if (!cleanUsername || !/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setErrorMessage('El nombre de usuario debe tener entre 3 y 20 caracteres (solo letras, números o _).');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          username: cleanUsername,
          email: regEmail.trim() || undefined,
          targetRaceName: regGoal,
          weeklyGoal: regWeeklyGoal,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al crear tu perfil.');
      }

      const profile: UserProfile = json.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(profile));
      }
      onAuthenticated(profile);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Manejo de Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setErrorMessage('Introduce tu @username o email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const cleanInput = loginIdentifier.trim();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanInput,
          usernameOrEmail: cleanInput,
          username: cleanInput,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se encontró un perfil con ese usuario.');
      }

      const profile: UserProfile = json.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(profile));
      }
      onAuthenticated(profile);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Fondo lumínico con desenfoque de cristal (Apple Ambient Aura) */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/10 dark:bg-orange-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Contenedor Principal Liquid Glass */}
      <div className="w-full max-w-md liquid-glass-card rounded-[32px] p-6 sm:p-8 border border-[var(--glass-border)] shadow-2xl relative z-10 animate-apple-fade-in">
        {/* Cabecera / Identidad */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D97757] to-amber-500 text-white shadow-lg shadow-orange-500/25 mb-4 apple-interactive-card">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#D97757] dark:text-[#E28464] block">
            Plataforma de Rendimiento
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight mt-1 apple-display">
            IronMan Lab
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Telemetría de carrera, progresión de fuerza y comunidad deportiva privada.
          </p>
        </div>

        {/* Apple Segmented Control: [Crear Cuenta] | [Iniciar Sesión] */}
        <div className="flex p-1 rounded-2xl bg-black/5 dark:bg-white/10 border border-[var(--glass-border)] mb-6 transition-all">
          <button
            type="button"
            data-testid="tab-register"
            onClick={() => {
              setErrorMessage('');
              setMode('register');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 apple-pressable ${
              mode === 'register'
                ? 'bg-white dark:bg-stone-800 text-[var(--text-primary)] shadow-md shadow-black/5'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => {
              setErrorMessage('');
              setMode('login');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 apple-pressable ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-800 text-[var(--text-primary)] shadow-md shadow-black/5'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
        </div>

        {/* Mensaje de Error si aplica */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-apple-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. FORMULARIO DE REGISTRO DIRECTO */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-apple-fade-in">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Álvaro Méndez"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/[0.06] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Nombre de Usuario (@username único)
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alvaro_iron"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/[0.06] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Objetivo Atlético
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={regGoal}
                    onChange={(e) => setRegGoal(e.target.value)}
                    placeholder="Media Maratón 21K 2027"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/[0.06] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Email (Opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/[0.06] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 apple-pressable apple-btn-spring"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creando perfil...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Comenzar Mi Preparación</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 2. FORMULARIO DE LOGIN DIRECTO */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-apple-fade-in">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                Tu @username o Email
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  required
                  data-testid="login-input"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="mendez o tu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/[0.06] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#D97757]"
                />
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                Introduce el nombre de usuario (@mendez) o correo con el que te diste de alta.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                data-testid="login-submit-btn"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 apple-pressable apple-btn-spring"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Accediendo...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar al Laboratorio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Badge de Privacidad Apple Blindada */}
        <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex items-center justify-center gap-2 text-[11px] text-[var(--text-tertiary)] text-center leading-tight">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Privacidad Atlética Blindada • Tus métricas no se comparten con visitantes ajenos</span>
        </div>
      </div>
    </div>
  );
};
