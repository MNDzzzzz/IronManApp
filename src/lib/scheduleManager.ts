// ====================================================================
// MOTOR DE CALENDARIO MODULAR Y RUTINAS: IronManApp
// Permite intercambiar días, reasignar entrenamientos por imprevistos,
// adaptar la programación sobre la marcha y sincronizar Web & Telegram.
// ====================================================================

import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { RoutineDayOverride, RoutineKey } from '@/types/database';
import {
  WEEKLY_ROUTINE,
  DayRoutine,
  getTodayRoutine,
  getSpainDate,
  getCurrentWeekNumber,
  getRunningProgressionForWeek,
} from '@/lib/weeklyRoutine';

/**
 * Catálogo canónico de plantillas base de entrenamiento y descanso
 */
export const CANONICAL_ROUTINES: Record<
  RoutineKey,
  {
    routineKey: RoutineKey;
    title: string;
    category: 'Fuerza' | 'Cardio' | 'Descanso';
    dayType: 'strength' | 'running' | 'rest_refeed';
    description: string;
    targetSteps: { min: number; max: number; note: string };
    defaultExercises: string[];
  }
> = {
  strength_torso: {
    routineKey: 'strength_torso',
    title: 'Fuerza Torso (Empuje + Tirón)',
    category: 'Fuerza',
    dayType: 'strength',
    description: 'Empuje y tracción para hipertrofia de torso y postura erguida. Cero estrés en rodilla.',
    targetSteps: { min: 10000, max: 11500, note: 'Mantén actividad moderada.' },
    defaultExercises: [
      'Press de banca con mancuernas: 4 series × 8-10 reps',
      'Remo en polea baja o con barra: 4 series × 8-10 reps',
      'Press militar con mancuernas: 3 series × 10 reps',
      'Jalón al pecho agarre neutro: 3 series × 10-12 reps',
      'Face pulls en polea: 3 series × 15 reps',
      'Bíceps con mancuerna + Tríceps en cuerda: 3 series × 12 reps',
    ],
  },
  strength_pierna: {
    routineKey: 'strength_pierna',
    title: 'Fuerza Pierna Blindada (Anti-Impacto & Isométricos)',
    category: 'Fuerza',
    dayType: 'strength',
    description: 'Refuerzo de cuádriceps, glúteo medio y pantorrilla para disipar el choque en rodillas.',
    targetSteps: { min: 10000, max: 11000, note: 'Protege las articulaciones.' },
    defaultExercises: [
      'Sentadilla isométrica en pared (Wall-sits): 4 series × 35-45 seg',
      'Prensa inclinada: 3-4 series × 8-10 reps',
      'Abducción de cadera en máquina/banda: 4 series × 15 reps',
      'Curl femoral sentado: 3 series × 10-12 reps',
      'Elevación de talones excéntrica: 4 series × 15 reps',
      'Plancha lateral antirrotacional: 3 series × 40 seg',
    ],
  },
  strength_fullbody: {
    routineKey: 'strength_fullbody',
    title: 'Fuerza Full Body Funcional + Bici Suave',
    category: 'Fuerza',
    dayType: 'strength',
    description: 'Estímulo global de fuerza + 20 min de cardio sin impacto en bici para oxigenar rodillas.',
    targetSteps: { min: 10000, max: 11500, note: 'Recuperación activa.' },
    defaultExercises: [
      'Sentadilla búlgara / prensa: 3 series × 8-10 reps',
      'Press inclinado con mancuernas: 3 series × 10 reps',
      'Peso muerto rumano: 3 series × 10 reps',
      'Remo unilateral con mancuerna: 3 series × 10 reps',
      'Clamshell con banda elástica: 3 series × 15 reps/lado',
      '20 min bicicleta estática suave (sillín alto, cero impacto)',
    ],
  },
  running_base: {
    routineKey: 'running_base',
    title: 'Carrera: Rodaje Base Aeróbico (Zona 2)',
    category: 'Cardio',
    dayType: 'running',
    description: 'Volumen aeróbico suave en Zona 2 (>7:15 min/km) con cadencia 165-172 ppm.',
    targetSteps: { min: 12000, max: 14000, note: 'Sumarás pasos corriendo.' },
    defaultExercises: [
      'Rodaje suave en Zona 2 controlada (4 a 6 km según semana de periodización)',
      'Cadencia objetivo: 168-172 pasos por minuto',
      'Apoyo riguroso debajo del centro de gravedad (evitar talonar adelantado)',
      'Wall-sits 3x35s pre-carrera + Frío 10 min post-carrera',
    ],
  },
  running_long: {
    routineKey: 'running_long',
    title: 'Tirada Larga Semanal (Sesión Reina CaCo / Progresiva)',
    category: 'Cardio',
    dayType: 'running',
    description: 'Sesión reina de volumen progresivo con gestión de impacto (CaCo) hacia la media maratón.',
    targetSteps: { min: 13000, max: 16000, note: 'Tirada dominical larga.' },
    defaultExercises: [
      'Tirada larga de la semana (5 a 19 km según fase del plan)',
      'Estrategia CaCo: 4 min trote suave + 1 min andar ágil',
      'Hidratación con sales cada 20-25 minutos',
      'Pelota miofascial bajo planta de pie 2 min + descanso de piernas en alto',
    ],
  },
  rest: {
    routineKey: 'rest',
    title: 'Descanso Total 100% & Descompresión Tendinosa',
    category: 'Descanso',
    dayType: 'rest_refeed',
    description: 'Desconexión y regeneración absoluta. Tope de pasos bajo para desinflamar el tubérculo de Gerdy.',
    targetSteps: { min: 8000, max: 9000, note: 'Tope estricto de pasos para no inflamar tendones.' },
    defaultExercises: [
      'Reposo pasivo total (evitar caminatas largas)',
      'Tope de pasos: máximo 8.000 a 9.000 pasos en el día',
      'Piernas en alto 10-15 minutos tras la jornada',
      'Recarga de glucógeno limpia e hidratación con agua mineral',
    ],
  },
  custom: {
    routineKey: 'custom',
    title: 'Sesión Adaptada Personalizada',
    category: 'Fuerza',
    dayType: 'strength',
    description: 'Sesión modificada a medida según disponibilidad o sensaciones articulares.',
    targetSteps: { min: 9000, max: 11000, note: 'Ajuste personalizado.' },
    defaultExercises: ['Sesión libre / adaptada según el estado del atleta'],
  },
};

/**
 * Consulta la rutina efectiva de una fecha concreta (con soporte de overrides)
 */
export async function getEffectiveRoutineForDate(dateStr: string): Promise<{
  routine: DayRoutine;
  isOverridden: boolean;
  overrideNotes?: string;
  routineKey: RoutineKey;
}> {
  // 1. Buscar si hay override en Supabase o en mockStore
  let override: RoutineDayOverride | null = null;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('routine_day_overrides')
        .select('*')
        .eq('date', dateStr)
        .maybeSingle();

      if (data) override = data;
    } catch (err) {
      console.warn('Aviso consultando routine_day_overrides en Supabase:', err);
    }
  }

  if (!override && mockStore.routineDayOverrides) {
    override = mockStore.routineDayOverrides.find((o) => o.date === dateStr) || null;
  }

  // 2. Si hay override, construir la rutina adaptada
  if (override) {
    const canonical = CANONICAL_ROUTINES[override.routine_key] || CANONICAL_ROUTINES.custom;
    const baseDefault = getTodayRoutine(dateStr);

    const effectiveRoutine: DayRoutine = {
      ...baseDefault,
      title: override.title || canonical.title,
      category: override.category || canonical.category,
      dayType: override.day_type || canonical.dayType,
      description: override.description || canonical.description,
      targetSteps: {
        min: override.target_steps_min || canonical.targetSteps.min,
        max: override.target_steps_max || canonical.targetSteps.max,
        note: canonical.targetSteps.note,
      },
      workoutSummary: override.custom_exercises && override.custom_exercises.length > 0
        ? override.custom_exercises
        : canonical.defaultExercises,
    };

    return {
      routine: effectiveRoutine,
      isOverridden: true,
      overrideNotes: override.notes,
      routineKey: override.routine_key,
    };
  }

  // 3. Si no hay override, usar la rutina por defecto del día de la semana
  const defaultRoutine = getTodayRoutine(dateStr);
  let defaultKey: RoutineKey = 'rest';
  if (defaultRoutine.dayName === 'Lunes') defaultKey = 'strength_torso';
  else if (defaultRoutine.dayName === 'Martes') defaultKey = 'strength_pierna';
  else if (defaultRoutine.dayName === 'Miércoles') defaultKey = 'rest';
  else if (defaultRoutine.dayName === 'Jueves') defaultKey = 'running_base';
  else if (defaultRoutine.dayName === 'Viernes') defaultKey = 'strength_fullbody';
  else if (defaultRoutine.dayName === 'Sábado') defaultKey = 'rest';
  else if (defaultRoutine.dayName === 'Domingo') defaultKey = 'running_long';

  return {
    routine: defaultRoutine,
    isOverridden: false,
    routineKey: defaultKey,
  };
}

/**
 * Guarda o actualiza una sobreescritura de entrenamiento para una fecha
 */
export async function setDayRoutineOverride(
  dateOrOptions:
    | string
    | {
        date: string;
        routineKey: RoutineKey;
        title?: string;
        category?: 'Fuerza' | 'Cardio' | 'Descanso';
        dayType?: 'strength' | 'running' | 'rest_refeed';
        description?: string;
        targetStepsMin?: number;
        targetStepsMax?: number;
        customExercises?: string[];
        notes?: string;
      },
  routineKeyParam?: RoutineKey,
  optionsParam: {
    customTitle?: string;
    notes?: string;
    customExercises?: string[];
  } = {}
): Promise<RoutineDayOverride & { success: boolean; message: string; override: RoutineDayOverride }> {
  let dateStr: string;
  let routineKey: RoutineKey;
  let customTitle: string | undefined;
  let notes: string | undefined;
  let customExercises: string[] | undefined;
  let categoryOverride: 'Fuerza' | 'Cardio' | 'Descanso' | undefined;
  let dayTypeOverride: 'strength' | 'running' | 'rest_refeed' | undefined;
  let descriptionOverride: string | undefined;
  let targetStepsMinOverride: number | undefined;
  let targetStepsMaxOverride: number | undefined;

  if (typeof dateOrOptions === 'object') {
    dateStr = dateOrOptions.date;
    routineKey = dateOrOptions.routineKey;
    customTitle = dateOrOptions.title;
    notes = dateOrOptions.notes;
    customExercises = dateOrOptions.customExercises;
    categoryOverride = dateOrOptions.category;
    dayTypeOverride = dateOrOptions.dayType;
    descriptionOverride = dateOrOptions.description;
    targetStepsMinOverride = dateOrOptions.targetStepsMin;
    targetStepsMaxOverride = dateOrOptions.targetStepsMax;
  } else {
    dateStr = dateOrOptions;
    routineKey = routineKeyParam || 'custom';
    customTitle = optionsParam.customTitle;
    notes = optionsParam.notes;
    customExercises = optionsParam.customExercises;
  }

  const canonical = CANONICAL_ROUTINES[routineKey] || CANONICAL_ROUTINES.custom;

  const override: RoutineDayOverride = {
    id: `override-${dateStr}`,
    date: dateStr,
    routine_key: routineKey,
    title: customTitle || canonical.title,
    category: categoryOverride || canonical.category,
    day_type: dayTypeOverride || canonical.dayType,
    description: descriptionOverride || canonical.description,
    target_steps_min: targetStepsMinOverride || canonical.targetSteps.min,
    target_steps_max: targetStepsMaxOverride || canonical.targetSteps.max,
    custom_exercises: customExercises || canonical.defaultExercises,
    notes: notes || `Reasignado manualmente`,
    created_at: new Date().toISOString(),
  };

  // Persistir en Supabase
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('routine_day_overrides')
        .upsert(override, { onConflict: 'date' });
    } catch (err) {
      console.warn('Error guardando override en Supabase:', err);
    }
  }

  // Persistir en memoria
  if (!mockStore.routineDayOverrides) mockStore.routineDayOverrides = [];
  const existingIdx = mockStore.routineDayOverrides.findIndex((o) => o.date === dateStr);
  if (existingIdx >= 0) {
    mockStore.routineDayOverrides[existingIdx] = override;
  } else {
    mockStore.routineDayOverrides.push(override);
  }

  return {
    ...override,
    success: true,
    message: `Sesión de ${dateStr} configurada como "${override.title}".`,
    override,
  };
}

/**
 * Intercambia las sesiones de entrenamiento entre dos fechas (ej: ayer con hoy, o jueves con viernes)
 */
export async function swapScheduleDays(
  dateA: string,
  dateB: string,
  reason = 'Intercambio de días programado'
): Promise<{
  success: boolean;
  message: string;
  dateA: RoutineDayOverride;
  dateB: RoutineDayOverride;
}> {
  // Obtener rutinas efectivas actuales de ambas fechas
  const currentA = await getEffectiveRoutineForDate(dateA);
  const currentB = await getEffectiveRoutineForDate(dateB);

  // La fecha A adopta la rutina de la fecha B
  const overrideA = await setDayRoutineOverride(dateA, currentB.routineKey, {
    customTitle: currentB.routine.title,
    notes: `${reason} (recibió la sesión del ${dateB})`,
    customExercises: currentB.routine.workoutSummary,
  });

  // La fecha B adopta la rutina que tenía la fecha A
  const overrideB = await setDayRoutineOverride(dateB, currentA.routineKey, {
    customTitle: currentA.routine.title,
    notes: `${reason} (recibió la sesión del ${dateA})`,
    customExercises: currentA.routine.workoutSummary,
  });

  const message = `Días intercambiados con éxito: ${dateA} pasa a ser "${overrideA.title}" y ${dateB} pasa a ser "${overrideB.title}".`;

  return { success: true, message, dateA: overrideA, dateB: overrideB };
}

/**
 * Elimina el override de una fecha y restablece la rutina por defecto de ese día
 */
export async function resetDayRoutineOverride(
  dateStr: string
): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('routine_day_overrides').delete().eq('date', dateStr);
    } catch (err) {
      console.warn('Error eliminando override en Supabase:', err);
    }
  }

  if (mockStore.routineDayOverrides) {
    mockStore.routineDayOverrides = mockStore.routineDayOverrides.filter((o) => o.date !== dateStr);
  }

  return {
    success: true,
    message: `Plan del día ${dateStr} restablecido a su programación original por defecto.`,
  };
}

/**
 * Obtiene la programación completa de una semana (Lunes a Domingo) con los overrides aplicados
 */
export async function getWeekSchedule(
  dateOrStartDate: string,
  endDateStr?: string
): Promise<
  Array<{
    date: string;
    dayName: string;
    routine: DayRoutine;
    routineKey: RoutineKey;
    isOverridden: boolean;
    notes?: string;
  }>
> {
  let start: Date;
  if (!endDateStr) {
    // Si solo se proporciona una fecha, calculamos el lunes de esa semana
    const ref = new Date(dateOrStartDate + 'T12:00:00Z');
    const day = ref.getUTCDay(); // 0 = Domingo
    const diff = day === 0 ? -6 : 1 - day;
    start = new Date(ref);
    start.setUTCDate(ref.getUTCDate() + diff);
  } else {
    start = new Date(dateOrStartDate + 'T12:00:00Z');
  }

  const result = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const dateStr = cur.toISOString().split('T')[0];

    const effective = await getEffectiveRoutineForDate(dateStr);
    result.push({
      date: dateStr,
      dayName: effective.routine.dayName,
      routine: effective.routine,
      routineKey: effective.routineKey,
      isOverridden: effective.isOverridden,
      notes: effective.overrideNotes,
    });
  }

  return result;
}
