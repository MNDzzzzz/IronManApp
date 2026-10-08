// ====================================================================
// VISTA PRINCIPAL: SquadView.tsx (Módulo de Tribu & Social)
// Feed de Check-ins interactivo, Podio Semanal, Retos de Tribu
// y Gestión de Códigos de Invitación bajo estética Apple Design
// ====================================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Flame,
  Trophy,
  Sparkles,
  Plus,
  Copy,
  Check,
  Award,
  Crown,
  Route,
  Dumbbell,
  MessageSquare,
  Target,
  Share2,
  Calendar,
  Lock,
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
import { initialGroups, initialCheckins, initialProfiles, getSquadLeaderboard, getMemberPublicSummary } from '@/lib/socialManager';

interface SquadViewProps {
  currentProfile: UserProfile;
}

export const SquadView: React.FC<SquadViewProps> = ({ currentProfile }) => {
  const [currentGroup, setCurrentGroup] = useState<SquadGroup>(initialGroups[0]);
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'leaderboard' | 'challenges'>('feed');
  const [feed, setFeed] = useState<WorkoutCheckIn[]>(initialCheckins);
  const [leaderboard, setLeaderboard] = useState<SquadLeaderboardEntry[]>([]);
  const [selectedMemberSummary, setSelectedMemberSummary] = useState<MemberPublicSummary | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Cargar Leaderboard
  useEffect(() => {
    if (currentGroup) {
      const data = getSquadLeaderboard(currentGroup.id, currentProfile.id);
      setLeaderboard(data);
    }
  }, [currentGroup, currentProfile]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(currentGroup.invite_code);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleToggleReaction = async (checkinId: string, emoji: ReactionEmoji) => {
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

  const handleOpenMemberProfile = (userId: string) => {
    const summary = getMemberPublicSummary(userId);
    if (summary) {
      setSelectedMemberSummary(summary);
      setIsProfileOpen(true);
    }
  };

  const handleCheckInCreated = (newCheckin: WorkoutCheckIn) => {
    setFeed((prev) => [newCheckin, ...prev]);
    // Recalcular leaderboard
    setLeaderboard(getSquadLeaderboard(currentGroup.id, currentProfile.id));
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3 sm:px-4">
      {/* 1. Header de Tribu (Liquid Glass Card) */}
      <div className="liquid-glass-card rounded-3xl p-4 sm:p-5 border border-[var(--glass-border)] shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D97757]/20 to-amber-500/20 border border-[#D97757]/30 flex items-center justify-center text-2xl shadow-inner">
              {currentGroup.avatar_emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white apple-title">
                  {currentGroup.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {currentGroup.members_count || 3} / {currentGroup.max_members} atletas
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {currentGroup.description}
              </p>
            </div>
          </div>

          {/* Acciones de Tribu: Código de invitación y botón Check-in */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
          {feed.map((item) => {
            const isUser = item.user_id === currentProfile.id;
            const author =
              initialProfiles.find((p) => p.id === item.user_id) ||
              (isUser ? currentProfile : { display_name: 'Atleta', username: 'atleta' });

            return (
              <div
                key={item.id}
                className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] shadow-md space-y-3 transition-all"
              >
                {/* Cabecera del Check-in: Atleta, Tipo y Estado de Oro */}
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
          })}
        </div>
      )}

      {/* 4. SUB-VISTA: PODIO Y LEADERBOARD SEMANAL */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Podio con pedestales de cristal para el Top 3 */}
          <div className="liquid-glass-card rounded-3xl p-5 border border-[var(--glass-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center mb-5 flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Podio de la Semana (Se reinicia el lunes)</span>
            </h3>

            {/* Los 3 puestos del podio */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-sm mx-auto pt-4 pb-2">
              {/* 2º Puesto (Plata) */}
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

              {/* 1º Puesto (Oro - Corona) */}
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

              {/* 3º Puesto (Bronce) */}
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
          </div>

          {/* Lista completa de la clasificación */}
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
                  <span className="w-6 text-center font-mono font-bold text-sm text-[var(--text-tertiary)]">
                    #{member.rank}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                    {member.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{member.display_name}</span>
                      {member.is_current_user && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">
                          Tú
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-orange-400">
                        <Flame className="w-2.5 h-2.5" /> {member.current_streak} días
                      </span>
                      <span>·</span>
                      <span>{member.weekly_checkins} check-ins</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-amber-300 font-mono">
                    {member.weekly_xp} XP
                  </div>
                  {member.has_gold_this_week && (
                    <span className="text-[9px] text-amber-400 font-bold flex items-center justify-end gap-0.5">
                      👑 Oro activo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SUB-VISTA: RETOS DE TRIBU */}
      {activeSubTab === 'challenges' && (
        <div className="space-y-3">
          <div className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold text-white">Reto Tribu: 150 km Semanales</h4>
              </div>
              <span className="text-xs font-bold text-sky-400">112 / 150 km (74%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full w-[74%]" />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Quedan 3 días para completar el kilometraje aeróbico conjunto de la semana.
            </p>
          </div>

          <div className="liquid-glass-card rounded-2xl p-4 border border-[var(--glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Reto de Sala: 100 Series de Fuerza</h4>
              </div>
              <span className="text-xs font-bold text-purple-400">84 / 100 series (84%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-[84%]" />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              ¡Casi conseguido! El volumen de hipertrofia acumulado está en el rango óptimo.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Sheet de Check-in */}
      <DailyCheckInSheet
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInCreated={handleCheckInCreated}
      />

      {/* Bottom Sheet de Perfil de Compañero */}
      <MemberProfileSheet
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        member={selectedMemberSummary}
      />
    </div>
  );
};
