-- ====================================================================
-- ESQUEMA SQL DEFINITIVO E IDEMPOTENTE PARA SUPABASE:
-- MÓDULOS DE USUARIOS, TRIBUS, CHECK-INS, GAMIFICACIÓN Y TELEMETRÍA
-- Proyecto: IronManApp (QCFit / OutfitBuilder Architecture)
-- Instrucciones: Abre tu panel de Supabase -> SQL Editor -> Pega todo este código -> Pulsa "Run"
-- ====================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. TABLA: PROFILES (Perfiles de Atletas y Usuarios)
-- Soporta tanto IDs locales ('usr-...') como UUIDs de Supabase Auth
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    target_race_name TEXT DEFAULT 'Media Maratón 21K 2027',
    target_race_date DATE DEFAULT '2027-02-28',
    weekly_workout_goal INTEGER DEFAULT 5,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak_days INTEGER DEFAULT 0,
    best_streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- --------------------------------------------------------------------
-- 2. TABLA: GROUPS (Tribus y Grupos de Rendimiento)
-- Capacidad de hasta 15 atletas con código de invitación único
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    avatar_emoji TEXT DEFAULT '⚡',
    max_members INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups (invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups (created_by);

-- --------------------------------------------------------------------
-- 3. TABLA: GROUP_MEMBERS (Membresías de Tribu)
-- Relación N:M entre Atletas y Tribus
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT now(),
    group_xp INTEGER DEFAULT 0,
    weekly_checkins_count INTEGER DEFAULT 0,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);

-- --------------------------------------------------------------------
-- 4. TABLA: CHECKINS (Check-ins Diarios de Entrenamiento)
-- Validaciones de Running, Fuerza y Check-in de Oro con foto
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT NOT NULL,
    strava_activity_id BIGINT,
    gym_workout_date DATE,
    title TEXT NOT NULL,
    metrics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    has_photo BOOLEAN DEFAULT false,
    photo_url TEXT,
    is_gold_checkin BOOLEAN DEFAULT false,
    gemini_verification_status TEXT DEFAULT 'none',
    gemini_detected_equipment TEXT,
    xp_awarded INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.checkins (date DESC);

-- --------------------------------------------------------------------
-- 5. TABLA: CHECKIN_REACTIONS (Reacciones Hápticas del Feed)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkin_reactions (
    id TEXT PRIMARY KEY,
    checkin_id TEXT NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(checkin_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_checkin_reactions_checkin ON public.checkin_reactions (checkin_id);

-- --------------------------------------------------------------------
-- 6. TABLA: BADGES & USER_BADGES (Medallas y Vitrina de Logros)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges (user_id);

-- Inserción de Medallas Iniciales
INSERT INTO public.badges (id, title, description, icon_name, category)
VALUES
    ('streak_7', 'Disciplina de Hierro', 'Completar 7 días consecutivos de check-in activo.', 'Flame', 'streak'),
    ('streak_30', 'Mes Imparable', 'Completar 30 días ininterrumpidos de disciplina.', 'Crown', 'streak'),
    ('gold_proof_1', 'Bautismo de Oro', 'Primer check-in verificado con foto de máquina en el gimnasio.', 'Sparkles', 'strength'),
    ('gold_proof_10', 'Veterano de la Sala', '10 check-ins con foto de máquina validados por IA.', 'Dumbbell', 'strength'),
    ('sub_5_pace', 'Velocidad Punta', 'Registrar un tramo o carrera con ritmo inferior a 5:00 min/km.', 'Zap', 'running'),
    ('half_marathon_ready', 'Espíritu 21K', 'Acumular más de 20 km en una sola semana de preparación.', 'Trophy', 'running')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 7. TABLAS DE TELEMETRÍA (Soporte Multi-tenant con user_id)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_health_metrics (
    date DATE PRIMARY KEY,
    resting_hr INTEGER,
    hrv_rmssd INTEGER,
    sleep_score INTEGER,
    sleep_hours NUMERIC,
    stress_level INTEGER,
    steps INTEGER,
    active_calories INTEGER,
    total_calories INTEGER,
    water_ml INTEGER,
    body_battery INTEGER,
    recovery_score INTEGER,
    readiness_score INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.daily_health_metrics ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.strava_activities (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    elapsed_time INTEGER NOT NULL,
    moving_time INTEGER NOT NULL,
    distance NUMERIC NOT NULL,
    total_elevation_gain NUMERIC DEFAULT 0,
    avg_hr INTEGER,
    max_hr INTEGER,
    summary_polyline TEXT,
    streams_data JSONB,
    merged_hr_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.strava_activities ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.gym_workout_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    day_name TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg NUMERIC NOT NULL,
    reps INTEGER NOT NULL,
    rir INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.gym_workout_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC NOT NULL,
    carbs_g NUMERIC NOT NULL,
    fat_g NUMERIC NOT NULL,
    meal_type TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.water_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    weight_kg NUMERIC NOT NULL,
    body_fat_pct NUMERIC,
    muscle_mass_kg NUMERIC,
    water_pct NUMERIC,
    visceral_fat INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT
);
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- --------------------------------------------------------------------
-- 8. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Políticas abiertas y seguras para web y service_role
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Políticas universales para anon y authenticated
DROP POLICY IF EXISTS "profiles_policy_all" ON public.profiles;
CREATE POLICY "profiles_policy_all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "groups_policy_all" ON public.groups;
CREATE POLICY "groups_policy_all" ON public.groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "group_members_policy_all" ON public.group_members;
CREATE POLICY "group_members_policy_all" ON public.group_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "checkins_policy_all" ON public.checkins;
CREATE POLICY "checkins_policy_all" ON public.checkins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "checkin_reactions_policy_all" ON public.checkin_reactions;
CREATE POLICY "checkin_reactions_policy_all" ON public.checkin_reactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "badges_policy_all" ON public.badges;
CREATE POLICY "badges_policy_all" ON public.badges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_badges_policy_all" ON public.user_badges;
CREATE POLICY "user_badges_policy_all" ON public.user_badges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "daily_health_metrics_policy_all" ON public.daily_health_metrics;
CREATE POLICY "daily_health_metrics_policy_all" ON public.daily_health_metrics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "strava_activities_policy_all" ON public.strava_activities;
CREATE POLICY "strava_activities_policy_all" ON public.strava_activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "gym_workout_logs_policy_all" ON public.gym_workout_logs;
CREATE POLICY "gym_workout_logs_policy_all" ON public.gym_workout_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "nutrition_logs_policy_all" ON public.nutrition_logs;
CREATE POLICY "nutrition_logs_policy_all" ON public.nutrition_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "water_logs_policy_all" ON public.water_logs;
CREATE POLICY "water_logs_policy_all" ON public.water_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "weight_logs_policy_all" ON public.weight_logs;
CREATE POLICY "weight_logs_policy_all" ON public.weight_logs FOR ALL USING (true) WITH CHECK (true);

-- Permisos explícitos a roles de Supabase
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ====================================================================
-- FIN DEL SCRIPT SQL DE SUPABASE
-- ====================================================================
