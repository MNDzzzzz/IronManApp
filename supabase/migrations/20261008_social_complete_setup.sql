-- ====================================================================
-- ESQUEMA COMPLETO PARA SUPABASE: MÓDULOS DE USUARIOS, TRIBUS Y SOCIAL
-- Proyecto: IronManApp (IronMan Lab / QCFit)
-- Fecha: 2026-10-08
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- Habilitar extensión criptográfica para generación de IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. TABLA: PROFILES (Perfiles de Atletas y Usuarios)
-- Soporta tanto IDs de la aplicación como UUIDs de Supabase Auth
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
-- Grupos cerrados de hasta 15 atletas con código de invitación único
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
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
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
    activity_type TEXT NOT NULL CHECK (activity_type IN ('running', 'strength', 'hybrid', 'rest_day')),
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
-- Emojis permitidos: 🔥, 💪, ⚡, 👑, 🫡
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkin_reactions (
    id TEXT PRIMARY KEY,
    checkin_id TEXT NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '⚡', '👑', '🫡')),
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

-- Inserción de Medallas Iniciales del Sistema
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
-- 7. VINCULACIÓN MULTI-TENANT CON TABLAS EXISTENTES
-- Añade de forma segura la columna user_id si no existe
-- --------------------------------------------------------------------
ALTER TABLE public.daily_health_metrics ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.strava_activities ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.gym_workout_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.weight_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- --------------------------------------------------------------------
-- 8. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Permitir lectura y escritura transparente para el Service Role y Web
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso para Profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
CREATE POLICY "profiles_insert_all" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
CREATE POLICY "profiles_update_all" ON public.profiles FOR UPDATE USING (true);

-- Políticas de Acceso para Groups
DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all" ON public.groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "groups_insert_all" ON public.groups;
CREATE POLICY "groups_insert_all" ON public.groups FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "groups_update_all" ON public.groups;
CREATE POLICY "groups_update_all" ON public.groups FOR UPDATE USING (true);

-- Políticas de Acceso para Group Members
DROP POLICY IF EXISTS "group_members_select_all" ON public.group_members;
CREATE POLICY "group_members_select_all" ON public.group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_members_insert_all" ON public.group_members;
CREATE POLICY "group_members_insert_all" ON public.group_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "group_members_delete_all" ON public.group_members;
CREATE POLICY "group_members_delete_all" ON public.group_members FOR DELETE USING (true);

-- Políticas de Acceso para Checkins
DROP POLICY IF EXISTS "checkins_select_all" ON public.checkins;
CREATE POLICY "checkins_select_all" ON public.checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "checkins_insert_all" ON public.checkins;
CREATE POLICY "checkins_insert_all" ON public.checkins FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "checkins_update_all" ON public.checkins;
CREATE POLICY "checkins_update_all" ON public.checkins FOR UPDATE USING (true);

-- Políticas de Acceso para Reactions
DROP POLICY IF EXISTS "checkin_reactions_all" ON public.checkin_reactions;
CREATE POLICY "checkin_reactions_all" ON public.checkin_reactions FOR ALL USING (true);

-- Políticas de Acceso para Badges
DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_badges_all" ON public.user_badges;
CREATE POLICY "user_badges_all" ON public.user_badges FOR ALL USING (true);

-- ====================================================================
-- FIN DEL SCRIPT SQL DE SUPABASE
-- ====================================================================
