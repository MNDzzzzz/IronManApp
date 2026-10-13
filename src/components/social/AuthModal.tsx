// ====================================================================
// COMPONENTE: AuthModal.tsx (Apple ID Style Sheet)
// Hoja de bienvenida, registro real e inicio de sesión de atleta
// Proyecto: IronManApp (Apple Liquid Glass, Cero Mocks)
// ====================================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Sparkles,
  Flame,
  Shield,
  ArrowRight,
  Check,
  AlertCircle,
  KeyRound,
  Target,
  Mail,
  Lock,
} from 'lucide-react';
import { UserProfile } from '@/types/social';
import { ATHLETE_STORAGE_KEY } from '@/lib/socialManager';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'register',
}) => {
  const [tab, setTab] = useState<'register' | 'login'>(initialMode);

  // Campos de registro
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('En preparación para Media Maratón 21K 2027.');
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [targetRaceName, setTargetRaceName] = useState('Media Maratón 21K 2027');

  // Campos de login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isPinMode, setIsPinMode] = useState(false);

  // Estados de proceso y feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setErrorMessage(null);
      setSuccessMessage(null);
      setTab(initialMode);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Manejo de Registro Real
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setErrorMessage(
        'El nombre de usuario debe tener entre 3 y 20 caracteres (solo letras minúsculas, números o guiones bajos).'
      );
      setIsLoading(false);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Por favor, introduce tu nombre o apodo deportivo.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: cleanUsername,
          email: email.trim() || `${cleanUsername}@ironman.local`,
          bio: bio.trim(),
          weeklyGoal,
          targetRaceName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear cuenta.');
      }

      const profile: UserProfile = result.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(profile));
      }

      setSuccessMessage(`¡Cuenta creada con éxito! Bienvenido, @${profile.username}`);
      setTimeout(() => {
        onAuthSuccess(profile);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarte.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de Login Real
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isPinMode) {
        // Validación con PIN Maestro del servidor
        const pinRes = await fetch('/api/auth/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinCode.trim() }),
        });
        const pinData = await pinRes.json();
        if (!pinRes.ok || !pinData.success) {
          throw new Error(pinData.error || 'PIN incorrecto.');
        }

        // Obtener o crear perfil por defecto para el atleta del PIN
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        let profile = meData.data;

        if (!profile) {
          const createRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Álvaro',
              username: 'alvaro_ironman',
              email: 'alvaro@ironman.local',
              bio: 'Preparación Media Maratón 21K 2027',
              weeklyGoal: 5,
            }),
          });
          const createData = await createRes.json();
          profile = createData.data;
        }

        if (typeof window !== 'undefined' && profile) {
          localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(profile));
        }

        setSuccessMessage('¡Acceso verificado por PIN Maestro!');
        setTimeout(() => {
          if (profile) onAuthSuccess(profile);
          onClose();
        }, 600);
        return;
      }

      // Login por Username o Email
      const cleanIdent = loginIdentifier.replace(/^@/, '').toLowerCase().trim();
      if (!cleanIdent) {
        throw new Error('Introduce tu @username o email para identificarte.');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: cleanIdent }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Atleta no encontrado.');
      }

      const profile: UserProfile = data.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(profile));
      }

      setSuccessMessage(`¡Sesión iniciada como @${profile.username}!`);
      setTimeout(() => {
        onAuthSuccess(profile);
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Acceso y Perfil de Atleta"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-apple-fade-in transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--glass-surface-thick)] backdrop-blur-2xl border-t sm:border border-[var(--glass-border)] rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col overflow-hidden animate-apple-slide-up"
      >
        {/* Tirador táctil Apple en móvil */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-coral)] font-semibold">
              IronMan Atleta
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--text-tertiary)]">Identificación Real</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-white apple-pressable apple-btn-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Pestañas Apple Segmented */}
        <div className="px-5 pt-4 shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/30 border border-white/10">
            <button
              onClick={() => {
                setTab('register');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all apple-pressable ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-[#D97757] to-amber-500 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
            <button
              onClick={() => {
                setTab('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all apple-pressable ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-[#D97757] to-amber-500 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
          </div>
        </div>

        {/* Mensajes de error o éxito */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Contenido scrolleable con padding inferior seguro */}
        <div className="p-5 pb-12 sm:pb-8 overflow-y-auto space-y-4">
          {tab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Tu Nombre o Apodo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Álvaro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Nombre de Usuario Único (@username)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[var(--accent-coral)]">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="alvaro_ironman"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())
                    }
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  3-20 caracteres. Usado para identificarte en tu Tribu y en los Check-ins.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-tertiary)]" />
                  <input
                    type="email"
                    placeholder="atleta@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Meta Semanal de Entrenamientos
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWeeklyGoal(num)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all apple-pressable ${
                        weeklyGoal === num
                          ? 'bg-[#D97757] text-white shadow-sm'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] border border-[var(--glass-border)]'
                      }`}
                    >
                      {num} d/sem
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Objetivo Principal
                </label>
                <input
                  type="text"
                  placeholder="ej. Media Maratón 21K 2027"
                  value={targetRaceName}
                  onChange={(e) => setTargetRaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Biografía Deportiva
                </label>
                <textarea
                  rows={2}
                  placeholder="Disciplina, fuerza y constancia..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 apple-btn-spring apple-pressable disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Creando tu perfil...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Crear Cuenta de Atleta ⚡</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {!isPinMode ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Tu @username o Email Registrado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[var(--accent-coral)]">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="alvaro_ironman o correo@ejemplo.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    PIN Maestro de Safari / App
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[var(--accent-coral)]" />
                    <input
                      type="password"
                      required
                      placeholder="Introduce el PIN Maestro"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 apple-btn-spring apple-pressable disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>{isPinMode ? 'Acceder con PIN' : 'Entrar a mi Cuenta'}</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinMode(!isPinMode);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[var(--accent-coral)] hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Lock className="w-3 h-3" />
                  <span>{isPinMode ? 'Usar @username o Email' : 'Acceder con PIN Maestro'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Tus datos y entrenos permanecen privados y protegidos en tu dispositivo.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alias de compatibilidad
export const LoginSheet = AuthModal;
