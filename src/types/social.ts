// ====================================================================
// TIPOS DE DATOS: MÓDULO SOCIAL, TRIBUS, CHECK-INS Y GAMIFICACIÓN
// Proyecto: IronManApp (Apple Design & Clean Architecture)
// ====================================================================

export interface UserProfile {
  id: string; // UUID de auth.users
  username: string; // ej: 'alvaro_ironman' (sin arroba en base de datos)
  display_name: string; // ej: 'Álvaro'
  email?: string;
  avatar_url?: string;
  bio?: string;
  target_race_name: string; // ej: 'Media Maratón 21K 2027'
  target_race_date: string; // YYYY-MM-DD
  weekly_workout_goal: number; // Días meta de entreno por semana (ej: 5)
  total_xp: number; // Puntos de experiencia acumulados
  current_level: number; // Nivel atlético (ej: 14)
  current_streak_days: number; // Racha actual de días consecutivos
  best_streak_days: number; // Mejor racha histórica
  created_at: string;
  updated_at?: string;
}

export interface SquadGroup {
  id: string;
  name: string;
  description?: string;
  invite_code: string; // Código de 6 letras (ej: 'IRON27')
  created_by?: string;
  avatar_emoji: string; // Emoji representativo de la tribu (ej: '⚡', '🔥', '👑')
  max_members: number; // Capacidad máxima del grupo (ej: 15)
  members_count?: number;
  created_at: string;
}

export type SquadRole = 'owner' | 'admin' | 'member';

export interface SquadMember {
  id: string;
  group_id: string;
  user_id: string;
  role: SquadRole;
  joined_at: string;
  group_xp: number;
  weekly_checkins_count: number;
  profile?: UserProfile;
}

export type CheckInActivityType = 'running' | 'strength' | 'hybrid' | 'rest_day';

export interface CheckInMetricsSummary {
  distance_km?: number;
  duration_min?: number;
  avg_pace?: string; // ej: "5:32 /km"
  avg_hr?: number;
  target_zones?: string; // ej: "Z2 Predominante"
  volume_sets?: number; // Series de fuerza completadas
  muscle_groups?: string[]; // ej: ["Pecho", "Espalda"]
  notes?: string;
}

export type GeminiVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface WorkoutCheckIn {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  activity_type: CheckInActivityType;
  title: string; // ej: 'Rodaje 10K Z2' o 'Torso Hipertrofia (16 series)'
  metrics_summary: CheckInMetricsSummary;
  
  // Referencias locales
  strava_activity_id?: number | string;
  gym_workout_date?: string;
  
  // Verificación fotográfica / Proof of Workout
  has_photo: boolean;
  photo_url?: string;
  is_gold_checkin: boolean; // True si incluye foto válida de gimnasio
  gemini_verification_status: GeminiVerificationStatus;
  gemini_detected_equipment?: string; // ej: 'Prensa de piernas / Mancuernas'
  
  xp_awarded: number;
  created_at: string;
  reactions?: CheckInReaction[];
  user?: UserProfile;
}

export type ReactionEmoji = '🔥' | '💪' | '⚡' | '👑' | '🫡';

export interface CheckInReaction {
  id: string;
  checkin_id: string;
  user_id: string;
  emoji: ReactionEmoji;
  created_at: string;
  username?: string;
}

export interface AthleteBadge {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  category: 'streak' | 'strength' | 'running' | 'community';
  unlocked_at?: string;
}

// --------------------------------------------------------------------
// DTO PÚBLICO NO INTRUSIVO: Resumen seguro de un compañero de tribu
// Regla de Oro Apple: Jamás exponer calorías, báscula o datos médicos
// --------------------------------------------------------------------
export interface MemberPublicSummary {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  current_level: number;
  total_xp: number;
  current_streak_days: number;
  weekly_adherence_pct: number; // 0-100% de cumplimiento vs objetivo semanal
  weekly_km_total: number; // Km totales de carrera esta semana
  weekly_strength_sets: number; // Series de gimnasio completadas
  badges_count: number;
  badges: AthleteBadge[];
  recent_checkins: Array<{
    id: string;
    date: string;
    activity_type: CheckInActivityType;
    title: string;
    is_gold_checkin: boolean;
    photo_url?: string;
    created_at: string;
  }>;
}

// Clasificación de la tribu
export interface SquadLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  weekly_xp: number;
  weekly_checkins: number;
  current_streak: number;
  is_current_user: boolean;
  has_gold_this_week: boolean;
}
