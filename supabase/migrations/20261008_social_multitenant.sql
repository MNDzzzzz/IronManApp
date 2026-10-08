-- ====================================================================
-- MIGRACIÓN MULTITENANT, SOCIAL, CHECK-INS Y GAMIFICACIÓN: IronManApp
-- Fecha: 2026-10-08
-- Arquitectura: Supabase Auth + RLS Hermético + Proyecciones de Tribu
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE PERFILES ATLÉTICOS (Vinculada 1:1 con auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- Trigger para creación automática de perfil al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'atleta_' || substr(new.id::text, 1, 8)),
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. GRUPOS / TRIBUS SOCIALES
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    avatar_emoji TEXT DEFAULT '⚡',
    max_members INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups (invite_code);

-- 3. MIEMBROS DE GRUPO
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    group_xp INTEGER DEFAULT 0,
    weekly_checkins_count INTEGER DEFAULT 0,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_lookup ON group_members (group_id, user_id);

-- 4. CHECK-INS DE ENTRENAMIENTO (Polimórficos)
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('running', 'strength', 'hybrid', 'rest_day')),
    strava_activity_id BIGINT,
    gym_workout_date DATE,
    title TEXT NOT NULL,
    metrics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    has_photo BOOLEAN DEFAULT false,
    photo_url TEXT,
    is_gold_checkin BOOLEAN DEFAULT false,
    gemini_verification_status TEXT DEFAULT 'none' CHECK (gemini_verification_status IN ('none', 'pending', 'verified', 'rejected')),
    gemini_detected_equipment TEXT,
    xp_awarded INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_date_user ON checkins (date DESC, user_id);

-- 5. REACCIONES HÁPTICAS EN EL FEED
CREATE TABLE IF NOT EXISTS checkin_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '⚡', '👑', '🫡')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(checkin_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_checkin_reactions ON checkin_reactions (checkin_id);

-- 6. MEDALLAS E INSIGNIAS (BADGES)
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Inserción de catálogo base de medallas
INSERT INTO badges (id, title, description, icon_name, category)
VALUES
    ('streak_7', 'Disciplina de Hierro', 'Completar 7 días consecutivos de check-in activo.', 'Flame', 'streak'),
    ('streak_30', 'Mes Imparable', 'Completar 30 días ininterrumpidos de disciplina.', 'Crown', 'streak'),
    ('gold_proof_1', 'Bautismo de Oro', 'Primer check-in verificado con foto de máquina en el gimnasio.', 'Sparkles', 'strength'),
    ('gold_proof_10', 'Veterano de la Sala', '10 check-ins con foto de máquina validados por IA.', 'Dumbbell', 'strength'),
    ('sub_5_pace', 'Velocidad Punta', 'Registrar un tramo o carrera con ritmo inferior a 5:00 min/km.', 'Zap', 'running'),
    ('half_marathon_ready', 'Espíritu 21K', 'Acumular más de 20 km en una sola semana de preparación.', 'Trophy', 'running')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- MIGRACIÓN DE TABLAS HISTÓRICAS A MULTI-TENANT
-- ====================================================================
ALTER TABLE daily_health_metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE heart_rate_samples ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE strava_activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE gym_workout_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE water_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE routine_day_overrides ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE nutrition_adaptations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE user_frequent_foods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS DE PERFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- POLÍTICAS RLS DE AISLAMIENTO PRIVADO (Tolerancia Cero a IDOR)
CREATE POLICY "strava_own" ON strava_activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gym_own" ON gym_workout_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "nutrition_own" ON nutrition_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weight_own" ON weight_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "health_own" ON daily_health_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "water_own" ON water_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "frequent_foods_own" ON user_frequent_foods FOR ALL USING (auth.uid() = user_id);

-- POLÍTICAS RLS PARA CHECK-INS SOCIALES
CREATE POLICY "checkins_shared_groups_select" ON checkins FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = checkins.user_id
    )
);

CREATE POLICY "checkins_insert_own" ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkins_update_own" ON checkins FOR UPDATE USING (auth.uid() = user_id);

-- POLÍTICAS RLS PARA REACCIONES
CREATE POLICY "reactions_select_shared" ON checkin_reactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM checkins c
        WHERE c.id = checkin_reactions.checkin_id
    )
);

CREATE POLICY "reactions_manage_own" ON checkin_reactions FOR ALL USING (auth.uid() = user_id);
