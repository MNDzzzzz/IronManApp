// Tipos de datos de la base de datos y modelos del dominio para IronManApp

export interface DailyHealthMetric {
  id: string;
  date: string; // YYYY-MM-DD
  resting_hr: number | null;
  sleep_duration_minutes: number | null;
  sleep_score: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  spo2_avg: number | null;
  spo2_min: number | null;
  total_steps: number;
  active_calories: number;
  synced_at?: string;
}

export interface HeartRateSample {
  id?: number;
  timestamp: string; // ISO 8601
  bpm: number;
  source?: string;
}

export interface StreamDataPoint {
  time: number; // Segundos desde el inicio
  lat?: number;
  lng?: number;
  altitude?: number;
  velocity_smooth?: number; // m/s
  pace_min_km?: number; // min/km
  bpm?: number; // Pulso inyectado de la Galaxy Fit3
  zone?: string; // Z1, Z2, Z3, Z4, Z5
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number; // en metros
  total_elevation_gain: number;
  summary_polyline?: string;
  streams_data?: StreamDataPoint[];
  merged_hr_data?: StreamDataPoint[];
  avg_hr?: number | null;
  max_hr?: number | null;
  created_at?: string;
}

export interface GymExercise {
  id: string;
  name: string;
  category: 'Pecho' | 'Espalda' | 'Pierna' | 'Hombro' | 'Brazo' | 'Core';
  is_stretch: boolean;
  day?: 'Día 1: Torso' | 'Día 2: Pierna' | 'Día 3: Full Body';
  target_sets?: number;
  target_reps?: string;
  current_weight_kg?: number;
  rest_time?: string;
  notes?: string;
}

export interface GymWorkoutLog {
  id: string;
  date: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
  exercise?: GymExercise;
  created_at?: string;
}

export interface NutritionLog {
  id: string;
  timestamp: string;
  date: string;
  meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack' | 'PESO_CORPORAL';
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  raw_audio_transcription?: string;
}

export interface WaterLog {
  id: string;
  timestamp: string;
  date: string;
  amount_ml: number;
}

export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  weight_kg: number;
  notes?: string;
  created_at?: string;
}

// Payload recibido desde el Android Puente (Health Connect)
export interface BridgeSyncPayload {
  device: string;
  synced_at: string;
  daily_metric?: Partial<DailyHealthMetric>;
  heart_rate_samples?: Array<{
    timestamp: string;
    bpm: number;
  }>;
}

// Payload recibido desde Webhook de Strava
export interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number; // ID de la actividad
  object_type: 'activity' | 'athlete';
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, unknown>;
}
