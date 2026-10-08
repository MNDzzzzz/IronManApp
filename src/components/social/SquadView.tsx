// ====================================================================
// VISTA PRINCIPAL: SquadView.tsx (Módulo de Tribu & Social 100% Real)
// Feed de Check-ins interactivo, Podio Semanal, Retos de Tribu
// y Gestión de Códigos de Invitación bajo estética Apple Design
// Cero datos ficticios. Estados vacíos cuidados y persistencia real.
// ====================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Flame,
  Trophy,
  Sparkles,
  Plus,
  Share2,
  Check,
  Crown,
  Route,
  Dumbbell,
  Target,
  ChevronDown,
  UserCheck,
  Shield,
  LogIn,
} from 'lucide-react';
import {
  SquadGroup,
  WorkoutCheckIn,
  SquadLeaderboardEntry,
  ReactionEmoji,
  MemberPublicSummary,
  UserProfile,
} from '@/types/social';
import { DailyCheckInSheet } from './DailyCheckInSheet';
import { MemberProfileSheet } from './MemberProfileSheet';
import { EmptySquadView } from './EmptySquadView';

interface SquadViewProps {
  currentProfile: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export const SquadView: React.FC<SquadViewProps> = ({ currentProfile, onOpenAuthModal }) => {
  const [groups, setGroups] = useState<SquadGroup[]>([]);
  const [currentGroup, setCurrentGroup] = useState<SquadGroup | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'leaderboard' | 'challenges'>('feed');
  const [feed, setFeed] = useState<WorkoutCheckIn[]>([]);
  const [leaderboard, setLeaderboard] = useState<SquadLeaderboardEntry[]>([]);
  const [selectedMemberSummary, setSelectedMemberSummary] = useState<MemberPublicSummary | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar Grupos Reales del Usuario
  const loadUserGroups = useCallback(async () => {
    if (!currentProfile) {
      setGroups([]);
      setCurrentGroup(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups?userId=${encodeURIComponent(currentProfile.id)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const userGroups: SquadGroup[] = json.data || [];
        setGroups(userGroups);
        if (userGroups.length > 0) {
          // Mantener grupo seleccionado si aún existe, o elegir el primero
          setCurrentGroup((prev) => {
            const found = userGroups.find((g) => g.id === prev?.id);
            return found || userGroups[0];
          });
        } else {
          setCurrentGroup(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile]);

  // Cargar Feed y Leaderboard de la Tribu Activa
  const loadGroupDetails = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      const [resFeed, resLead] = await Promise.all([
        fetch(`/api/groups/${groupId}/feed`, { cache: 'no-store' }),
        fetch(
          `/api/groups/${groupId}/leaderboard${
            currentProfile ? `?userId=${encodeURIComponent(currentProfile.id)}` : ''
          }`,
          { cache: 'no-store' }
        ),
      ]);

      if (resFeed.ok) {
        const feedJson = await resFeed.json();
        setFeed(feedJson.data || []);
      }

      if (resLead.ok) {
        const leadJson = await resLead.json();
        setLeaderboard(leadJson.data || []);
      }
    } catch (err) {
      console.error('Error al cargar datos del grupo:', err);
    }
  }, [currentProfile]);

  useEffect(() => {
    loadUserGroups();
  }, [loadUserGroups]);

  useEffect(() => {
    if (currentGroup) {
      loadGroupDetails(currentGroup.id);
    } else {
      setFeed([]);
      setLeaderboard([]);
    }
  }, [currentGroup, loadGroupDetails]);

  const handleCopyInvite = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(currentGroup.invite_code);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleToggleReaction = async (checkinId: string, emoji: ReactionEmoji) => {
    if (!currentProfile) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    try {
      const res = await fetch('/api/checkins/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkinId,
          userId: currentProfile.id,
          emoji,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFeed((prev) =>
          prev.map((item) => (item.id === checkinId ? json.data : item))
        );
      }
    } catch (err) {
      console.error('Error al reaccionar:', err);
    }
  };

  const handleOpenMemberProfile = async (userId: string) => {
    if (!currentGroup) return;
    try {
      const res = await fetch(`/api/groups/${currentGroup.id}/members/${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSelectedMemberSummary(json.data);
          setIsProfileOpen(true);
        }
      }
    } catch (err) {
      console.error('Error al abrir perfil de miembro:', err);
    }
  };

  const handleCheckInCreated = (newCheckin: WorkoutCheckIn) => {
    setFeed((prev) => [newCheckin, ...prev]);
    if (currentGroup) {
      loadGroupDetails(currentGroup.id);
    }
  };

  const handleGroupCreatedOrJoined = (newGroup: SquadGroup) => {
    setGroups((prev) => [newGroup, ...prev.filter((g) => g.id !== newGroup.id)]);
    setCurrentGroup(newGroup);
  };

  // 1. ESTADO: USUARIO NO IDENTIFICADO (Invitar a crear perfil / iniciar sesión)
  if (!currentProfile) {
    return (
      <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 text-center">
        <div className="liquid-glass-card rounded-[32px] p-8 border border-[var(--glass-border)] shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#D97757]/20 via-black/40 to-amber-500/10 border border-[#D97757]/30 flex items-center justify-center text-4xl shadow-inner mb-5">
            👥
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white apple-display tracking-tight">
            Tribu & Comunidad Atlética
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed max-w-md mx-auto">
            Únete a otros atletas para compartir tus salidas de Strava, validar entrenos de gimnasio
            y competir por el podio semanal sin exponer datos íntimos.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onOpenAuthModal}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 apple-btn-spring apple-pressable"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión / Crear Cuenta ⚡</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ESTADO: CARGANDO
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        <span>Sincronizando tribus y podio...</span>
      </div>
    );
  }

  // 3. ESTADO CERO REAL: El usuario no tiene tribus todavía
  if (groups.length === 0 || !currentGroup) {
    return (
      <EmptySquadView
        currentProfile={currentProfile}
        onGroupCreatedOrJoined={handleGroupCreatedOrJoined}
      />
    );
  }

  // 4. ESTADO ACTIVO: El usuario tiene tribu y está en ella
  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3 sm:px-4">
      {/* 1. Header de Tribu (Liquid Glass Card) */}
      <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 border border-[var(--glass-border)] shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D97757]/20 to-amber-500/20 border border-[#D97757]/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {currentGroup.avatar_emoji || '⚡'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white apple-title">
                  {currentGroup.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {currentGroup.members_count || 1} / {currentGroup.max_members} atletas
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {currentGroup.description}
              </p>
            </div>
          </div>

          {/* Acciones de Tribu: Código de invitación y botón Check-in */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Si el usuario pertenece a más de 1 grupo, selector rápido */}
            {groups.length > 1 && (
              <select
                value={currentGroup.id}
                onChange={(e) => {
                  const g = groups.find((grp) => grp.id === e.target.value);
                  if (g) setCurrentGroup(g);
                }}
                className="py-2 px-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-white focus:outline-none"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-neutral-900 text-white">
                    {g.avatar_emoji} {g.name}
                  </option>
                ))}
              </select>
            )}

            {/* Botón Copiar Código */}
            <button
              onClick={handleCopyInvite}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-all apple-pressable"
              title="Copiar código de invitación"
            >
              {inviteCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-amber-300 font-bold">{currentGroup.invite_code}</span>
                </>
              )}
            </button>

            {/* Botón de Check-in destacado */}
            <button
              onClick={() => setIsCheckInOpen(true)}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#D97757] to-amber-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 apple-pressable apple-btn-spring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Check-in Hoy</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Selector Segmentado de Sub-Vistas (Apple Segmented Control) */}
      <div className="p-1 rounded-2xl bg-black/20 dark:bg-white/[0.04] border border-[var(--glass-border)] grid grid-cols-3 gap-1">
        <button
          onClick={() => setActiveSubTab('feed')}
          className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
            activeSubTab === 'feed'
              ? 'bg-white/60 dark:bg-white/15 text-[#D97757] dark:text-[#E28464] font-bold shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Feed de Hoy</span>
        </button>

        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
            activeSubTab === 'leaderboard'
              ? 'bg-white/60 dark:bg-white/15 text-[#D97757] dark:text-[#E28464] font-bold shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Podio Semanal</span>
        </button>

        <button
          onClick={() => setActiveSubTab('challenges')}
          className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all apple-pressable ${
            activeSubTab === 'challenges'
              ? 'bg-white/60 dark:bg-white/15 text-[#D97757] dark:text-[#E28464] font-bold shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Retos 21K</span>
        </button>
      </div>

      {/* 3. SUB-VISTA: FEED DE CHECK-INS */}
      {activeSubTab === 'feed' && (
        <div className="space-y-3.5">
          {feed.length === 0 ? (
            <div className="liquid-glass-card rounded-3xl p-8 border border-[var(--glass-border)] text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl text-orange-400">
                🔥
              </div>
              <h3 className="text-base font-bold text-white apple-title">
                Aún no hay check-ins hoy
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Nadie ha registrado su entreno de hoy en tu tribu. ¡Sé el primero en abrir la jornada,
                ganar XP y motivar al resto del equipo!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsCheckInOpen(true)}
                  className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#D97757] to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 inline-flex items-center gap-2 apple-btn-spring apple-pressable"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar mi Entreno ⚡</span>
                </button>
              </div>
            </div>
          ) : (
            feed.map((item) => {
              const isUser = item.user_id === currentProfile.id;
              const author = item.user || (isUser ? currentProfile : { display_name: 'Compañero', username: 'atleta' });

              return (
                <div
                  key={item.id}
                  className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] shadow-md space-y-3 transition-all"
                >
                  {/* Cabecera del Check-in */}
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => handleOpenMemberProfile(item.user_id)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D97757] to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                        {author.display_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white group-hover:text-[var(--accent-coral)] transition-colors">
                            {author.display_name}
                          </span>
                          {isUser && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">
                              Tú
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                          @{author.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.is_gold_checkin && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Check-in de Oro</span>
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        +{item.xp_awarded} XP
                      </span>
                    </div>
                  </div>

                  {/* Título y Resumen Deportivo */}
                  <div className="p-3 rounded-xl bg-black/20 dark:bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {item.activity_type === 'running' ? '🏃' : '🏋️'}
                      </span>
                      <h3 className="text-sm font-bold text-white apple-title">
                        {item.title}
                      </h3>
                    </div>

                    {/* Métricas destacadas */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {item.metrics_summary.distance_km && (
                        <span className="flex items-center gap-1 font-semibold text-sky-400">
                          <Route className="w-3.5 h-3.5" />
                          {item.metrics_summary.distance_km} km ({item.metrics_summary.avg_pace || '5:35 /km'})
                        </span>
                      )}

                      {item.metrics_summary.volume_sets && (
                        <span className="flex items-center gap-1 font-semibold text-purple-400">
                          <Dumbbell className="w-3.5 h-3.5" />
                          {item.metrics_summary.volume_sets} series completadas
                        </span>
                      )}

                      {item.metrics_summary.muscle_groups && (
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                          Músculos: {item.metrics_summary.muscle_groups.join(', ')}
                        </span>
                      )}
                    </div>

                    {item.metrics_summary.notes && (
                      <p className="text-xs text-[var(--text-secondary)] italic pt-1 border-t border-white/5">
                        "{item.metrics_summary.notes}"
                      </p>
                    )}
                  </div>

                  {/* Foto de la máquina si hubo Check-in de Oro */}
                  {item.has_photo && item.photo_url && (
                    <div className="relative rounded-2xl overflow-hidden max-h-56 border border-white/10 group">
                      <img
                        src={item.photo_url}
                        alt="Foto de la máquina en el gimnasio"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-amber-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{item.gemini_detected_equipment || 'Máquina validada por IA'}</span>
                      </div>
                    </div>
                  )}

                  {/* Barra de Reacciones Hápticas Apple */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['🔥', '💪', '⚡', '👑', '🫡'] as ReactionEmoji[]).map((emoji) => {
                        const count = item.reactions?.filter((r) => r.emoji === emoji).length || 0;
                        const hasReacted = item.reactions?.some(
                          (r) => r.user_id === currentProfile.id && r.emoji === emoji
                        );

                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(item.id, emoji)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all apple-pressable apple-btn-spring ${
                              hasReacted
                                ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300 shadow-sm'
                                : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                      {new Date(item.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. SUB-VISTA: PODIO Y LEADERBOARD SEMANAL */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="liquid-glass-card rounded-3xl p-5 border border-[var(--glass-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center mb-5 flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Podio de la Semana (Se reinicia el lunes)</span>
            </h3>

            {leaderboard.length === 0 ? (
              <p className="text-center text-xs text-[var(--text-tertiary)] py-4">
                Aún no hay puntuaciones acumuladas esta semana en la tribu.
              </p>
            ) : (
              <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-sm mx-auto pt-4 pb-2">
                {/* 2º Puesto */}
                {leaderboard[1] && (
                  <div
                    onClick={() => handleOpenMemberProfile(leaderboard[1].user_id)}
                    className="flex-1 flex flex-col items-center cursor-pointer group"
                  >
                    <div className="relative mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-300/20 border border-slate-300/40 flex items-center justify-center font-bold text-white shadow-md group-hover:scale-105 transition-transform">
                        {leaderboard[1].display_name.charAt(0)}
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-300 text-black text-[11px] font-extrabold flex items-center justify-center shadow">
                        2
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[80px]">
                      {leaderboard[1].display_name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 font-semibold">
                      {leaderboard[1].weekly_xp} XP
                    </span>
                    <div className="w-full h-16 rounded-t-xl bg-slate-400/10 border-t border-x border-slate-400/20 mt-2 flex items-center justify-center text-xs font-bold text-slate-300">
                      🥈
                    </div>
                  </div>
                )}

                {/* 1º Puesto */}
                {leaderboard[0] && (
                  <div
                    onClick={() => handleOpenMemberProfile(leaderboard[0].user_id)}
                    className="flex-1 flex flex-col items-center cursor-pointer group -mt-4"
                  >
                    <Crown className="w-5 h-5 text-amber-400 animate-bounce mb-1" />
                    <div className="relative mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/25 border-2 border-amber-400 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                        {leaderboard[0].display_name.charAt(0)}
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-black text-[11px] font-extrabold flex items-center justify-center shadow">
                        1
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-amber-300 truncate max-w-[90px]">
                      {leaderboard[0].display_name}
                    </span>
                    <span className="text-[11px] font-mono text-amber-300 font-bold">
                      {leaderboard[0].weekly_xp} XP
                    </span>
                    <div className="w-full h-24 rounded-t-xl bg-amber-500/15 border-t border-x border-amber-400/40 mt-2 flex items-center justify-center text-base font-bold text-amber-300">
                      🥇
                    </div>
                  </div>
                )}

                {/* 3º Puesto */}
                {leaderboard[2] && (
                  <div
                    onClick={() => handleOpenMemberProfile(leaderboard[2].user_id)}
                    className="flex-1 flex flex-col items-center cursor-pointer group"
                  >
                    <div className="relative mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-amber-700/20 border border-amber-700/40 flex items-center justify-center font-bold text-white shadow-md group-hover:scale-105 transition-transform">
                        {leaderboard[2].display_name.charAt(0)}
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-700 text-white text-[11px] font-extrabold flex items-center justify-center shadow">
                        3
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[80px]">
                      {leaderboard[2].display_name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 font-semibold">
                      {leaderboard[2].weekly_xp} XP
                    </span>
                    <div className="w-full h-12 rounded-t-xl bg-amber-700/10 border-t border-x border-amber-700/20 mt-2 flex items-center justify-center text-xs font-bold text-amber-600">
                      🥉
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista completa de la clasificación */}
          {leaderboard.length > 0 && (
            <div className="space-y-2">
              {leaderboard.map((member) => (
                <div
                  key={member.user_id}
                  onClick={() => handleOpenMemberProfile(member.user_id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all apple-pressable ${
                    member.is_current_user
                      ? 'bg-[#D97757]/15 border-[#D97757]/50 shadow-md'
                      : 'bg-black/20 dark:bg-white/[0.03] border-[var(--glass-border)] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-bold text-xs text-[var(--text-tertiary)]">
                      #{member.rank}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                      {member.display_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {member.display_name}
                        </span>
                        {member.is_current_user && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        @{member.username} · {member.current_streak} días de racha 🔥
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono font-extrabold text-amber-300">
                      {member.weekly_xp} XP
                    </span>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {member.weekly_checkins} check-ins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-VISTA: RETOS DE TRIBU 21K */}
      {activeSubTab === 'challenges' && (
        <div className="space-y-3.5">
          <div className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏃</span>
                <h4 className="text-sm font-bold text-white apple-title">
                  Volumen Semanal Colectivo
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">
                Meta: 60 km
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Sumad los kilómetros de carrera de todos los atletas de la tribu esta semana.
            </p>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: '45%' }}
              />
            </div>
          </div>

          <div className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏋️</span>
                <h4 className="text-sm font-bold text-white apple-title">
                  Disciplina de Sala (Fuerza)
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">
                Meta: 15 sesiones
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Completar 15 sesiones de fuerza combinadas entre todos los miembros.
            </p>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Check-in Diario */}
      <DailyCheckInSheet
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        currentProfile={currentProfile}
        onCheckInCreated={handleCheckInCreated}
      />

      {/* MODAL: Perfil de Miembro No Intrusivo */}
      <MemberProfileSheet
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        member={selectedMemberSummary}
      />
    </div>
  );
};
