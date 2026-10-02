-- ====================================================================
-- ESQUEMA DE BASE DE DATOS: IronManApp (Supabase PostgreSQL)
-- Especialista: Database & Security Architect (Skill: supabase-postgres-expert)
-- ====================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MÉTRICAS DIARIAS CONSOLIDADAS (Galaxy Fit3 -> Health Connect)
CREATE TABLE IF NOT EXISTS daily_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    resting_hr INTEGER, -- Pulsaciones en reposo (bpm)
    sleep_duration_minutes INTEGER, -- Minutos totales de sueño
    sleep_score INTEGER, -- Puntuación de calidad (0-100)
    deep_sleep_minutes INTEGER, -- Minutos de sueño profundo
    rem_sleep_minutes INTEGER, -- Minutos de sueño REM
    light_sleep_minutes INTEGER, -- Minutos de sueño ligero
    awake_minutes INTEGER, -- Minutos despierto en cama
    spo2_avg NUMERIC(4,1), -- Promedio de oxígeno en sangre (%)
    spo2_min NUMERIC(4,1), -- Mínimo de oxígeno en sangre registrado
    total_steps INTEGER DEFAULT 0, -- Pasos totales del día
    active_calories INTEGER DEFAULT 0, -- Calorías quemadas activas (kcal)
    synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_health_date ON daily_health_metrics (date DESC);

-- 2. MUESTRAS DETALLADAS DE RITMO CARDÍACO (Series temporales)
CREATE TABLE IF NOT EXISTS heart_rate_samples (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    bpm INTEGER NOT NULL,
    source TEXT DEFAULT 'galaxy_fit3'
);

CREATE INDEX IF NOT EXISTS idx_hr_timestamp ON heart_rate_samples (timestamp DESC);

-- 3. ACTIVIDADES DE STRAVA Y FUSIÓN CON FIT3
CREATE TABLE IF NOT EXISTS strava_activities (
    id BIGINT PRIMARY KEY, -- ID único de actividad de Strava
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Run', 'Walk', 'Ride', etc.
    start_date TIMESTAMPTZ NOT NULL,
    elapsed_time INTEGER NOT NULL, -- Segundos transcurridos
    moving_time INTEGER NOT NULL, -- Segundos en movimiento
    distance NUMERIC(10,2) NOT NULL, -- Metros
    total_elevation_gain NUMERIC(6,1) DEFAULT 0, -- Metros de ascenso
    summary_polyline TEXT, -- Polilínea codificada para mapa
    streams_data JSONB, -- [time, latlng, altitude, velocity_smooth]
    merged_hr_data JSONB, -- [{time, bpm, zone}] fusionado de Fit3
    avg_hr INTEGER, -- Pulso medio calculado tras fusión
    max_hr INTEGER, -- Pulso máximo calculado tras fusión
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strava_start_date ON strava_activities (start_date DESC);

-- 4. RUTINAS Y PROGRESIÓN DE FUERZA (Gimnasio)
CREATE TABLE IF NOT EXISTS gym_exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazo', 'Core'
    is_stretch BOOLEAN DEFAULT false, -- True para estiramientos/movilidad
    day TEXT, -- 'Día 1: Torso', 'Día 2: Pierna', 'Día 3: Full Body'
    target_sets INTEGER DEFAULT 3,
    target_reps TEXT,
    current_weight_kg NUMERIC(5,2),
    rest_time TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS gym_workout_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    exercise_id TEXT REFERENCES gym_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    rpe NUMERIC(3,1), -- Escala de esfuerzo percibido 1-10 (ej: 8.5)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_logs_date ON gym_workout_logs (date DESC);
CREATE INDEX IF NOT EXISTS idx_gym_logs_exercise ON gym_workout_logs (exercise_id);

-- 5. NUTRICIÓN E HIDRATACIÓN (Vía Bot de Telegram y Web)
CREATE TABLE IF NOT EXISTS nutrition_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT, -- 'Desayuno', 'Almuerzo', 'Cena', 'Snack'
    description TEXT NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,1) DEFAULT 0,
    carbs_g NUMERIC(5,1) DEFAULT 0,
    fat_g NUMERIC(5,1) DEFAULT 0,
    raw_audio_transcription TEXT
);

CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_logs (date DESC);

CREATE TABLE IF NOT EXISTS water_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_ml INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs (date DESC);

-- 6. SEGUIMIENTO DE PESO CORPORAL (Pesajes diarios / antes de cenar)
CREATE TABLE IF NOT EXISTS weight_logs (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    weight_kg NUMERIC(5,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_logs (date DESC);

-- 7. CALENDARIO MODULAR Y REASIGNACIONES DE ENTRENAMIENTO (Overrides)
CREATE TABLE IF NOT EXISTS routine_day_overrides (
    id TEXT PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    routine_key TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Fuerza', 'Cardio', 'Descanso'
    day_type TEXT NOT NULL, -- 'strength', 'running', 'rest_refeed'
    description TEXT,
    target_steps_min INTEGER,
    target_steps_max INTEGER,
    custom_exercises JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_overrides_date ON routine_day_overrides (date DESC);

-- 8. ADAPTACIONES NUTRICIONALES SEMANALES POR IA
CREATE TABLE IF NOT EXISTS nutrition_adaptations (
    id TEXT PRIMARY KEY,
    week_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,1) NOT NULL,
    carbs_g NUMERIC(5,1) NOT NULL,
    fat_g NUMERIC(5,1) NOT NULL,
    water_ml INTEGER NOT NULL,
    reason TEXT NOT NULL,
    applied BOOLEAN DEFAULT true,
    applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_adaptations_week ON nutrition_adaptations (week_number DESC);

-- 9. SEGURIDAD Y POLÍTICAS RLS (Row Level Security)
ALTER TABLE daily_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_day_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_adaptations ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura completa con Service Role o clave maestra
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_daily_health') THEN
        CREATE POLICY service_role_all_daily_health ON daily_health_metrics FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_hr_samples') THEN
        CREATE POLICY service_role_all_hr_samples ON heart_rate_samples FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_strava') THEN
        CREATE POLICY service_role_all_strava ON strava_activities FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_gym_exercises') THEN
        CREATE POLICY service_role_all_gym_exercises ON gym_exercises FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_gym_logs') THEN
        CREATE POLICY service_role_all_gym_logs ON gym_workout_logs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_nutrition') THEN
        CREATE POLICY service_role_all_nutrition ON nutrition_logs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_water') THEN
        CREATE POLICY service_role_all_water ON water_logs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_weight') THEN
        CREATE POLICY service_role_all_weight ON weight_logs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_routine_overrides') THEN
        CREATE POLICY service_role_all_routine_overrides ON routine_day_overrides FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_nutrition_adaptations') THEN
        CREATE POLICY service_role_all_nutrition_adaptations ON nutrition_adaptations FOR ALL USING (true);
    END IF;
END $$;
