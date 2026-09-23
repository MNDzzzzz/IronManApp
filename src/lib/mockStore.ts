// Repositorio de datos simulados y persistencia en memoria
// Permite que la aplicación funcione y muestre datos completos de inmediato
import {
  DailyHealthMetric,
  HeartRateSample,
  StravaActivity,
  GymExercise,
  GymWorkoutLog,
  NutritionLog,
  WaterLog,
  StreamDataPoint,
} from '@/types/database';
import { mergeStravaWithFit3HeartRate } from './merging/temporalAligner';

const today = new Date().toISOString().split('T')[0];

export const initialGymExercises: GymExercise[] = [
  { id: 'ex-1', name: 'Press de Banca con Barra', category: 'Pecho', is_stretch: false },
  { id: 'ex-2', name: 'Dominadas Pronas / Jalón al Pecho', category: 'Espalda', is_stretch: false },
  { id: 'ex-3', name: 'Sentadilla Trasera con Barra', category: 'Pierna', is_stretch: false },
  { id: 'ex-4', name: 'Press Militar con Mancuernas', category: 'Hombro', is_stretch: false },
  { id: 'ex-5', name: 'Peso Muerto Rumano', category: 'Pierna', is_stretch: false },
  { id: 'ex-6', name: 'Curl de Bíceps con Barra Z', category: 'Brazo', is_stretch: false },
  { id: 'ex-7', name: 'Fondos en Paralelas / Dips', category: 'Pecho', is_stretch: false },
  { id: 'ex-8', name: 'Estiramiento Pectoral en Pared', category: 'Pecho', is_stretch: true },
  { id: 'ex-9', name: 'Estiramiento Isquiotibiales y Cadera 90/90', category: 'Pierna', is_stretch: true },
  { id: 'ex-10', name: 'Movilidad Torácica Cat-Cow', category: 'Core', is_stretch: true },
];

export const initialGymLogs: GymWorkoutLog[] = [
  { id: 'log-1', date: today, exercise_id: 'ex-1', set_number: 1, reps: 10, weight_kg: 70, rpe: 7 },
  { id: 'log-2', date: today, exercise_id: 'ex-1', set_number: 2, reps: 8, weight_kg: 80, rpe: 8 },
  { id: 'log-3', date: today, exercise_id: 'ex-1', set_number: 3, reps: 6, weight_kg: 85, rpe: 9 },
  { id: 'log-4', date: today, exercise_id: 'ex-2', set_number: 1, reps: 10, weight_kg: 0, rpe: 7 },
  { id: 'log-5', date: today, exercise_id: 'ex-2', set_number: 2, reps: 8, weight_kg: 10, rpe: 8 },
  { id: 'log-6', date: today, exercise_id: 'ex-3', set_number: 1, reps: 8, weight_kg: 90, rpe: 7 },
  { id: 'log-7', date: today, exercise_id: 'ex-3', set_number: 2, reps: 8, weight_kg: 100, rpe: 8.5 },
];

export const initialDailyMetrics: DailyHealthMetric[] = [
  {
    id: 'health-today',
    date: today,
    resting_hr: 52,
    sleep_duration_minutes: 465, // 7h 45m
    sleep_score: 88,
    deep_sleep_minutes: 95,
    rem_sleep_minutes: 110,
    light_sleep_minutes: 230,
    awake_minutes: 30,
    spo2_avg: 97.4,
    spo2_min: 94.0,
    total_steps: 11450,
    active_calories: 680,
    synced_at: new Date().toISOString(),
  },
  {
    id: 'health-yesterday',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    resting_hr: 54,
    sleep_duration_minutes: 420, // 7h 00m
    sleep_score: 79,
    deep_sleep_minutes: 75,
    rem_sleep_minutes: 90,
    light_sleep_minutes: 220,
    awake_minutes: 35,
    spo2_avg: 96.8,
    spo2_min: 93.5,
    total_steps: 9800,
    active_calories: 520,
    synced_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const initialNutritionLogs: NutritionLog[] = [
  {
    id: 'nutri-1',
    date: today,
    timestamp: `${today}T08:30:00Z`,
    meal_type: 'Desayuno',
    description: 'Tortilla de 3 huevos con espinacas y 2 rebanadas de pan integral con aceite de oliva',
    calories: 480,
    protein_g: 28,
    carbs_g: 35,
    fat_g: 24,
    raw_audio_transcription: 'Audio de Telegram: 3 huevos en tortilla con espinacas y dos tostadas integrales con aceite',
  },
  {
    id: 'nutri-2',
    date: today,
    timestamp: `${today}T14:15:00Z`,
    meal_type: 'Almuerzo',
    description: '220g de salmón al horno con 200g de patata asada y ensalada mixta',
    calories: 680,
    protein_g: 48,
    carbs_g: 45,
    fat_g: 32,
    raw_audio_transcription: 'Audio de Telegram: Salmón con patata asada y ensalada',
  },
];

export const initialWaterLogs: WaterLog[] = [
  { id: 'water-1', date: today, timestamp: `${today}T09:00:00Z`, amount_ml: 500 },
  { id: 'water-2', date: today, timestamp: `${today}T12:30:00Z`, amount_ml: 500 },
  { id: 'water-3', date: today, timestamp: `${today}T15:00:00Z`, amount_ml: 750 },
  { id: 'water-4', date: today, timestamp: `${today}T18:30:00Z`, amount_ml: 500 },
];

// Generar una carrera de Strava realista con elevación, velocidad y pulso Fit3 superpuesto
function generateSampleRun(): StravaActivity {
  const runStartTime = `${today}T18:00:00Z`;
  const durationSeconds = 1800; // 30 minutos de carrera
  const baseLat = 40.4168; // Madrid
  const baseLng = -3.7038;

  const rawStreams: StreamDataPoint[] = [];
  const fit3Samples: HeartRateSample[] = [];

  for (let s = 0; s < durationSeconds; s += 10) {
    const progress = s / durationSeconds;
    // Simular subida y bajada de colina
    const altitude = 650 + Math.sin(progress * Math.PI) * 45 + Math.cos(progress * 4) * 5;
    // Velocidad variable en m/s (3.3 m/s = 5:03 min/km)
    const velocity = 3.3 + Math.sin(progress * 6) * 0.4;
    const lat = baseLat + progress * 0.02;
    const lng = baseLng + Math.sin(progress * 8) * 0.005;

    rawStreams.push({
      time: s,
      lat,
      lng,
      altitude: Math.round(altitude),
      velocity_smooth: Number(velocity.toFixed(2)),
    });

    // Muestras pasivas registradas por la Fit3 en ese mismo intervalo
    // El pulso sube gradualmente de 130 a 172 bpm en la cuesta
    const hr = Math.round(132 + Math.sin(progress * Math.PI) * 38 + (Math.random() * 4 - 2));
    const sampleTimestamp = new Date(new Date(runStartTime).getTime() + s * 1000).toISOString();
    fit3Samples.push({
      timestamp: sampleTimestamp,
      bpm: hr,
      source: 'galaxy_fit3',
    });
  }

  // Ejecutar el algoritmo de fusión temporal
  const merged = mergeStravaWithFit3HeartRate(runStartTime, rawStreams, fit3Samples, 190);

  return {
    id: 987654321,
    name: 'Carrera Nocturna con Cuestas & Umbral Z4',
    type: 'Run',
    start_date: runStartTime,
    elapsed_time: durationSeconds,
    moving_time: durationSeconds - 40,
    distance: 6150, // 6.15 km
    total_elevation_gain: 52.4,
    summary_polyline: 'o_~dFfkxU_@a@w@i@_@_Am@m@_@u@e@',
    streams_data: rawStreams,
    merged_hr_data: merged.merged_streams,
    avg_hr: merged.avg_hr,
    max_hr: merged.max_hr,
    created_at: new Date().toISOString(),
  };
}

// Almacén en memoria global (singleton para Next.js en caliente)
declare global {
  var __ironman_store: {
    dailyMetrics: DailyHealthMetric[];
    hrSamples: HeartRateSample[];
    stravaActivities: StravaActivity[];
    gymExercises: GymExercise[];
    gymLogs: GymWorkoutLog[];
    nutritionLogs: NutritionLog[];
    waterLogs: WaterLog[];
  } | undefined;
}

if (!global.__ironman_store) {
  global.__ironman_store = {
    dailyMetrics: [...initialDailyMetrics],
    hrSamples: [],
    stravaActivities: [generateSampleRun()],
    gymExercises: [...initialGymExercises],
    gymLogs: [...initialGymLogs],
    nutritionLogs: [...initialNutritionLogs],
    waterLogs: [...initialWaterLogs],
  };
}

export const mockStore = global.__ironman_store;
