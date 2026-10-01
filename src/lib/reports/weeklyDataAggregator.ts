// ====================================================================
// AGREGADOR DE DATOS SEMANALES: IronManApp (100% Datos Reales)
// Compila sin inventar datos todas las telemetrías registradas:
// - Samsung Galaxy Fit3 (pasos, FC reposo, sueño, SpO2)
// - Strava y rodajes de cardio (distancia, ritmo, cadencia, splits)
// - Entrenamientos de fuerza en gimnasio (series, kg levantados, RPE)
// - Nutrición Mercadona & Báscula (calorías, proteína, hidratación, peso)
// ====================================================================

import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import {
  DailyHealthMetric,
  CardioActivity,
  GymWorkoutLog,
  GymExercise,
  NutritionLog,
  WaterLog,
  WeightLog,
} from '@/types/database';
import {
  getTodayRoutine,
  DayRoutine,
  getCurrentWeekNumber,
  getHalfMarathonCountdown,
  getRunningProgressionForWeek,
  HalfMarathonCountdown,
  RunningWeekPlan,
} from '@/lib/weeklyRoutine';

export interface DayHealthTelemetry {
  hasData: boolean;
  steps: number;
  targetStepsMin: number;
  targetStepsMax: number;
  restingHr: number | null;
  sleepMinutes: number | null;
  sleepScore: number | null;
  spo2Avg: number | null;
  activeCalories: number;
}

export interface DayCardioTelemetry {
  hasActivity: boolean;
  activities: CardioActivity[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  avgPaceStr: string | null;
  avgHr: number | null;
  avgCadence: number | null;
  elevationGain: number;
}

export interface ExerciseLoggedSummary {
  name: string;
  category: string;
  setsCount: number;
  bestWeightKg: number;
  totalReps: number;
  volumeKg: number;
  isKneeProtector: boolean;
}

export interface DayGymTelemetry {
  hasWorkout: boolean;
  workoutTitle: string | null;
  totalSets: number;
  totalVolumeKg: number;
  exercisesLogged: ExerciseLoggedSummary[];
}

export interface DayNutritionTelemetry {
  hasData: boolean;
  mealsCount: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  waterMl: number;
  creatineLogged: boolean;
  meals: NutritionLog[];
}

export interface DayWeightTelemetry {
  logged: boolean;
  weightKg: number | null;
  notes?: string;
}

export interface WeeklyDayTelemetry {
  date: string; // YYYY-MM-DD
  dayName: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  dayIndex: number;
  isRestDay: boolean; // Miércoles y Sábado
  routineScheduled: DayRoutine;
  health: DayHealthTelemetry;
  cardio: DayCardioTelemetry;
  gym: DayGymTelemetry;
  nutrition: DayNutritionTelemetry;
  weight: DayWeightTelemetry;
}

export interface WeeklyReportSummary {
  daysWithNutritionCount: number;
  daysWithHealthCount: number;
  totalCardioKm: number;
  avgCardioPaceStr: string | null;
  cardioSessionsCount: number;
  totalGymVolumeKg: number;
  gymSessionsCount: number;
  kneeProtectorSetsCount: number;
  avgDailySteps: number;
  restDaysAvgSteps: number;
  activeDaysAvgSteps: number;
  avgDailyCalories: number;
  avgDailyProteinG: number;
  avgWaterLiters: number;
  avgRestingHr: number | null;
  avgSleepHours: number | null;
  startWeightKg: number | null;
  endWeightKg: number | null;
  weightDeltaKg: number | null;
  latestWeightKg: number;
}

export interface WeeklyReportDataset {
  startDate: string; // Lunes YYYY-MM-DD
  endDate: string; // Domingo YYYY-MM-DD
  weekNumber: number;
  countdown: HalfMarathonCountdown;
  progressionPlan: RunningWeekPlan;
  days: WeeklyDayTelemetry[];
  summary: WeeklyReportSummary;
}

/**
 * Calcula los límites (Lunes 00:00 a Domingo 23:59) de una semana a partir de un desfase
 * weekOffset = 0 (semana actual), weekOffset = -1 (semana anterior), etc.
 */
export function getWeekDateRange(weekOffset: number = 0, referenceDate?: Date): { startDate: string; endDate: string } {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  
  // Obtener día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
  const day = ref.getDay();
  // Distancia al lunes de la semana de referencia (si es domingo, día=0 -> diff = -6)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * Genera la lista de los 7 días (Lunes a Domingo) con nombres en español
 */
function getWeekDaysArray(startDateStr: string): Array<{ date: string; dayName: WeeklyDayTelemetry['dayName']; isRestDay: boolean }> {
  const dayNames: WeeklyDayTelemetry['dayName'][] = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  const result = [];
  const start = new Date(startDateStr);

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    const name = dayNames[i];
    const isRest = name === 'Miércoles' || name === 'Sábado';
    result.push({ date: dateStr, dayName: name, isRestDay: isRest });
  }

  return result;
}

/**
 * Formatea segundos por km a cadena legible "M:SS /km"
 */
function formatSecondsToPace(secondsPerKm: number): string {
  if (!secondsPerKm || isNaN(secondsPerKm) || secondsPerKm <= 0) return '0:00 /km';
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
}

/**
 * Agrega y consolida todos los datos reales registrados para la semana indicada
 */
export async function getWeeklyReportDataset(
  startDateStr: string,
  endDateStr: string
): Promise<WeeklyReportDataset> {
  // 1. Obtener los 7 días de la semana
  const weekDays = getWeekDaysArray(startDateStr);

  // 2. Extraer telemetrías reales desde Supabase o mockStore
  let dbMetrics: DailyHealthMetric[] = [];
  let dbActivities: CardioActivity[] = [];
  let dbGymLogs: GymWorkoutLog[] = [];
  let dbGymExercises: GymExercise[] = [];
  let dbMeals: NutritionLog[] = [];
  let dbWater: WaterLog[] = [];
  let dbWeights: WeightLog[] = [];

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const [
        metricsRes,
        activitiesRes,
        gymLogsRes,
        gymExRes,
        mealsRes,
        waterRes,
        weightRes,
      ] = await Promise.all([
        supabaseAdmin
          .from('daily_health_metrics')
          .select('*')
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date', { ascending: true }),
        supabaseAdmin
          .from('strava_activities')
          .select('*')
          .gte('start_date', `${startDateStr}T00:00:00`)
          .lte('start_date', `${endDateStr}T23:59:59`)
          .order('start_date', { ascending: true }),
        supabaseAdmin
          .from('gym_workout_logs')
          .select('*, gym_exercises(*)')
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabaseAdmin.from('gym_exercises').select('*'),
        supabaseAdmin
          .from('nutrition_logs')
          .select('*')
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabaseAdmin
          .from('water_logs')
          .select('*')
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabaseAdmin
          .from('weight_logs')
          .select('*')
          .order('date', { ascending: true }),
      ]);

      if (metricsRes.data) dbMetrics = metricsRes.data;
      if (activitiesRes.data) dbActivities = activitiesRes.data;
      if (gymLogsRes.data) dbGymLogs = gymLogsRes.data;
      if (gymExRes.data) dbGymExercises = gymExRes.data;
      if (mealsRes.data) dbMeals = mealsRes.data;
      if (waterRes.data) dbWater = waterRes.data;
      if (weightRes.data) dbWeights = weightRes.data;
    } catch (err) {
      console.error('Error consultando Supabase en getWeeklyReportDataset:', err);
    }
  }

  // Si no hay datos en Supabase, recurrir a almacén en memoria
  if (dbMetrics.length === 0 && mockStore.dailyMetrics) {
    dbMetrics = mockStore.dailyMetrics.filter((m) => m.date >= startDateStr && m.date <= endDateStr);
  }
  if (dbActivities.length === 0 && mockStore.stravaActivities) {
    dbActivities = mockStore.stravaActivities.filter(
      (a) => a.start_date.substring(0, 10) >= startDateStr && a.start_date.substring(0, 10) <= endDateStr
    );
  }
  if (dbGymLogs.length === 0 && mockStore.gymLogs) {
    dbGymLogs = mockStore.gymLogs.filter((l) => l.date >= startDateStr && l.date <= endDateStr);
  }
  if (dbGymExercises.length === 0 && mockStore.gymExercises) {
    dbGymExercises = mockStore.gymExercises;
  }
  if (dbMeals.length === 0 && mockStore.nutritionLogs) {
    dbMeals = mockStore.nutritionLogs.filter((m) => m.date >= startDateStr && m.date <= endDateStr);
  }
  if (dbWater.length === 0 && mockStore.waterLogs) {
    dbWater = mockStore.waterLogs.filter((w) => w.date >= startDateStr && w.date <= endDateStr);
  }
  if (dbWeights.length === 0 && mockStore.weightLogs) {
    dbWeights = mockStore.weightLogs;
  }

  // Filtrar comidas que no sean el hack antiguo de 'PESO_CORPORAL'
  const realMeals = dbMeals.filter((m) => m.meal_type !== 'PESO_CORPORAL');

  // Mapa de ejercicios por ID
  const exerciseMap = new Map<string, GymExercise>();
  dbGymExercises.forEach((ex) => exerciseMap.set(ex.id, ex));

  // Ejercicios clave de protección articular de rodilla
  const kneeProtectorKeywords = [
    'wall-sit',
    'isométric',
    'prensa',
    'sentadilla',
    'abductor',
    'glúteo medio',
    'talón',
    'sóleo',
    'gemelo',
    'tibial',
    'cuádriceps',
  ];

  const isKneeProtectorExercise = (name: string): boolean => {
    const lower = name.toLowerCase();
    return kneeProtectorKeywords.some((kw) => lower.includes(kw));
  };

  // 3. Procesar día a día
  const daysTelemetry: WeeklyDayTelemetry[] = weekDays.map((wDay, idx) => {
    const routine = getTodayRoutine(wDay.date);

    // --- Salud (Fit3) ---
    const metric = dbMetrics.find((m) => m.date === wDay.date);
    const healthTelemetry: DayHealthTelemetry = {
      hasData: Boolean(metric && metric.total_steps > 0),
      steps: metric ? metric.total_steps : 0,
      targetStepsMin: routine.targetSteps.min,
      targetStepsMax: routine.targetSteps.max,
      restingHr: metric?.resting_hr || null,
      sleepMinutes: metric?.sleep_duration_minutes || null,
      sleepScore: metric?.sleep_score || null,
      spo2Avg: metric?.spo2_avg || null,
      activeCalories: metric?.active_calories || 0,
    };

    // --- Cardio (Strava / Rodajes) ---
    const dayActivities = dbActivities.filter(
      (a) => a.start_date.substring(0, 10) === wDay.date
    );
    const totalDistMeters = dayActivities.reduce((acc, a) => acc + (a.distance || 0), 0);
    const totalSeconds = dayActivities.reduce((acc, a) => acc + (a.moving_time || a.elapsed_time || 0), 0);
    
    let avgPaceStr: string | null = null;
    if (totalDistMeters > 0 && totalSeconds > 0) {
      const paceSecs = (totalSeconds / totalDistMeters) * 1000;
      avgPaceStr = formatSecondsToPace(paceSecs);
    }

    const hrActivities = dayActivities.filter((a) => a.avg_hr && a.avg_hr > 0);
    const avgHr = hrActivities.length > 0
      ? Math.round(hrActivities.reduce((acc, a) => acc + (a.avg_hr || 0), 0) / hrActivities.length)
      : null;

    const cadActivities = dayActivities.filter((a) => a.avg_cadence && a.avg_cadence > 0);
    const avgCadence = cadActivities.length > 0
      ? Math.round(cadActivities.reduce((acc, a) => acc + (a.avg_cadence || 0), 0) / cadActivities.length)
      : null;

    const elevationGain = dayActivities.reduce((acc, a) => acc + (a.total_elevation_gain || 0), 0);

    const cardioTelemetry: DayCardioTelemetry = {
      hasActivity: dayActivities.length > 0,
      activities: dayActivities,
      totalDistanceKm: Number((totalDistMeters / 1000).toFixed(2)),
      totalDurationMinutes: Math.round(totalSeconds / 60),
      avgPaceStr,
      avgHr,
      avgCadence,
      elevationGain,
    };

    // --- Gimnasio (Fuerza) ---
    const dayGymLogs = dbGymLogs.filter((l) => l.date === wDay.date);
    const totalSets = dayGymLogs.length;
    const totalVolumeKg = dayGymLogs.reduce((acc, l) => acc + (l.reps || 0) * (l.weight_kg || 0), 0);

    // Agrupar por ejercicio
    const exGroupMap = new Map<string, {
      name: string;
      category: string;
      setsCount: number;
      bestWeightKg: number;
      totalReps: number;
      volumeKg: number;
      isKneeProtector: boolean;
    }>();

    dayGymLogs.forEach((log) => {
      const exercise = log.exercise || exerciseMap.get(log.exercise_id);
      const exName = exercise?.name || `Ejercicio ${log.exercise_id}`;
      const exCategory = exercise?.category || 'Fuerza';
      const isProtector = isKneeProtectorExercise(exName);

      const existing = exGroupMap.get(exName) || {
        name: exName,
        category: exCategory,
        setsCount: 0,
        bestWeightKg: 0,
        totalReps: 0,
        volumeKg: 0,
        isKneeProtector: isProtector,
      };

      existing.setsCount += 1;
      existing.totalReps += log.reps || 0;
      existing.volumeKg += (log.reps || 0) * (log.weight_kg || 0);
      if ((log.weight_kg || 0) > existing.bestWeightKg) {
        existing.bestWeightKg = log.weight_kg || 0;
      }

      exGroupMap.set(exName, existing);
    });

    const gymTelemetry: DayGymTelemetry = {
      hasWorkout: totalSets > 0,
      workoutTitle: totalSets > 0 ? routine.title : null,
      totalSets,
      totalVolumeKg,
      exercisesLogged: Array.from(exGroupMap.values()),
    };

    // --- Nutrición & Agua ---
    const dayMeals = realMeals.filter((m) => m.date === wDay.date);
    const dayWater = dbWater.filter((w) => w.date === wDay.date);

    const totalKcal = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const totalProt = dayMeals.reduce((acc, m) => acc + (m.protein_g || 0), 0);
    const totalCarb = dayMeals.reduce((acc, m) => acc + (m.carbs_g || 0), 0);
    const totalFat = dayMeals.reduce((acc, m) => acc + (m.fat_g || 0), 0);
    const totalWaterMl = dayWater.reduce((acc, w) => acc + (w.amount_ml || 0), 0);

    const creatineLogged = dayMeals.some((m) => m.description?.toLowerCase().includes('creatina'));

    const nutritionTelemetry: DayNutritionTelemetry = {
      hasData: dayMeals.length > 0,
      mealsCount: dayMeals.length,
      totalCalories: totalKcal,
      totalProteinG: Math.round(totalProt),
      totalCarbsG: Math.round(totalCarb),
      totalFatG: Math.round(totalFat),
      waterMl: totalWaterMl,
      creatineLogged,
      meals: dayMeals,
    };

    // --- Peso corporal ---
    const dayWeightLog = dbWeights.find((w) => w.date === wDay.date);
    const weightTelemetry: DayWeightTelemetry = {
      logged: Boolean(dayWeightLog),
      weightKg: dayWeightLog?.weight_kg || null,
      notes: dayWeightLog?.notes,
    };

    return {
      date: wDay.date,
      dayName: wDay.dayName,
      dayIndex: idx + 1,
      isRestDay: wDay.isRestDay,
      routineScheduled: routine,
      health: healthTelemetry,
      cardio: cardioTelemetry,
      gym: gymTelemetry,
      nutrition: nutritionTelemetry,
      weight: weightTelemetry,
    };
  });

  // 4. Calcular Resumen Global Semanal
  const daysWithNutrition = daysTelemetry.filter((d) => d.nutrition.hasData);
  const daysWithHealth = daysTelemetry.filter((d) => d.health.hasData);

  const totalCardioKm = Number(
    daysTelemetry.reduce((acc, d) => acc + d.cardio.totalDistanceKm, 0).toFixed(2)
  );

  const cardioDays = daysTelemetry.filter((d) => d.cardio.hasActivity);
  const totalCardioSeconds = cardioDays.reduce((acc, d) => {
    return (
      acc +
      d.cardio.activities.reduce((sub, a) => sub + (a.moving_time || a.elapsed_time || 0), 0)
    );
  }, 0);

  let avgCardioPaceStr: string | null = null;
  if (totalCardioKm > 0 && totalCardioSeconds > 0) {
    const overallPaceSecs = (totalCardioSeconds / (totalCardioKm * 1000)) * 1000;
    avgCardioPaceStr = formatSecondsToPace(overallPaceSecs);
  }

  const totalGymVolumeKg = daysTelemetry.reduce((acc, d) => acc + d.gym.totalVolumeKg, 0);
  const gymSessionsCount = daysTelemetry.filter((d) => d.gym.hasWorkout).length;

  const kneeProtectorSetsCount = daysTelemetry.reduce((acc, d) => {
    return (
      acc +
      d.gym.exercisesLogged
        .filter((e) => e.isKneeProtector)
        .reduce((sub, e) => sub + e.setsCount, 0)
    );
  }, 0);

  // Pasos diarios promedio
  const allStepDays = daysTelemetry.filter((d) => d.health.steps > 0);
  const avgDailySteps = allStepDays.length > 0
    ? Math.round(allStepDays.reduce((acc, d) => acc + d.health.steps, 0) / allStepDays.length)
    : 0;

  const restStepDays = daysTelemetry.filter((d) => d.isRestDay && d.health.steps > 0);
  const restDaysAvgSteps = restStepDays.length > 0
    ? Math.round(restStepDays.reduce((acc, d) => acc + d.health.steps, 0) / restStepDays.length)
    : 0;

  const activeStepDays = daysTelemetry.filter((d) => !d.isRestDay && d.health.steps > 0);
  const activeDaysAvgSteps = activeStepDays.length > 0
    ? Math.round(activeStepDays.reduce((acc, d) => acc + d.health.steps, 0) / activeStepDays.length)
    : 0;

  // Promedio calórico y proteico considerando días con datos
  const avgDailyCalories = daysWithNutrition.length > 0
    ? Math.round(daysWithNutrition.reduce((acc, d) => acc + d.nutrition.totalCalories, 0) / daysWithNutrition.length)
    : 0;

  const avgDailyProteinG = daysWithNutrition.length > 0
    ? Math.round(daysWithNutrition.reduce((acc, d) => acc + d.nutrition.totalProteinG, 0) / daysWithNutrition.length)
    : 0;

  // Promedio de agua diario
  const daysWithWater = daysTelemetry.filter((d) => d.nutrition.waterMl > 0);
  const avgWaterLiters = daysWithWater.length > 0
    ? Number(
        (
          daysWithWater.reduce((acc, d) => acc + d.nutrition.waterMl, 0) /
          daysWithWater.length /
          1000
        ).toFixed(2)
      )
    : 0;

  // FC reposo y sueño
  const hrDays = daysTelemetry.filter((d) => d.health.restingHr && d.health.restingHr > 0);
  const avgRestingHr = hrDays.length > 0
    ? Math.round(hrDays.reduce((acc, d) => acc + (d.health.restingHr || 0), 0) / hrDays.length)
    : null;

  const sleepDays = daysTelemetry.filter((d) => d.health.sleepMinutes && d.health.sleepMinutes > 0);
  const avgSleepHours = sleepDays.length > 0
    ? Number(
        (
          sleepDays.reduce((acc, d) => acc + (d.health.sleepMinutes || 0), 0) /
          sleepDays.length /
          60
        ).toFixed(1)
      )
    : null;

  // Análisis de peso en la semana
  // Buscar el primer pesaje registrado en la semana y el último
  const weekWeightLogs = daysTelemetry
    .filter((d) => d.weight.logged && d.weight.weightKg)
    .map((d) => ({ date: d.date, kg: d.weight.weightKg as number }));

  let startWeightKg: number | null = null;
  let endWeightKg: number | null = null;
  let weightDeltaKg: number | null = null;

  if (weekWeightLogs.length > 0) {
    startWeightKg = weekWeightLogs[0].kg;
    endWeightKg = weekWeightLogs[weekWeightLogs.length - 1].kg;
    weightDeltaKg = Number((endWeightKg - startWeightKg).toFixed(2));
  } else {
    // Si no hay pesajes dentro de la semana, buscar el más reciente previo
    const sortedAll = [...dbWeights].sort((a, b) => b.date.localeCompare(a.date));
    if (sortedAll.length > 0) {
      endWeightKg = sortedAll[0].weight_kg;
    }
  }

  // Último peso conocido absoluto
  const sortedAbsolute = [...dbWeights].sort((a, b) => b.date.localeCompare(a.date));
  const latestWeightKg = sortedAbsolute.length > 0 ? sortedAbsolute[0].weight_kg : 101.0;

  const weekNumber = getCurrentWeekNumber(new Date(startDateStr));
  const countdown = getHalfMarathonCountdown(new Date(endDateStr));
  const progressionPlan = getRunningProgressionForWeek(weekNumber);

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    weekNumber,
    countdown,
    progressionPlan,
    days: daysTelemetry,
    summary: {
      daysWithNutritionCount: daysWithNutrition.length,
      daysWithHealthCount: daysWithHealth.length,
      totalCardioKm,
      avgCardioPaceStr,
      cardioSessionsCount: cardioDays.length,
      totalGymVolumeKg,
      gymSessionsCount,
      kneeProtectorSetsCount,
      avgDailySteps,
      restDaysAvgSteps,
      activeDaysAvgSteps,
      avgDailyCalories,
      avgDailyProteinG,
      avgWaterLiters,
      avgRestingHr,
      avgSleepHours,
      startWeightKg,
      endWeightKg,
      weightDeltaKg,
      latestWeightKg,
    },
  };
}
