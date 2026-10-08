// ====================================================================
// GESTOR DEL MÓDULO SOCIAL, TRIBUS, CHECK-INS Y GAMIFICACIÓN
// Proyecto: IronManApp (Apple Design & Clean Architecture)
// ====================================================================

import {
  UserProfile,
  SquadGroup,
  SquadMember,
  WorkoutCheckIn,
  CheckInReaction,
  AthleteBadge,
  MemberPublicSummary,
  SquadLeaderboardEntry,
  ReactionEmoji,
  CheckInActivityType,
  CheckInMetricsSummary,
} from '@/types/social';
import { mockStore } from './mockStore';
import { supabase, isSupabaseConfigured } from './supabase';

// ID de usuario maestro por defecto para compatibilidad transparente
export const MASTER_ATHLETE_ID = 'usr-alvaro-master-001';

export const initialProfiles: UserProfile[] = [
  {
    id: MASTER_ATHLETE_ID,
    username: 'alvaro_ironman',
    display_name: 'Álvaro',
    avatar_url: '',
    bio: 'Objetivo: Media Maratón 21K 2027 sub-2h. Disciplina, fuerza y recomposición corporal.',
    target_race_name: 'Media Maratón 21K 2027',
    target_race_date: '2027-02-28',
    weekly_workout_goal: 5,
    total_xp: 1450,
    current_level: 14,
    current_streak_days: 18,
    best_streak_days: 21,
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'usr-carlos-runner-002',
    username: 'carlos_pace',
    display_name: 'Carlos M.',
    avatar_url: '',
    bio: 'Entrenando series y rodajes largos para 21K.',
    target_race_name: 'Media Maratón 21K 2027',
    target_race_date: '2027-02-28',
    weekly_workout_goal: 4,
    total_xp: 1200,
    current_level: 12,
    current_streak_days: 12,
    best_streak_days: 14,
    created_at: '2026-09-05T00:00:00Z',
  },
  {
    id: 'usr-elena-fit-003',
    username: 'elena_tri',
    display_name: 'Elena S.',
    avatar_url: '',
    bio: 'Fuerza pesada + rodajes aeróbicos en Z2.',
    target_race_name: 'Media Maratón 21K 2027',
    target_race_date: '2027-02-28',
    weekly_workout_goal: 5,
    total_xp: 1620,
    current_level: 15,
    current_streak_days: 22,
    best_streak_days: 22,
    created_at: '2026-09-02T00:00:00Z',
  },
];

export const initialGroups: SquadGroup[] = [
  {
    id: 'grp-ironman-21k-alpha',
    name: 'Tribu 21K 2027 ⚡',
    description: 'Compañeros de preparación para Media Maratón y fuerza hipertrofia.',
    invite_code: 'IRON27',
    created_by: MASTER_ATHLETE_ID,
    avatar_emoji: '⚡',
    max_members: 15,
    members_count: 3,
    created_at: '2026-09-10T10:00:00Z',
  },
];

export const initialGroupMembers: SquadMember[] = [
  {
    id: 'mem-1',
    group_id: 'grp-ironman-21k-alpha',
    user_id: MASTER_ATHLETE_ID,
    role: 'owner',
    joined_at: '2026-09-10T10:00:00Z',
    group_xp: 350,
    weekly_checkins_count: 4,
  },
  {
    id: 'mem-2',
    group_id: 'grp-ironman-21k-alpha',
    user_id: 'usr-carlos-runner-002',
    role: 'member',
    joined_at: '2026-09-11T12:00:00Z',
    group_xp: 250,
    weekly_checkins_count: 3,
  },
  {
    id: 'mem-3',
    group_id: 'grp-ironman-21k-alpha',
    user_id: 'usr-elena-fit-003',
    role: 'member',
    joined_at: '2026-09-11T14:00:00Z',
    group_xp: 400,
    weekly_checkins_count: 5,
  },
];

export const initialBadges: AthleteBadge[] = [
  {
    id: 'streak_7',
    title: 'Disciplina de Hierro',
    description: 'Completar 7 días consecutivos de check-in activo.',
    icon_name: 'Flame',
    category: 'streak',
  },
  {
    id: 'streak_30',
    title: 'Mes Imparable',
    description: 'Completar 30 días ininterrumpidos de disciplina.',
    icon_name: 'Crown',
    category: 'streak',
  },
  {
    id: 'gold_proof_1',
    title: 'Bautismo de Oro',
    description: 'Primer check-in verificado con foto de máquina en el gimnasio.',
    icon_name: 'Sparkles',
    category: 'strength',
  },
  {
    id: 'gold_proof_10',
    title: 'Veterano de la Sala',
    description: '10 check-ins con foto de máquina validados por IA.',
    icon_name: 'Dumbbell',
    category: 'strength',
  },
  {
    id: 'sub_5_pace',
    title: 'Velocidad Punta',
    description: 'Registrar un tramo o carrera con ritmo inferior a 5:00 min/km.',
    icon_name: 'Zap',
    category: 'running',
  },
  {
    id: 'half_marathon_ready',
    title: 'Espíritu 21K',
    description: 'Acumular más de 20 km en una sola semana de preparación.',
    icon_name: 'Trophy',
    category: 'running',
  },
];

export const initialCheckins: WorkoutCheckIn[] = [
  {
    id: 'chk-today-alvaro',
    user_id: MASTER_ATHLETE_ID,
    date: new Date().toISOString().split('T')[0],
    activity_type: 'strength',
    title: 'Día 1: Torso Hipertrofia (16 series)',
    metrics_summary: {
      volume_sets: 16,
      muscle_groups: ['Pecho', 'Espalda', 'Hombro'],
      notes: 'Sobrecarga en Press Inclinado (+2.5 kg). Sensaciones de estabilidad perfectas.',
    },
    has_photo: true,
    photo_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80',
    is_gold_checkin: true,
    gemini_verification_status: 'verified',
    gemini_detected_equipment: 'Banco inclinado y mancuernas de peso libre',
    xp_awarded: 150,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: [
      {
        id: 'rea-1',
        checkin_id: 'chk-today-alvaro',
        user_id: 'usr-elena-fit-003',
        emoji: '🔥',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        username: 'elena_tri',
      },
      {
        id: 'rea-2',
        checkin_id: 'chk-today-alvaro',
        user_id: 'usr-carlos-runner-002',
        emoji: '💪',
        created_at: new Date(Date.now() - 1200000).toISOString(),
        username: 'carlos_pace',
      },
    ],
  },
  {
    id: 'chk-yesterday-elena',
    user_id: 'usr-elena-fit-003',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    activity_type: 'running',
    title: 'Rodaje 8.5K Control Aeróbico Z2',
    metrics_summary: {
      distance_km: 8.5,
      duration_min: 48,
      avg_pace: '5:38 /km',
      avg_hr: 141,
      target_zones: 'Z2 Predominante',
    },
    has_photo: false,
    is_gold_checkin: false,
    gemini_verification_status: 'none',
    xp_awarded: 100,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    reactions: [
      {
        id: 'rea-3',
        checkin_id: 'chk-yesterday-elena',
        user_id: MASTER_ATHLETE_ID,
        emoji: '⚡',
        created_at: new Date(Date.now() - 80000000).toISOString(),
        username: 'alvaro_ironman',
      },
    ],
  },
];

// Helper global para inicializar o acceder al estado social en mockStore
declare global {
  var __ironman_social_store: {
    profiles: UserProfile[];
    groups: SquadGroup[];
    members: SquadMember[];
    checkins: WorkoutCheckIn[];
    badges: AthleteBadge[];
    userBadges: Array<{ user_id: string; badge_id: string; awarded_at: string }>;
  } | undefined;
}

if (!global.__ironman_social_store) {
  global.__ironman_social_store = {
    profiles: [...initialProfiles],
    groups: [...initialGroups],
    members: [...initialGroupMembers],
    checkins: [...initialCheckins],
    badges: [...initialBadges],
    userBadges: [
      { user_id: MASTER_ATHLETE_ID, badge_id: 'streak_7', awarded_at: '2026-09-18T10:00:00Z' },
      { user_id: MASTER_ATHLETE_ID, badge_id: 'gold_proof_1', awarded_at: '2026-09-20T10:00:00Z' },
      { user_id: 'usr-elena-fit-003', badge_id: 'streak_7', awarded_at: '2026-09-18T10:00:00Z' },
    ],
  };
}

const socialStore = global.__ironman_social_store;

// Generador criptográfico de código de invitación de 6 caracteres (ej: 'IRON27')
export function generateInviteCode(prefix = 'IRON'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 2; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${randomPart}`;
}

// --------------------------------------------------------------------
// 1. GESTIÓN DE PERFILES
// --------------------------------------------------------------------
export function getUserProfile(userId: string): UserProfile | null {
  const profile = socialStore.profiles.find((p) => p.id === userId);
  return profile ? { ...profile } : null;
}

export function getUserProfileByUsername(username: string): UserProfile | null {
  const clean = username.replace(/^@/, '').toLowerCase();
  const profile = socialStore.profiles.find((p) => p.username.toLowerCase() === clean);
  return profile ? { ...profile } : null;
}

export function upsertUserProfile(profile: UserProfile): UserProfile {
  const idx = socialStore.profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    socialStore.profiles[idx] = { ...profile, updated_at: new Date().toISOString() };
  } else {
    socialStore.profiles.push({ ...profile, created_at: new Date().toISOString() });
  }
  return { ...profile };
}

// --------------------------------------------------------------------
// 2. GESTIÓN DE GRUPOS / TRIBUS
// --------------------------------------------------------------------
export function getUserGroups(userId: string): SquadGroup[] {
  const memberGroupIds = socialStore.members
    .filter((m) => m.user_id === userId)
    .map((m) => m.group_id);
  
  return socialStore.groups
    .filter((g) => memberGroupIds.includes(g.id))
    .map((g) => ({
      ...g,
      members_count: socialStore.members.filter((m) => m.group_id === g.id).length,
    }));
}

export function getGroupByInviteCode(code: string): SquadGroup | null {
  const clean = code.trim().toUpperCase();
  const group = socialStore.groups.find((g) => g.invite_code === clean);
  if (!group) return null;
  return {
    ...group,
    members_count: socialStore.members.filter((m) => m.group_id === group.id).length,
  };
}

export function createSquadGroup(
  name: string,
  createdBy: string,
  description?: string,
  avatarEmoji = '⚡'
): SquadGroup {
  const inviteCode = generateInviteCode('TR');
  const newGroup: SquadGroup = {
    id: `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: description?.trim(),
    invite_code: inviteCode,
    created_by: createdBy,
    avatar_emoji: avatarEmoji,
    max_members: 15,
    members_count: 1,
    created_at: new Date().toISOString(),
  };

  socialStore.groups.push(newGroup);

  // El creador es miembro 'owner'
  const memberRecord: SquadMember = {
    id: `mem-${Date.now()}`,
    group_id: newGroup.id,
    user_id: createdBy,
    role: 'owner',
    joined_at: new Date().toISOString(),
    group_xp: 0,
    weekly_checkins_count: 0,
  };
  socialStore.members.push(memberRecord);

  return { ...newGroup };
}

export function joinGroupByInviteCode(
  code: string,
  userId: string
): { success: boolean; group?: SquadGroup; error?: string } {
  const group = getGroupByInviteCode(code);
  if (!group) {
    return { success: false, error: 'Código de invitación no válido o inexistente' };
  }

  const isAlreadyMember = socialStore.members.some(
    (m) => m.group_id === group.id && m.user_id === userId
  );
  if (isAlreadyMember) {
    return { success: true, group };
  }

  const currentCount = socialStore.members.filter((m) => m.group_id === group.id).length;
  if (currentCount >= group.max_members) {
    return { success: false, error: 'La tribu ha alcanzado su límite máximo de 15 miembros' };
  }

  socialStore.members.push({
    id: `mem-${Date.now()}`,
    group_id: group.id,
    user_id: userId,
    role: 'member',
    joined_at: new Date().toISOString(),
    group_xp: 0,
    weekly_checkins_count: 0,
  });

  return {
    success: true,
    group: { ...group, members_count: currentCount + 1 },
  };
}

// --------------------------------------------------------------------
// 3. CHECK-INS DE ENTRENAMIENTO & REACCIONES
// --------------------------------------------------------------------
export interface CreateCheckInParams {
  userId: string;
  activityType: CheckInActivityType;
  title: string;
  metrics: CheckInMetricsSummary;
  stravaActivityId?: number | string;
  gymWorkoutDate?: string;
  hasPhoto?: boolean;
  photoUrl?: string;
  isGoldCheckin?: boolean;
  geminiDetectedEquipment?: string;
}

export function registerWorkoutCheckIn(params: CreateCheckInParams): WorkoutCheckIn {
  const baseXP = 100;
  const goldBonusXP = params.isGoldCheckin ? 50 : 0;
  const totalXPAwarded = baseXP + goldBonusXP;

  const todayStr = new Date().toISOString().split('T')[0];

  const checkin: WorkoutCheckIn = {
    id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: params.userId,
    date: todayStr,
    activity_type: params.activityType,
    title: params.title,
    metrics_summary: params.metrics,
    strava_activity_id: params.stravaActivityId,
    gym_workout_date: params.gymWorkoutDate,
    has_photo: Boolean(params.hasPhoto),
    photo_url: params.photoUrl,
    is_gold_checkin: Boolean(params.isGoldCheckin),
    gemini_verification_status: params.isGoldCheckin ? 'verified' : (params.hasPhoto ? 'pending' : 'none'),
    gemini_detected_equipment: params.geminiDetectedEquipment,
    xp_awarded: totalXPAwarded,
    created_at: new Date().toISOString(),
    reactions: [],
  };

  socialStore.checkins.unshift(checkin);

  // Actualizar perfil del atleta: XP, nivel y racha
  const profile = socialStore.profiles.find((p) => p.id === params.userId);
  if (profile) {
    profile.total_xp += totalXPAwarded;
    profile.current_level = Math.floor(profile.total_xp / 100) + 1;
    profile.current_streak_days += 1;
    if (profile.current_streak_days > profile.best_streak_days) {
      profile.best_streak_days = profile.current_streak_days;
    }
  }

  // Actualizar XP en los grupos a los que pertenece
  const userMemberships = socialStore.members.filter((m) => m.user_id === params.userId);
  userMemberships.forEach((m) => {
    m.group_xp += totalXPAwarded;
    m.weekly_checkins_count += 1;
  });

  return { ...checkin };
}

export function toggleCheckInReaction(
  checkinId: string,
  userId: string,
  emoji: ReactionEmoji
): { checkin: WorkoutCheckIn; added: boolean } {
  const checkin = socialStore.checkins.find((c) => c.id === checkinId);
  if (!checkin) {
    throw new Error('Check-in no encontrado');
  }

  if (!checkin.reactions) {
    checkin.reactions = [];
  }

  const existingIdx = checkin.reactions.findIndex(
    (r) => r.user_id === userId && r.emoji === emoji
  );

  let added = false;
  if (existingIdx >= 0) {
    // Si ya existe la reacción exacta, se retira (toggle)
    checkin.reactions.splice(existingIdx, 1);
    added = false;
  } else {
    const userProfile = getUserProfile(userId);
    checkin.reactions.push({
      id: `rea-${Date.now()}`,
      checkin_id: checkinId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
      username: userProfile?.username || 'atleta',
    });
    added = true;
  }

  return { checkin: { ...checkin }, added };
}

// --------------------------------------------------------------------
// 4. FEED DE TRIBU
// --------------------------------------------------------------------
export function getSquadFeed(groupId: string): WorkoutCheckIn[] {
  const memberUserIds = socialStore.members
    .filter((m) => m.group_id === groupId)
    .map((m) => m.user_id);

  const groupCheckins = socialStore.checkins
    .filter((c) => memberUserIds.includes(c.user_id))
    .map((c) => ({
      ...c,
      user: getUserProfile(c.user_id) || undefined,
    }));

  return groupCheckins.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// --------------------------------------------------------------------
// 5. LEADERBOARD SEMANAL DE TRIBU
// --------------------------------------------------------------------
export function getSquadLeaderboard(
  groupId: string,
  currentUserId = MASTER_ATHLETE_ID
): SquadLeaderboardEntry[] {
  const groupMembers = socialStore.members.filter((m) => m.group_id === groupId);

  const entries: SquadLeaderboardEntry[] = groupMembers.map((m) => {
    const profile = getUserProfile(m.user_id);
    const hasGoldThisWeek = socialStore.checkins.some(
      (c) => c.user_id === m.user_id && c.is_gold_checkin
    );

    return {
      rank: 0,
      user_id: m.user_id,
      username: profile?.username || 'atleta',
      display_name: profile?.display_name || 'Compañero',
      avatar_url: profile?.avatar_url,
      weekly_xp: m.group_xp,
      weekly_checkins: m.weekly_checkins_count,
      current_streak: profile?.current_streak_days || 0,
      is_current_user: m.user_id === currentUserId,
      has_gold_this_week: hasGoldThisWeek,
    };
  });

  // Ordenar por XP semanal descendente, luego check-ins, luego racha
  entries.sort((a, b) => {
    if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
    if (b.weekly_checkins !== a.weekly_checkins) return b.weekly_checkins - a.weekly_checkins;
    return b.current_streak - a.current_streak;
  });

  // Asignar rangos (1º, 2º, 3º...)
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}

// --------------------------------------------------------------------
// 6. DTO PÚBLICO NO INTRUSIVO: Perfil de Compañero
// REGLA DE ORO: Jamás incluir calorías, báscula o datos médicos
// --------------------------------------------------------------------
export function getMemberPublicSummary(userId: string): MemberPublicSummary | null {
  const profile = getUserProfile(userId);
  if (!profile) return null;

  // Calcular métricas agregadas de los últimos 7 días
  const userCheckins = socialStore.checkins.filter((c) => c.user_id === userId);

  let weeklyKm = 0;
  let weeklySets = 0;
  let workoutDaysCount = 0;

  userCheckins.forEach((c) => {
    if (c.metrics_summary.distance_km) {
      weeklyKm += c.metrics_summary.distance_km;
    }
    if (c.metrics_summary.volume_sets) {
      weeklySets += c.metrics_summary.volume_sets;
    }
    if (c.activity_type !== 'rest_day') {
      workoutDaysCount += 1;
    }
  });

  const weeklyGoal = profile.weekly_workout_goal || 5;
  const weeklyAdherence = Math.min(100, Math.round((workoutDaysCount / weeklyGoal) * 100));

  const userBadgeIds = socialStore.userBadges
    .filter((ub) => ub.user_id === userId)
    .map((ub) => ub.badge_id);

  const badges = socialStore.badges
    .filter((b) => userBadgeIds.includes(b.id))
    .map((b) => {
      const awarded = socialStore.userBadges.find(
        (ub) => ub.user_id === userId && ub.badge_id === b.id
      );
      return { ...b, unlocked_at: awarded?.awarded_at };
    });

  const recentCheckins = userCheckins.slice(0, 5).map((c) => ({
    id: c.id,
    date: c.date,
    activity_type: c.activity_type,
    title: c.title,
    is_gold_checkin: c.is_gold_checkin,
    photo_url: c.photo_url,
    created_at: c.created_at,
  }));

  // RETORNO ESTRICTO: Cero calorías, cero báscula, cero SpO2
  return {
    user_id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    current_level: profile.current_level,
    total_xp: profile.total_xp,
    current_streak_days: profile.current_streak_days,
    weekly_adherence_pct: weeklyAdherence,
    weekly_km_total: Math.round(weeklyKm * 10) / 10,
    weekly_strength_sets: weeklySets,
    badges_count: badges.length,
    badges,
    recent_checkins: recentCheckins,
  };
}
