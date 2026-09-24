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

export const initialGymExercises: GymExercise[] = [];

export const initialGymLogs: GymWorkoutLog[] = [];

export const initialDailyMetrics: DailyHealthMetric[] = [];

export const initialNutritionLogs: NutritionLog[] = [
  // --- MIÉRCOLES 23 DE SEPTIEMBRE (Descanso Activo / Refeed Mantenimiento ~2.508 kcal) ---
  {
    id: 'nutri-23-6',
    date: '2026-09-23',
    timestamp: '2026-09-23T22:15:00Z',
    meal_type: 'Cena',
    description: 'Lomo de cerdo cocinado (35g), noodles de huevo (90g), verduras salteadas (100g) y 3 huevos (2 enteros + 1 clara, 140g)',
    calories: 417,
    protein_g: 34.0,
    carbs_g: 32.8,
    fat_g: 15.5,
    raw_audio_transcription: 'Cena: 35g de lomo, 90g de noodles con verduras y 3 huevos cocidos con una clara',
  },
  {
    id: 'nutri-23-5',
    date: '2026-09-23',
    timestamp: '2026-09-23T20:00:00Z',
    meal_type: 'Snack',
    description: 'Paseo de tarde: Cacahuetes salados, copa de cava y 2 trozos de bizcocho',
    calories: 470,
    protein_g: 7.2,
    carbs_g: 51.6,
    fat_g: 18.0,
    raw_audio_transcription: 'Picoteo paseo: cacahuetes, copa de cava y bizcocho',
  },
  {
    id: 'nutri-23-4',
    date: '2026-09-23',
    timestamp: '2026-09-23T18:30:00Z',
    meal_type: 'Snack',
    description: 'Merienda pre-entreno: Copos de avena extrasuaves (40g), leche desnatada (85ml), yogur griego ligero (120g), Impact Whey (34g), chía (1g), arándanos congelados (37g) + 5g creatina',
    calories: 391,
    protein_g: 38.2,
    carbs_g: 38.8,
    fat_g: 8.1,
    raw_audio_transcription: 'Bol de merienda con 40g de avena, leche desnatada, yogur griego ligero, un cazo de whey, arándanos y 5g de creatina',
  },
  {
    id: 'nutri-23-3',
    date: '2026-09-23',
    timestamp: '2026-09-23T14:20:00Z',
    meal_type: 'Almuerzo',
    description: 'Noodles de huevo (125g cocinado), lomo de cerdo (80g), verduras salteadas (110g), AOVE (11g), 2 huevos cocidos enteros (115g) y té al limón Hacendado (250ml)',
    calories: 699,
    protein_g: 46.4,
    carbs_g: 54.7,
    fat_g: 30.7,
    raw_audio_transcription: 'Comida: Noodles con lomo de cerdo, verduras salteadas con aceite de oliva, dos huevos duros y un vaso de té al limón',
  },
  {
    id: 'nutri-23-2',
    date: '2026-09-23',
    timestamp: '2026-09-23T11:45:00Z',
    meal_type: 'Snack',
    description: 'Media mañana: 1 huevo cocido entero (~58g) y 1 manzana golden (160g)',
    calories: 161,
    protein_g: 6.9,
    carbs_g: 19.8,
    fat_g: 5.8,
    raw_audio_transcription: 'Media mañana: un huevo cocido y una manzana',
  },
  {
    id: 'nutri-23-1',
    date: '2026-09-23',
    timestamp: '2026-09-23T08:50:00Z',
    meal_type: 'Desayuno',
    description: 'Leche desnatada (200ml), azúcar blanco (2g), café soluble (2g), pan 100% integral (53g), AOVE (2g), tomate rallado (15g), taquitos de jamón (41g) y pechuga de pavo lonchas (50g)',
    calories: 368,
    protein_g: 35.0,
    carbs_g: 31.7,
    fat_g: 9.7,
    raw_audio_transcription: 'Desayuno: Tostada de pan integral con jamón y pavo, tomate, un chorrito de aceite y café con leche desnatada',
  },

  // --- MARTES 22 DE SEPTIEMBRE (Pierna a las 20:00 - Déficit Óptimo ~2.291 kcal) ---
  {
    id: 'nutri-22-5',
    date: '2026-09-22',
    timestamp: '2026-09-22T22:15:00Z',
    meal_type: 'Cena',
    description: 'Post-entreno pierna: Mollejas de pollo guisadas (100g), molido de verde plátano macho (90g), queso light lonchas (25g) y pechuga de pavo lonchas (145g)',
    calories: 442,
    protein_g: 50.4,
    carbs_g: 29.7,
    fat_g: 15.0,
    raw_audio_transcription: 'Cena post-pesas: mollejas de pollo con molido de plátano macho, una loncha de queso light y pavo',
  },
  {
    id: 'nutri-22-4',
    date: '2026-09-22',
    timestamp: '2026-09-22T19:25:00Z',
    meal_type: 'Snack',
    description: 'Pre-entreno: Café solo con agua 35 min antes de entrenar (pico de cafeína sin interferir con el sueño)',
    calories: 2,
    protein_g: 0.2,
    carbs_g: 0.3,
    fat_g: 0.0,
    raw_audio_transcription: 'Café solo antes de entrenar pierna',
  },
  {
    id: 'nutri-22-3',
    date: '2026-09-22',
    timestamp: '2026-09-22T18:30:00Z',
    meal_type: 'Snack',
    description: 'Merienda pre-entreno: Copos de avena extrasuaves (50g), leche desnatada (100ml), yogur griego ligero (125g), Impact Whey (31g), semillas chía (1g), arándanos congelados (53g) + 5g creatina',
    calories: 435,
    protein_g: 38.5,
    carbs_g: 47.0,
    fat_g: 8.8,
    raw_audio_transcription: 'Bol de merienda con 50g de avena, leche desnatada, yogur griego, un cazo de proteína whey, chía, arándanos y creatina',
  },
  {
    id: 'nutri-22-2',
    date: '2026-09-22',
    timestamp: '2026-09-22T14:15:00Z',
    meal_type: 'Almuerzo',
    description: 'Carga principal: Mollejas de pollo guisadas (150g) con plátano macho hervido con queso (350g)',
    calories: 690,
    protein_g: 35.7,
    carbs_g: 105.5,
    fat_g: 18.5,
    raw_audio_transcription: 'Comida: Mollejas de pollo guisadas con plátano macho hervido y queso',
  },
  {
    id: 'nutri-22-1',
    date: '2026-09-22',
    timestamp: '2026-09-22T08:45:00Z',
    meal_type: 'Desayuno',
    description: 'Leche desnatada (400ml), café soluble (2g), azúcar blanco (6g), 3 rebanadas de pan 100% integral (90g), mermelada (10g), tomate rallado natural (60g), AOVE (8g), taquitos de jamón serrano (60g) y 1 plátano de mesa (100g)',
    calories: 723,
    protein_g: 45.1,
    carbs_g: 105.7,
    fat_g: 19.3,
    raw_audio_transcription: 'Desayuno: 3 tostadas de pan integral con jamón, tomate rallado y aceite, tazón grande de leche desnatada con café y un plátano',
  },
];

export const initialWaterLogs: WaterLog[] = [
  // Hidratación 23 de Septiembre (2.750 ml)
  { id: 'water-23-4', date: '2026-09-23', timestamp: '2026-09-23T21:30:00Z', amount_ml: 500 },
  { id: 'water-23-3', date: '2026-09-23', timestamp: '2026-09-23T18:00:00Z', amount_ml: 750 },
  { id: 'water-23-2', date: '2026-09-23', timestamp: '2026-09-23T13:30:00Z', amount_ml: 750 },
  { id: 'water-23-1', date: '2026-09-23', timestamp: '2026-09-23T09:00:00Z', amount_ml: 750 },

  // Hidratación 22 de Septiembre (3.000 ml)
  { id: 'water-22-4', date: '2026-09-22', timestamp: '2026-09-22T21:45:00Z', amount_ml: 750 },
  { id: 'water-22-3', date: '2026-09-22', timestamp: '2026-09-22T19:00:00Z', amount_ml: 750 },
  { id: 'water-22-2', date: '2026-09-22', timestamp: '2026-09-22T14:00:00Z', amount_ml: 750 },
  { id: 'water-22-1', date: '2026-09-22', timestamp: '2026-09-22T09:15:00Z', amount_ml: 750 },
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
    stravaActivities: [],
    gymExercises: [...initialGymExercises],
    gymLogs: [...initialGymLogs],
    nutritionLogs: [...initialNutritionLogs],
    waterLogs: [...initialWaterLogs],
  };
}

export const mockStore = global.__ironman_store;
