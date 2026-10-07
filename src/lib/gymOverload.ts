// ====================================================================
// GESTOR DE SOBRECARGA PROGRESIVA Y ESCALA RPE (IronManApp)
// Funcionalidad P1.2: Resolución determinista de series de referencia,
// cálculo de atajos de sobrecarga a 1-tap y escala táctil de RPE (6-10).
// Especialista: Prescripción de Fuerza & Recomposición Articular Anti-impacto
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { GymExercise, GymWorkoutLog } from '@/types/database';

/**
 * Representa la serie de referencia resuelta para calcular la sobrecarga progresiva.
 */
export interface OverloadReference {
  weight_kg: number;
  reps: number;
  rpe: number;
  source: 'today_previous_set' | 'last_session_benchmark' | 'exercise_target' | 'baseline_fallback';
  label: string;
  isToday: boolean;
  date?: string;
  set_number?: number;
}

/**
 * Acciones de sobrecarga progresiva disponibles en 1-tap.
 */
export type OverloadActionType = 'same' | 'weight_plus' | 'rep_plus';

/**
 * Opción de sobrecarga individual lista para pre-llenar en la interfaz.
 */
export interface OverloadOption {
  action: OverloadActionType;
  label: string;          // '= Serie previa', '+2.5 kg', '+1 rep'
  weight_kg: number;
  reps: number;
  rpe: number;
  displayText: string;    // ej: '60 kg × 8 reps' o 'PC × 8 reps'
  badgeText: string;      // ej: 'Repetir', '+Carga', '+Volumen'
  deltaWeight: number;    // ej: 0, 2.5
  deltaReps: number;      // ej: 0, 1
}

/**
 * Estructura polimórfica que funciona tanto como Array indexado
 * como objeto de acceso directo por clave (.same, .weight_plus, .rep_plus).
 */
export interface OverloadOptionsResult extends Array<OverloadOption> {
  same: OverloadOption;
  weight_plus: OverloadOption;
  rep_plus: OverloadOption;
  options: OverloadOption[];
  '= Serie previa': OverloadOption;
  '+2.5 kg': OverloadOption;
  '+1 rep': OverloadOption;
}

/**
 * Punto individual de la escala de RPE táctil de 8 posiciones.
 */
export interface RpeScaleItem {
  value: number;
  label: string;
  rir: string;
  rirText: string;
  badge: string;
  description: string;
  intensityLevel: 'easy' | 'optimal' | 'hard' | 'maximum';
  colorClasses: {
    badgeBg: string;
    badgeText: string;
    border: string;
    activeBg: string;
    activeText: string;
    glow: string;
  };
}

/**
 * Escala táctil estandarizada de 8 puntos RPE con equivalencias RIR
 * (Repeticiones en Reserva) y categorización biomecánica de fatiga.
 */
export const RPE_SCALE: RpeScaleItem[] = [
  {
    value: 6,
    label: '6',
    rir: '4 RIR',
    rirText: '4 RIR',
    badge: '4 RIR',
    description: 'Velocidad máxima, 4 o más repeticiones en reserva.',
    intensityLevel: 'easy',
    colorClasses: {
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-400',
      border: 'border-emerald-500/30',
      activeBg: 'bg-emerald-500',
      activeText: 'text-white',
      glow: 'shadow-emerald-500/20',
    },
  },
  {
    value: 7,
    label: '7',
    rir: '3 RIR',
    rirText: '3 RIR',
    badge: '3 RIR',
    description: 'Carga moderada, 3 repeticiones en recámara.',
    intensityLevel: 'easy',
    colorClasses: {
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-400',
      border: 'border-emerald-500/30',
      activeBg: 'bg-emerald-500',
      activeText: 'text-white',
      glow: 'shadow-emerald-500/20',
    },
  },
  {
    value: 7.5,
    label: '7.5',
    rir: '2.5 RIR',
    rirText: '2.5 RIR',
    badge: '2.5 RIR',
    description: 'Esfuerzo sólido, 2-3 repeticiones en recámara.',
    intensityLevel: 'optimal',
    colorClasses: {
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      border: 'border-blue-500/30',
      activeBg: 'bg-[#2D68C4]',
      activeText: 'text-white',
      glow: 'shadow-blue-500/25',
    },
  },
  {
    value: 8,
    label: '8',
    rir: '2 RIR',
    rirText: '2 RIR',
    badge: '2 RIR',
    description: 'Rango objetivo óptimo para fuerza/hipertrofia, 2 repeticiones en recámara.',
    intensityLevel: 'optimal',
    colorClasses: {
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      border: 'border-blue-500/30',
      activeBg: 'bg-[#2D68C4]',
      activeText: 'text-white',
      glow: 'shadow-blue-500/25',
    },
  },
  {
    value: 8.5,
    label: '8.5',
    rir: '1.5 RIR',
    rirText: '1.5 RIR',
    badge: '1.5 RIR',
    description: 'Exigente, 1-2 repeticiones en recámara.',
    intensityLevel: 'optimal',
    colorClasses: {
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      border: 'border-blue-500/30',
      activeBg: 'bg-[#2D68C4]',
      activeText: 'text-white',
      glow: 'shadow-blue-500/25',
    },
  },
  {
    value: 9,
    label: '9',
    rir: '1 RIR',
    rirText: '1 RIR',
    badge: '1 RIR',
    description: 'Carga pesada, solo 1 repetición más posible.',
    intensityLevel: 'hard',
    colorClasses: {
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-400',
      border: 'border-amber-500/30',
      activeBg: 'bg-amber-500',
      activeText: 'text-stone-900',
      glow: 'shadow-amber-500/25',
    },
  },
  {
    value: 9.5,
    label: '9.5',
    rir: '0.5 RIR',
    rirText: '0.5 RIR',
    badge: '0.5 RIR',
    description: 'Límite absoluto, tal vez media repetición más.',
    intensityLevel: 'hard',
    colorClasses: {
      badgeBg: 'bg-orange-500/10',
      badgeText: 'text-orange-400',
      border: 'border-orange-500/30',
      activeBg: 'bg-orange-500',
      activeText: 'text-stone-900',
      glow: 'shadow-orange-500/25',
    },
  },
  {
    value: 10,
    label: '10',
    rir: 'Fallo',
    rirText: 'Fallo',
    badge: 'Fallo',
    description: 'Fallo técnico concéntrico, esfuerzo máximo sin reserva.',
    intensityLevel: 'maximum',
    colorClasses: {
      badgeBg: 'bg-rose-500/10',
      badgeText: 'text-rose-400',
      border: 'border-rose-500/30',
      activeBg: 'bg-rose-500',
      activeText: 'text-white',
      glow: 'shadow-rose-500/30',
    },
  },
];

/**
 * Obtiene la definición completa de un valor de RPE en la escala táctil.
 */
export function getRpeScaleItem(rpeValue: number): RpeScaleItem {
  const exact = RPE_SCALE.find((item) => item.value === rpeValue);
  if (exact) return exact;

  // Buscar el más cercano si no es un valor estándar
  const sorted = [...RPE_SCALE].sort((a, b) => Math.abs(a.value - rpeValue) - Math.abs(b.value - rpeValue));
  return sorted[0];
}

/**
 * Parsea cadenas de texto de repeticiones objetivo (ej: "6-8 reps", "8-10", "12 reps", "60 seg")
 * extrayendo un número entero seguro con fallback predeterminado a 8.
 */
export function parseTargetReps(targetRepsStr?: string | null): number {
  if (!targetRepsStr || typeof targetRepsStr !== 'string') {
    return 8;
  }
  const match = targetRepsStr.match(/\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 8;
  }
  return 8;
}

/**
 * Resuelve la serie de referencia para el cálculo de sobrecarga progresiva.
 * Regla de precedencia:
 * 1. Última serie realizada hoy para el ejercicio.
 * 2. Mejor serie de la última sesión histórica anterior (mayor peso y reps).
 * 3. Parámetros base del catálogo del ejercicio (current_weight_kg y target_reps).
 * 4. Fallback base (0 kg, 8 reps, RPE 8).
 *
 * Soporta polimorfismo de argumentos:
 * - getExerciseReferenceSet(logs, exercise, todayStr)
 * - getExerciseReferenceSet(exerciseId, exercise, logs, todayDateStr)
 */
export function getExerciseReferenceSet(
  logs: GymWorkoutLog[],
  exercise?: GymExercise | null,
  todayStr?: string
): OverloadReference;
export function getExerciseReferenceSet(
  exerciseId: string,
  exercise: GymExercise | undefined | null,
  logs: GymWorkoutLog[],
  todayDateStr: string
): OverloadReference;
export function getExerciseReferenceSet(
  arg1: GymWorkoutLog[] | string,
  arg2?: GymExercise | GymWorkoutLog[] | null,
  arg3?: string | GymWorkoutLog[] | null,
  arg4?: string
): OverloadReference {
  let logs: GymWorkoutLog[] = [];
  let exercise: GymExercise | null = null;
  let todayStr = new Date().toISOString().split('T')[0];
  let exerciseId = '';

  if (Array.isArray(arg1)) {
    // Firma 1: (logs, exercise, todayStr)
    logs = arg1;
    exercise = (arg2 as GymExercise) ?? null;
    if (typeof arg3 === 'string') {
      todayStr = arg3;
    }
    exerciseId = exercise?.id ?? '';
  } else if (typeof arg1 === 'string') {
    // Firma 2: (exerciseId, exercise, logs, todayDateStr)
    exerciseId = arg1;
    exercise = (arg2 as GymExercise) ?? null;
    if (Array.isArray(arg3)) {
      logs = arg3;
    }
    if (typeof arg4 === 'string') {
      todayStr = arg4;
    }
  }

  // Si no se asignó exerciseId pero tenemos exercise, resolverlo
  if (!exerciseId && exercise?.id) {
    exerciseId = exercise.id;
  }

  // 1. REGLA DE PRIORIDAD: Series completadas HOY
  const todayLogs = logs.filter(
    (l) => (!exerciseId || l.exercise_id === exerciseId) && l.date === todayStr
  );

  if (todayLogs.length > 0) {
    // Ordenar de forma descendente por número de serie
    const sortedToday = [...todayLogs].sort((a, b) => {
      if (b.set_number !== a.set_number) return b.set_number - a.set_number;
      if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at);
      return 0;
    });
    const lastToday = sortedToday[0];
    return {
      weight_kg: Number(lastToday.weight_kg) || 0,
      reps: Number(lastToday.reps) || 0,
      rpe: typeof lastToday.rpe === 'number' ? lastToday.rpe : 8,
      source: 'today_previous_set',
      label: `Serie #${lastToday.set_number} de hoy`,
      isToday: true,
      date: todayStr,
      set_number: lastToday.set_number,
    };
  }

  // 2. REGLA DE SESIÓN PREVIA: Series registradas en fechas anteriores
  const previousLogs = logs.filter(
    (l) => (!exerciseId || l.exercise_id === exerciseId) && l.date !== todayStr
  );

  if (previousLogs.length > 0) {
    const dates = Array.from(new Set(previousLogs.map((l) => l.date))).sort().reverse();
    const latestDate = dates[0];
    const sessionSets = previousLogs.filter((l) => l.date === latestDate);

    // Seleccionar la mejor serie (mayor peso, desempate por reps y serie)
    const bestSet = [...sessionSets].sort(
      (a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps || b.set_number - a.set_number
    )[0];

    if (bestSet) {
      return {
        weight_kg: Number(bestSet.weight_kg) || 0,
        reps: Number(bestSet.reps) || 0,
        rpe: typeof bestSet.rpe === 'number' ? bestSet.rpe : 8,
        source: 'last_session_benchmark',
        label: `Sesión anterior (${latestDate})`,
        isToday: false,
        date: latestDate,
        set_number: bestSet.set_number,
      };
    }
  }

  // 3. REGLA DE CATÁLOGO: Definición objetivo del ejercicio
  if (exercise) {
    const targetWeight = typeof exercise.current_weight_kg === 'number' ? exercise.current_weight_kg : 0;
    const targetReps = parseTargetReps(exercise.target_reps);
    return {
      weight_kg: targetWeight,
      reps: targetReps,
      rpe: 8,
      source: 'exercise_target',
      label: 'Objetivo de catálogo',
      isToday: false,
    };
  }

  // 4. FALLBACK BASE
  return {
    weight_kg: 0,
    reps: 8,
    rpe: 8,
    source: 'baseline_fallback',
    label: 'Carga base inicial',
    isToday: false,
  };
}

/**
 * Calcula las 3 opciones de sobrecarga progresiva a partir de una serie de referencia:
 * - '= Serie previa': mismo peso y repeticiones.
 * - '+2.5 kg': mismo peso + 2.5 kg (si peso corporal 0 kg, fija 2.5 kg de carga añadida).
 * - '+1 rep': peso idéntico y repeticiones + 1.
 */
export function calculateOverloadOptions(
  referenceSet?: Partial<OverloadReference> | null
): OverloadOptionsResult {
  const baseWeight = typeof referenceSet?.weight_kg === 'number' ? referenceSet.weight_kg : 0;
  const baseReps = typeof referenceSet?.reps === 'number' && referenceSet.reps > 0 ? referenceSet.reps : 8;
  const baseRpe = typeof referenceSet?.rpe === 'number' ? referenceSet.rpe : 8;

  // 1. = Serie previa
  const sameOption: OverloadOption = {
    action: 'same',
    label: '= Serie previa',
    weight_kg: baseWeight,
    reps: baseReps,
    rpe: baseRpe,
    displayText: `${baseWeight > 0 ? `${baseWeight} kg` : 'PC'} × ${baseReps} reps`,
    badgeText: 'Repetir',
    deltaWeight: 0,
    deltaReps: 0,
  };

  // 2. +2.5 kg (Micro-carga progresiva)
  // Redondeo determinista a 1 decimal para evitar artefactos IEEE-754
  const incrementedWeight = Math.round((baseWeight + 2.5) * 10) / 10;
  const weightPlusOption: OverloadOption = {
    action: 'weight_plus',
    label: '+2.5 kg',
    weight_kg: incrementedWeight,
    reps: baseReps,
    rpe: baseRpe,
    displayText: `${incrementedWeight} kg × ${baseReps} reps`,
    badgeText: '+Carga',
    deltaWeight: 2.5,
    deltaReps: 0,
  };

  // 3. +1 rep (Sobrecarga de volumen)
  const incrementedReps = baseReps + 1;
  const repPlusOption: OverloadOption = {
    action: 'rep_plus',
    label: '+1 rep',
    weight_kg: baseWeight,
    reps: incrementedReps,
    rpe: baseRpe,
    displayText: `${baseWeight > 0 ? `${baseWeight} kg` : 'PC'} × ${incrementedReps} reps`,
    badgeText: '+Volumen',
    deltaWeight: 0,
    deltaReps: 1,
  };

  const optionsList = [sameOption, weightPlusOption, repPlusOption];
  const result = optionsList as unknown as OverloadOptionsResult;

  // Acceso por propiedades de conveniencia
  result.same = sameOption;
  result.weight_plus = weightPlusOption;
  result.rep_plus = repPlusOption;
  result.options = optionsList;
  result['= Serie previa'] = sameOption;
  result['+2.5 kg'] = weightPlusOption;
  result['+1 rep'] = repPlusOption;

  return result;
}

/**
 * Retorna recomendación de fatiga articular o neuromuscular según el RPE.
 */
export function getRpeClinicalNote(rpeValue: number): string {
  if (rpeValue >= 9.5) {
    return 'Fatiga neuromuscular máxima (RIR 0). Riesgo alto de impacto articular residual si sales a rodar hoy.';
  }
  if (rpeValue >= 9) {
    return 'Esfuerzo límite (RIR 1). Mantén recuperación completa entre series (2-3 min) para preservar la rodilla.';
  }
  if (rpeValue >= 7.5) {
    return 'Rango biomecánico ideal (RIR 1.5 - 2.5). Estímulo óptimo de hipertrofia sin interferir con la carrera.';
  }
  return 'Esfuerzo ligero/moderado (RIR 3+). Excelente velocidad concéntrica y mínimo desgaste tendinoso.';
}
