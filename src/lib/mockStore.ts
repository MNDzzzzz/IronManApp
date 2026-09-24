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
  WeightLog,
  StreamDataPoint,
} from '@/types/database';
import { mergeStravaWithFit3HeartRate } from './merging/temporalAligner';

const today = new Date().toISOString().split('T')[0];

export const initialGymExercises: GymExercise[] = [
  // --- DÍA 1: TORSO (Hipertrofia y Estabilidad Escapular) ---
  {
    id: 'ex-torso-1',
    name: 'Press de Banca',
    category: 'Pecho',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '6-8 reps (RIR 1-2)',
    current_weight_kg: 60,
    rest_time: '2 - 2.5 min',
    notes: 'Mayor rango de recorrido con mancuernas o barra; protege hombros',
  },
  {
    id: 'ex-torso-2',
    name: 'Remo con Barra / Polea Baja',
    category: 'Espalda',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '8-10 reps (RIR 1-2)',
    current_weight_kg: 50,
    rest_time: '2 min',
    notes: 'Codos pegados, retracción escapular completa al final',
  },
  {
    id: 'ex-torso-3',
    name: 'Press Inclinado Mancuernas (30°)',
    category: 'Pecho',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '8-10 reps (RIR 1)',
    current_weight_kg: 50,
    rest_time: '1.5 - 2 min',
    notes: 'Énfasis en la porción clavicular del pectoral',
  },
  {
    id: 'ex-torso-4',
    name: 'Jalón al Pecho',
    category: 'Espalda',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 1)',
    current_weight_kg: 50,
    rest_time: '1.5 - 2 min',
    notes: 'Mantén pecho alto; tracción con dorsales sin balanceo',
  },
  {
    id: 'ex-torso-5',
    name: 'Elevaciones Laterales (Polea/Mancuerna)',
    category: 'Hombro',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '12-15 reps (RIR 0-1)',
    current_weight_kg: 5,
    rest_time: '1 - 1.5 min',
    notes: '5 kg cada lado. Tensión continua en cabeza lateral deltoides',
  },
  {
    id: 'ex-torso-6',
    name: 'Curl de Bíceps en Banco Inclinado',
    category: 'Brazo',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 0-1)',
    current_weight_kg: 10,
    rest_time: '1 min',
    notes: 'Empezar con 12.5 kg; bajar a 10 kg al bajar rendimiento',
  },
  {
    id: 'ex-torso-7',
    name: 'Extensión de Tríceps en Polea',
    category: 'Brazo',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 0-1)',
    current_weight_kg: 50,
    rest_time: '1 min',
    notes: 'Superserie con bíceps para trabajo de brazos directo y rápido',
  },

  // --- DÍA 2: PIERNA (Fuerza, Cadena Posterior y Prevención de Running) ---
  {
    id: 'ex-pierna-1',
    name: 'Prensa Inclinada',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '8-10 reps (RIR 1-2)',
    current_weight_kg: 120,
    rest_time: '2.5 min',
    notes: 'Trabajo puro de cuádriceps y glúteo con apoyo lumbar estable',
  },
  {
    id: 'ex-pierna-2',
    name: 'Curl Femoral Sentado',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 1)',
    current_weight_kg: 60,
    rest_time: '1.5 min',
    notes: 'Refuerzo analítico del tendón del isquiosural (frenada en carrera)',
  },
  {
    id: 'ex-pierna-3',
    name: 'Máquina de Abductores (Glúteo Medio)',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '10-12 reps',
    current_weight_kg: 90,
    rest_time: '1.5 min',
    notes: 'Sentado espalda recta, empujar piernas hacia fuera. Pirámide: 70kg -> 80kg -> 90kg',
  },
  {
    id: 'ex-pierna-4',
    name: 'Extensión de Cuádriceps',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 1)',
    current_weight_kg: 50,
    rest_time: '1.5 min',
    notes: 'Refuerzo de vasto interno y tendón rotuliano para impacto de carrera',
  },
  {
    id: 'ex-pierna-5',
    name: 'Hiperextensiones en Banco 45°',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '12 reps',
    current_weight_kg: 0,
    rest_time: '1.5 min',
    notes: 'Sin peso añadido (peso corporal). Enfoque en glúteos, isquios y lumbar',
  },
  {
    id: 'ex-pierna-6',
    name: 'Elevaciones de Talones Sentado en Máquina',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '15 reps',
    current_weight_kg: 20,
    rest_time: '1 - 1.5 min',
    notes: 'Máquina peso corporal + 20kg. Pausa 2 seg abajo para proteger Aquiles y fascia',
  },
  {
    id: 'ex-pierna-7',
    name: 'Plancha Lateral Antirrotacional',
    category: 'Core',
    is_stretch: false,
    day: 'Día 2: Pierna',
    target_sets: 3,
    target_reps: '40-45 seg / lado',
    current_weight_kg: 0,
    rest_time: '1 min',
    notes: 'Antirrotación para evitar balanceos pélvicos al correr',
  },

  // --- DÍA 3: FULL BODY (Global y Reactivo) ---
  {
    id: 'ex-full-1',
    name: 'Sentadilla Trasera / Búlgara Pesada',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '6-8 reps (RIR 2)',
    rest_time: '2 - 2.5 min',
    notes: 'Patrón dominante de rodilla con máxima transferencia. Pesos por determinar en primera sesión',
  },
  {
    id: 'ex-full-2',
    name: 'Press Militar con Mancuernas',
    category: 'Hombro',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '8-10 reps (RIR 1-2)',
    rest_time: '2 min',
    notes: 'Fuerza de hombros y estabilidad vertical. Pesos por determinar en primera sesión',
  },
  {
    id: 'ex-full-3',
    name: 'Hip Thrust / Puente de Glúteos',
    category: 'Pierna',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '8-10 reps (RIR 1)',
    rest_time: '2 min',
    notes: 'Extensor primario de zancada en carrera. Pesos por determinar en primera sesión',
  },
  {
    id: 'ex-full-4',
    name: 'Remo Unilateral con Mancuerna',
    category: 'Espalda',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '10-12 reps (RIR 1)',
    rest_time: '1.5 min',
    notes: 'Espalda alta y estabilidad de cadera. Pesos por determinar en primera sesión',
  },
  {
    id: 'ex-full-5',
    name: 'Face Pull en Polea con Cuerda',
    category: 'Hombro',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '12-15 reps (RIR 0-1)',
    rest_time: '1 min',
    notes: 'Salud del manguito rotador y deltoides posterior. Pesos por determinar en primera sesión',
  },
  {
    id: 'ex-full-6',
    name: 'Crunch en Polea / Elevación Talones',
    category: 'Core',
    is_stretch: false,
    day: 'Día 3: Full Body',
    target_sets: 3,
    target_reps: '12-15 reps (RIR 1)',
    rest_time: '1 min',
    notes: 'Trabajo de sóleo o flexión de tronco. Pesos por determinar en primera sesión',
  },

  // --- MOVILIDAD & ESTIRAMIENTOS ESPECÍFICOS PREVENCIÓN RUNNING ---
  {
    id: 'st-1',
    name: 'Movilidad de Cadera 90/90 & Glúteo',
    category: 'Pierna',
    is_stretch: true,
    target_reps: '60 seg / lado',
    notes: 'Descomprime caderas y estabiliza pelvis para la zancada',
  },
  {
    id: 'st-2',
    name: 'Estiramiento Sóleo y Fascia Plantar en Pared',
    category: 'Pierna',
    is_stretch: true,
    target_reps: '60 seg / lado',
    notes: 'Rodilla ligeramente flexionada. Previene tendinitis de Aquiles y periostitis',
  },
  {
    id: 'st-3',
    name: 'Descarga Cintilla Iliotibial y Cuádriceps',
    category: 'Pierna',
    is_stretch: true,
    target_reps: '60 seg / lado',
    notes: 'Evita el roce del tensor de la fascia lata con el cóndilo femoral',
  },
  {
    id: 'st-4',
    name: 'Movilidad Torácica Cat-Cow',
    category: 'Core',
    is_stretch: true,
    target_reps: '60 seg controlados',
    notes: 'Desbloquea la espalda alta para un braceo eficiente y fluido',
  },
];

export const initialGymLogs: GymWorkoutLog[] = [
  // --- MARTES 22 DE SEPTIEMBRE (Pierna 20:00 - Sesión Real) ---
  { id: 'log-22-1', date: '2026-09-22', exercise_id: 'ex-pierna-1', set_number: 1, reps: 10, weight_kg: 120, rpe: 8.5 },
  { id: 'log-22-2', date: '2026-09-22', exercise_id: 'ex-pierna-1', set_number: 2, reps: 10, weight_kg: 120, rpe: 8.5 },
  { id: 'log-22-3', date: '2026-09-22', exercise_id: 'ex-pierna-1', set_number: 3, reps: 10, weight_kg: 120, rpe: 9 },

  { id: 'log-22-4', date: '2026-09-22', exercise_id: 'ex-pierna-2', set_number: 1, reps: 12, weight_kg: 60, rpe: 9 },
  { id: 'log-22-5', date: '2026-09-22', exercise_id: 'ex-pierna-2', set_number: 2, reps: 12, weight_kg: 60, rpe: 9 },
  { id: 'log-22-6', date: '2026-09-22', exercise_id: 'ex-pierna-2', set_number: 3, reps: 12, weight_kg: 60, rpe: 9 },

  { id: 'log-22-7', date: '2026-09-22', exercise_id: 'ex-pierna-3', set_number: 1, reps: 12, weight_kg: 70, rpe: 9 },
  { id: 'log-22-8', date: '2026-09-22', exercise_id: 'ex-pierna-3', set_number: 2, reps: 12, weight_kg: 80, rpe: 9 },
  { id: 'log-22-9', date: '2026-09-22', exercise_id: 'ex-pierna-3', set_number: 3, reps: 12, weight_kg: 90, rpe: 9 },

  { id: 'log-22-10', date: '2026-09-22', exercise_id: 'ex-pierna-4', set_number: 1, reps: 12, weight_kg: 50, rpe: 9 },
  { id: 'log-22-11', date: '2026-09-22', exercise_id: 'ex-pierna-4', set_number: 2, reps: 12, weight_kg: 50, rpe: 9 },
  { id: 'log-22-12', date: '2026-09-22', exercise_id: 'ex-pierna-4', set_number: 3, reps: 12, weight_kg: 50, rpe: 9 },

  { id: 'log-22-13', date: '2026-09-22', exercise_id: 'ex-pierna-5', set_number: 1, reps: 12, weight_kg: 0, rpe: 8 },
  { id: 'log-22-14', date: '2026-09-22', exercise_id: 'ex-pierna-5', set_number: 2, reps: 12, weight_kg: 0, rpe: 8 },
  { id: 'log-22-15', date: '2026-09-22', exercise_id: 'ex-pierna-5', set_number: 3, reps: 12, weight_kg: 0, rpe: 8 },

  { id: 'log-22-16', date: '2026-09-22', exercise_id: 'ex-pierna-6', set_number: 1, reps: 15, weight_kg: 20, rpe: 9 },
  { id: 'log-22-17', date: '2026-09-22', exercise_id: 'ex-pierna-6', set_number: 2, reps: 15, weight_kg: 20, rpe: 9 },
  { id: 'log-22-18', date: '2026-09-22', exercise_id: 'ex-pierna-6', set_number: 3, reps: 15, weight_kg: 20, rpe: 9 },

  { id: 'log-22-19', date: '2026-09-22', exercise_id: 'ex-pierna-7', set_number: 1, reps: 45, weight_kg: 0, rpe: 8.5 },
  { id: 'log-22-20', date: '2026-09-22', exercise_id: 'ex-pierna-7', set_number: 2, reps: 45, weight_kg: 0, rpe: 8.5 },
  { id: 'log-22-21', date: '2026-09-22', exercise_id: 'ex-pierna-7', set_number: 3, reps: 40, weight_kg: 0, rpe: 9 },

  // --- LUNES 21 DE SEPTIEMBRE (Torso - Sesión Real según Tabla & RIR) ---
  { id: 'log-21-1', date: '2026-09-21', exercise_id: 'ex-torso-1', set_number: 1, reps: 8, weight_kg: 60, rpe: 8.5 },
  { id: 'log-21-2', date: '2026-09-21', exercise_id: 'ex-torso-1', set_number: 2, reps: 8, weight_kg: 60, rpe: 8.5 },
  { id: 'log-21-3', date: '2026-09-21', exercise_id: 'ex-torso-1', set_number: 3, reps: 8, weight_kg: 60, rpe: 9 },

  { id: 'log-21-4', date: '2026-09-21', exercise_id: 'ex-torso-2', set_number: 1, reps: 10, weight_kg: 50, rpe: 8.5 },
  { id: 'log-21-5', date: '2026-09-21', exercise_id: 'ex-torso-2', set_number: 2, reps: 10, weight_kg: 50, rpe: 8.5 },
  { id: 'log-21-6', date: '2026-09-21', exercise_id: 'ex-torso-2', set_number: 3, reps: 10, weight_kg: 50, rpe: 9 },

  { id: 'log-21-7', date: '2026-09-21', exercise_id: 'ex-torso-3', set_number: 1, reps: 10, weight_kg: 50, rpe: 9 },
  { id: 'log-21-8', date: '2026-09-21', exercise_id: 'ex-torso-3', set_number: 2, reps: 10, weight_kg: 50, rpe: 9 },
  { id: 'log-21-9', date: '2026-09-21', exercise_id: 'ex-torso-3', set_number: 3, reps: 10, weight_kg: 50, rpe: 9 },

  { id: 'log-21-10', date: '2026-09-21', exercise_id: 'ex-torso-4', set_number: 1, reps: 12, weight_kg: 50, rpe: 9 },
  { id: 'log-21-11', date: '2026-09-21', exercise_id: 'ex-torso-4', set_number: 2, reps: 12, weight_kg: 50, rpe: 9 },
  { id: 'log-21-12', date: '2026-09-21', exercise_id: 'ex-torso-4', set_number: 3, reps: 12, weight_kg: 50, rpe: 9 },

  { id: 'log-21-13', date: '2026-09-21', exercise_id: 'ex-torso-5', set_number: 1, reps: 15, weight_kg: 5, rpe: 9.5 },
  { id: 'log-21-14', date: '2026-09-21', exercise_id: 'ex-torso-5', set_number: 2, reps: 15, weight_kg: 5, rpe: 9.5 },
  { id: 'log-21-15', date: '2026-09-21', exercise_id: 'ex-torso-5', set_number: 3, reps: 15, weight_kg: 5, rpe: 10 },

  { id: 'log-21-16', date: '2026-09-21', exercise_id: 'ex-torso-6', set_number: 1, reps: 12, weight_kg: 12.5, rpe: 9.5 },
  { id: 'log-21-17', date: '2026-09-21', exercise_id: 'ex-torso-6', set_number: 2, reps: 12, weight_kg: 10, rpe: 9.5 },
  { id: 'log-21-18', date: '2026-09-21', exercise_id: 'ex-torso-6', set_number: 3, reps: 12, weight_kg: 10, rpe: 10 },

  { id: 'log-21-19', date: '2026-09-21', exercise_id: 'ex-torso-7', set_number: 1, reps: 12, weight_kg: 50, rpe: 9.5 },
  { id: 'log-21-20', date: '2026-09-21', exercise_id: 'ex-torso-7', set_number: 2, reps: 12, weight_kg: 50, rpe: 9.5 },
  { id: 'log-21-21', date: '2026-09-21', exercise_id: 'ex-torso-7', set_number: 3, reps: 12, weight_kg: 50, rpe: 10 },
];

export const initialDailyMetrics: DailyHealthMetric[] = [
  {
    id: 'health-24',
    date: '2026-09-24',
    resting_hr: 50,
    sleep_duration_minutes: 465, // 7h 45m
    sleep_score: 89,
    deep_sleep_minutes: 110,
    rem_sleep_minutes: 105,
    light_sleep_minutes: 220,
    awake_minutes: 30,
    spo2_avg: 97.6,
    spo2_min: 94.0,
    total_steps: 20450, // Más de 20.000 pasos
    active_calories: 890,
    synced_at: '2026-09-24T22:00:00Z',
  },
  {
    id: 'health-23',
    date: '2026-09-23',
    resting_hr: 52,
    sleep_duration_minutes: 480, // 8h
    sleep_score: 88,
    deep_sleep_minutes: 115,
    rem_sleep_minutes: 110,
    light_sleep_minutes: 225,
    awake_minutes: 30,
    spo2_avg: 97.4,
    spo2_min: 94.0,
    total_steps: 11450,
    active_calories: 450,
    synced_at: '2026-09-23T22:00:00Z',
  },
  {
    id: 'health-22',
    date: '2026-09-22',
    resting_hr: 53,
    sleep_duration_minutes: 450, // 7h 30m
    sleep_score: 85,
    deep_sleep_minutes: 100,
    rem_sleep_minutes: 100,
    light_sleep_minutes: 215,
    awake_minutes: 35,
    spo2_avg: 97.2,
    spo2_min: 93.5,
    total_steps: 10234, // 10.234 pasos (7,54 km)
    active_calories: 640,
    synced_at: '2026-09-22T22:00:00Z',
  },
];

export const initialWeightLogs: WeightLog[] = [
  {
    id: 'weight-24',
    date: '2026-09-24',
    timestamp: '2026-09-24T21:45:00Z',
    weight_kg: 101.0,
    notes: 'Antes de cenar, después de entrenar (Running 5 km en 35 min)',
    created_at: '2026-09-24T21:45:00Z',
  },
  {
    id: 'weight-22',
    date: '2026-09-22',
    timestamp: '2026-09-22T21:50:00Z',
    weight_kg: 101.5,
    notes: 'Antes de cenar, después de entrenar (Pierna 20:00)',
    created_at: '2026-09-22T21:50:00Z',
  },
  {
    id: 'weight-21',
    date: '2026-09-21',
    timestamp: '2026-09-21T21:40:00Z',
    weight_kg: 101.6,
    notes: 'Antes de cenar, después de entrenar (Torso)',
    created_at: '2026-09-21T21:40:00Z',
  },
  {
    id: 'weight-20',
    date: '2026-09-20',
    timestamp: '2026-09-20T21:30:00Z',
    weight_kg: 102.5,
    notes: 'Antes de cenar, después de entrenar',
    created_at: '2026-09-20T21:30:00Z',
  },
];

export const initialNutritionLogs: NutritionLog[] = [
  // --- JUEVES 24 DE SEPTIEMBRE (Running 5km + >20.000 pasos - 2.691 kcal) ---
  {
    id: 'nutri-24-4',
    date: '2026-09-24',
    timestamp: '2026-09-24T22:00:00Z',
    meal_type: 'Cena',
    description: 'Pechuga de pollo cocinada a la plancha (61 g) + bol de avena (40 g), leche desnatada (100 ml), yogur griego ligero (120 g), Impact Whey (35 g), chía, arándanos (50 g) y creatina (9 g)',
    calories: 523,
    protein_g: 58.4,
    carbs_g: 41.2,
    fat_g: 12.4,
    raw_audio_transcription: 'Cena: 61g pechuga plancha con bol de avena, leche desnatada, yogur griego ligero, whey, chía, arándanos y creatina',
  },
  {
    id: 'nutri-24-3',
    date: '2026-09-24',
    timestamp: '2026-09-24T17:15:00Z',
    meal_type: 'Snack',
    description: 'Sobremesa: 2 cafés con leche semidesnatada (500 ml total) con azúcar (8 g total) + medio gofre con bola de helado de nata y Nocilla',
    calories: 636,
    protein_g: 21.9,
    carbs_g: 76.1,
    fat_g: 26.8,
    raw_audio_transcription: 'Sobremesa: 2 cafés con leche semidesnatada con azúcar y medio gofre con helado y Nocilla',
  },
  {
    id: 'nutri-24-2',
    date: '2026-09-24',
    timestamp: '2026-09-24T14:30:00Z',
    meal_type: 'Almuerzo',
    description: 'Comida fuera: 1/2 ración de patatas trufadas con parmesano, 1/2 ración de ensalada con pollo crujiente y salsa miel-mostaza, bocadillo completo (lomo, bacon, huevo, cheddar, alioli y mostaza) + Coca-Cola Zero',
    calories: 1158,
    protein_g: 67.2,
    carbs_g: 88.7,
    fat_g: 71.0,
    raw_audio_transcription: 'Comida fuera: patatas trufadas con parmesano, ensalada pollo crujiente y bocadillo completo con lomo, bacon, huevo y queso',
  },
  {
    id: 'nutri-24-1',
    date: '2026-09-24',
    timestamp: '2026-09-24T08:45:00Z',
    meal_type: 'Desayuno',
    description: 'Tortilla (2 huevos) con pavo (48 g) y queso light (25 g) + noodles cocinados (70 g) con salsa de soja (10 ml)',
    calories: 374,
    protein_g: 32.8,
    carbs_g: 22.8,
    fat_g: 16.4,
    raw_audio_transcription: 'Desayuno: Tortilla de dos huevos con pavo y queso light con 70g de noodles salteados con soja',
  },

  // --- MIÉRCOLES 23 DE SEPTIEMBRE (Descanso Activo / Refeed Mantenimiento - 2.508 kcal) ---
  {
    id: 'nutri-23-6',
    date: '2026-09-23',
    timestamp: '2026-09-23T22:15:00Z',
    meal_type: 'Cena',
    description: 'Restos de noodles (90 g) y verduras salteadas (100 g) con lomo de cerdo (35 g) y 3 huevos cocidos (2 enteros + 1 clara)',
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
    description: 'Picoteo (tarde / paseo): 4 cacahuetes con sal, 1 copa de cava y 2 trozos de bizcocho (brazo de gitano y naranja con nueces)',
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
    description: 'Bol de avena (40 g), leche desnatada (85 ml), yogur griego ligero (120 g), Impact Whey (34 g), chía y arándanos congelados (37 g)',
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
    description: 'Noodles de huevo (125 g cocinados) con lomo de cerdo (80 g) y salteado de verduras al AOVE + 2 huevos cocidos enteros + Nestea limón (250 ml)',
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
    description: 'Media Mañana: 1 huevo cocido mediano entero + manzana golden (160 g)',
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
    description: 'Café con leche desnatada (200 ml), tostadas de pan 100% integral (53 g) con AOVE, tomate, taquitos de jamón (41 g) y pechuga de pavo (50 g)',
    calories: 370,
    protein_g: 35.4,
    carbs_g: 32.3,
    fat_g: 9.7,
    raw_audio_transcription: 'Desayuno: Tostada de pan integral con jamón y pavo, tomate, un chorrito de aceite y café con leche desnatada',
  },

  // --- MARTES 22 DE SEPTIEMBRE (Pierna 20:00 - Carga Hidratos / Déficit Óptimo - 2.291 kcal) ---
  {
    id: 'nutri-22-5',
    date: '2026-09-22',
    timestamp: '2026-09-22T22:15:00Z',
    meal_type: 'Cena',
    description: 'Mollejas de pollo (100 g), molido de plátano macho verde, queso light en lonchas y pechuga de pavo en lonchas (145 g)',
    calories: 622,
    protein_g: 50.4,
    carbs_g: 30.0,
    fat_g: 15.3,
    raw_audio_transcription: 'Cena post-pesas: mollejas de pollo con molido de plátano macho, una loncha de queso light y pavo',
  },
  {
    id: 'nutri-22-4',
    date: '2026-09-22',
    timestamp: '2026-09-22T19:25:00Z',
    meal_type: 'Snack',
    description: 'Pre-entreno: Café solo con agua',
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
    description: 'Bol de avena (50 g), leche desnatada, yogur griego ligero, Impact Whey (31 g), semillas de chía y arándanos congelados',
    calories: 430,
    protein_g: 38.5,
    carbs_g: 47.3,
    fat_g: 8.8,
    raw_audio_transcription: 'Bol de merienda con 50g de avena, leche desnatada, yogur griego, un cazo de proteína whey, chía, arándanos y creatina',
  },
  {
    id: 'nutri-22-2',
    date: '2026-09-22',
    timestamp: '2026-09-22T14:15:00Z',
    meal_type: 'Almuerzo',
    description: 'Mollejas de pollo guisadas (150 g) con plátano macho hervido y queso (350 g)',
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
    description: 'Café con leche desnatada (400 ml), tostadas de pan 100% integral (3 rebanadas) con AOVE, tomate y taquitos de jamón, mermelada y plátano',
    calories: 547,
    protein_g: 45.1,
    carbs_g: 89.0,
    fat_g: 19.2,
    raw_audio_transcription: 'Desayuno: 3 tostadas de pan integral con jamón, tomate rallado y aceite, tazón grande de leche desnatada con café y un plátano',
  },
];

export const initialWaterLogs: WaterLog[] = [
  // Hidratación 24 de Septiembre (3.000 ml)
  { id: 'water-24-4', date: '2026-09-24', timestamp: '2026-09-24T21:30:00Z', amount_ml: 750 },
  { id: 'water-24-3', date: '2026-09-24', timestamp: '2026-09-24T18:00:00Z', amount_ml: 750 },
  { id: 'water-24-2', date: '2026-09-24', timestamp: '2026-09-24T13:30:00Z', amount_ml: 750 },
  { id: 'water-24-1', date: '2026-09-24', timestamp: '2026-09-24T09:00:00Z', amount_ml: 750 },

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

export const initialStravaActivities: StravaActivity[] = [
  {
    id: 124092401,
    name: 'Tirada Corta de Running (5 km)',
    type: 'Run',
    start_date: '2026-09-24T18:30:00Z',
    elapsed_time: 2100, // 35 min
    moving_time: 2100,
    distance: 5000,
    total_elevation_gain: 24.0,
    summary_polyline: 'o_~dFfkxU_@a@w@i@_@_Am@m@_@u@e@',
    avg_hr: 154,
    max_hr: 170,
    created_at: '2026-09-24T19:10:00Z',
  },
];

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
    weightLogs: WeightLog[];
  } | undefined;
}

if (!global.__ironman_store) {
  global.__ironman_store = {
    dailyMetrics: [...initialDailyMetrics],
    hrSamples: [],
    stravaActivities: [...initialStravaActivities],
    gymExercises: [...initialGymExercises],
    gymLogs: [...initialGymLogs],
    nutritionLogs: [...initialNutritionLogs],
    waterLogs: [...initialWaterLogs],
    weightLogs: [...initialWeightLogs],
  };
}

export const mockStore = global.__ironman_store;
