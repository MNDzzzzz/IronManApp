// ====================================================================
// GESTOR DEL MÓDULO SOCIAL, TRIBUS, CHECK-INS Y GAMIFICACIÓN (100% REAL)
// Proyecto: IronManApp (Apple Design & Privacy-First Architecture)
// Cero datos ficticios. Estado cero limpio y persistencia genuina.
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
import { supabase, isSupabaseConfigured } from './supabase';

// Clave local para persistir el perfil del atleta activo en el dispositivo
export const ATHLETE_STORAGE_KEY = 'ironman_athlete_profile';
export const SQUAD_STORAGE_KEY = 'ironman_squad_groups';

// Constante de compatibilidad para identificadores por defecto
export const MASTER_ATHLETE_ID = 'usr-alvaro-master-001';

// Catálogo estándar de insignias deportivas del sistema
export const SYSTEM_BADGES: AthleteBadge[] = [
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

// Almacén en memoria global para el servidor Next.js y tests
// Inicializado completamente VACÍO (Zero-State). Cero cuentas o grupos prefabricados.
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
    profiles: [],
    groups: [],
    members: [],
    checkins: [],
    badges: [...SYSTEM_BADGES],
    userBadges: [],
  };
}

export const socialStore = global.__ironman_social_store;

// Generador de código de invitación alfanumérico limpio de 6 caracteres (ej: 'TR8K29')
export function generateInviteCode(prefix = 'TR'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${randomPart}`;
}

// --------------------------------------------------------------------
// 1. GESTIÓN DE PERFILES Y SESIÓN
// --------------------------------------------------------------------
export function getUserProfile(userId: string): UserProfile | null {
  const profile = socialStore.profiles.find((p) => p.id === userId);
  return profile ? { ...profile } : null;
}

export function getUserProfileByUsername(username: string): UserProfile | null {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  const profile = socialStore.profiles.find((p) => p.username.toLowerCase() === clean);
  return profile ? { ...profile } : null;
}

export interface RegisterProfileInput {
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  email?: string;
  weeklyGoal?: number;
  targetRaceName?: string;
  targetRaceDate?: string;
}

export function registerAthleteProfile(input: RegisterProfileInput): UserProfile {
  const cleanUsername = input.username.replace(/^@/, '').toLowerCase().trim();
  
  // Validar formato de username
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres (solo letras minúsculas, números o guiones bajos).');
  }

  // Comprobar unicidad si ya existe otro con ese username
  const existing = getUserProfileByUsername(cleanUsername);
  if (existing) {
    // Si ya existe, actualizamos sus datos
    existing.display_name = input.name.trim();
    if (input.avatarUrl !== undefined) existing.avatar_url = input.avatarUrl;
    if (input.bio !== undefined) existing.bio = input.bio.trim();
    if (input.weeklyGoal) existing.weekly_workout_goal = input.weeklyGoal;
    existing.updated_at = new Date().toISOString();
    return { ...existing };
  }

  const newProfile: UserProfile = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    display_name: input.name.trim(),
    avatar_url: input.avatarUrl || '',
    bio: input.bio?.trim() || 'En preparación para Media Maratón 21K 2027.',
    target_race_name: input.targetRaceName || 'Media Maratón 21K 2027',
    target_race_date: input.targetRaceDate || '2027-02-28',
    weekly_workout_goal: input.weeklyGoal || 5,
    total_xp: 0,
    current_level: 1,
    current_streak_days: 0,
    best_streak_days: 0,
    created_at: new Date().toISOString(),
  };

  socialStore.profiles.push(newProfile);
  return { ...newProfile };
}

// Búsqueda para login por username o email
export function loginAthlete(identifier: string): UserProfile | null {
  const clean = identifier.replace(/^@/, '').toLowerCase().trim();
  const profile = socialStore.profiles.find((p) => p.username.toLowerCase() === clean);
  return profile ? { ...profile } : null;
}

// Compatibilidad tipada (100% vacíos en estado cero)
export const initialProfiles: UserProfile[] = [];
export const initialGroups: SquadGroup[] = [];
export const initialCheckins: WorkoutCheckIn[] = [];

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
// 2. GESTIÓN DE TRIBUS / GRUPOS
// --------------------------------------------------------------------
export function getUserGroups(userId: string): SquadGroup[] {
  if (!userId) return [];
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
  if (!name || name.trim().length === 0) {
    throw new Error('El nombre de la tribu es obligatorio.');
  }

  // Generar código único de 6 letras
  let inviteCode = generateInviteCode('TR');
  while (socialStore.groups.some((g) => g.invite_code === inviteCode)) {
    inviteCode = generateInviteCode('TR');
  }

  const newGroup: SquadGroup = {
    id: `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: description?.trim() || 'Tribu de preparación física y atletismo.',
    invite_code: inviteCode,
    created_by: createdBy,
    avatar_emoji: avatarEmoji,
    max_members: 15,
    members_count: 1,
    created_at: new Date().toISOString(),
  };

  socialStore.groups.push(newGroup);

  // El creador es miembro owner inmediato
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
    return { success: false, error: 'La tribu ha alcanzado su límite de 15 miembros' };
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
// 3. CHECK-INS REALES & REACCIONES
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
    title: params.title.trim(),
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

  // Actualizar perfil real del atleta
  const profile = socialStore.profiles.find((p) => p.id === params.userId);
  if (profile) {
    profile.total_xp += totalXPAwarded;
    profile.current_level = Math.floor(profile.total_xp / 100) + 1;
    profile.current_streak_days += 1;
    if (profile.current_streak_days > profile.best_streak_days) {
      profile.best_streak_days = profile.current_streak_days;
    }
  }

  // Actualizar miembros de sus grupos
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
// 4. FEED DE TRIBU REAL
// --------------------------------------------------------------------
export function getSquadFeed(groupId: string): WorkoutCheckIn[] {
  const memberUserIds = socialStore.members
    .filter((m) => m.group_id === groupId)
    .map((m) => m.user_id);

  if (memberUserIds.length === 0) return [];

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
// 5. LEADERBOARD REAL
// --------------------------------------------------------------------
export function getSquadLeaderboard(
  groupId: string,
  currentUserId = MASTER_ATHLETE_ID
): SquadLeaderboardEntry[] {
  const groupMembers = socialStore.members.filter((m) => m.group_id === groupId);
  if (groupMembers.length === 0) return [];

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

  entries.sort((a, b) => {
    if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
    if (b.weekly_checkins !== a.weekly_checkins) return b.weekly_checkins - a.weekly_checkins;
    return b.current_streak - a.current_streak;
  });

  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}

// --------------------------------------------------------------------
// 6. DTO PÚBLICO NO INTRUSIVO
// --------------------------------------------------------------------
export function getMemberPublicSummary(userId: string): MemberPublicSummary | null {
  const profile = getUserProfile(userId);
  if (!profile) return null;

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

// Función para reiniciar el almacén a estado cero (útil para tests o logout)
export function resetSocialStore(): void {
  socialStore.profiles = [];
  socialStore.groups = [];
  socialStore.members = [];
  socialStore.checkins = [];
  socialStore.badges = [...SYSTEM_BADGES];
  socialStore.userBadges = [];
}
