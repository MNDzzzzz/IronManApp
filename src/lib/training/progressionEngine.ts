// ====================================================================
// MOTOR DE SOBRECARGA PROGRESIVA Y RPE PARA GIMNASIO (IronManApp)
// Especialista: Entrenamiento de Fuerza en Recomposición Corporal
// Cálculo 1-Tap de series previas, incrementos de carga y autorregulación.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

export interface ExerciseDefinition {
  id: string;
  name: string;
  target_reps: string;
  current_weight_kg: number;
  min_increment_kg?: number;
}

export interface GymSetLog {
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
  date?: string;
}

export interface ProgressionSuggestion {
  weight_kg: number;
  reps: number;
  rpe: number;
  mode: string;
  appliedIncrementKg?: number;
  appliedIncrementReps?: number;
  overloadType?: 'WEIGHT' | 'REPS' | 'NONE';
  isOverloadRecommended?: boolean;
  warningMessage?: string;
}

export class ProgressionEngine {
  /**
   * Calcula la prescripción de la siguiente serie a partir del histórico y definición del ejercicio.
   */
  static calculateNextSet(
    exercise: ExerciseDefinition,
    history: GymSetLog[]
  ): ProgressionSuggestion {
    // 1. Caso sin histórico: primera serie de la sesión o ejercicio nuevo
    if (!history || history.length === 0) {
      const lowerRepsMatch = exercise.target_reps.match(/\d+/);
      const initialReps = lowerRepsMatch ? parseInt(lowerRepsMatch[0], 10) : 8;

      return {
        weight_kg: exercise.current_weight_kg,
        reps: initialReps,
        rpe: 8,
        mode: 'BASELINE_INITIAL',
        overloadType: 'NONE',
        isOverloadRecommended: true,
      };
    }

    // 2. Caso con histórico: tomamos la última serie registrada
    const last = history[history.length - 1];

    // Autorregulación si el RPE previo fue excesivo (>= 9.5 al fallo muscular)
    if (last.rpe >= 9.5) {
      return {
        weight_kg: last.weight_kg,
        reps: last.reps,
        rpe: last.rpe,
        mode: 'AUTOREGULATED_FATIGUE',
        overloadType: 'NONE',
        isOverloadRecommended: false,
        warningMessage: 'RPE alto (fatiga neuromuscular extrema / RIR 0). No incrementar peso; conservar carga o descansar.',
      };
    }

    return {
      weight_kg: last.weight_kg,
      reps: last.reps,
      rpe: last.rpe,
      mode: 'PREVIOUS_MATCH',
      overloadType: 'NONE',
      isOverloadRecommended: true,
    };
  }

  /**
   * Clona exactamente los parámetros de la última serie completada (= Serie previa).
   */
  static getPreviousSetClone(history: GymSetLog[]): { weight_kg: number; reps: number; rpe: number } {
    if (!history || history.length === 0) {
      return { weight_kg: 0, reps: 0, rpe: 8 };
    }
    const last = history[history.length - 1];
    return {
      weight_kg: last.weight_kg,
      reps: last.reps,
      rpe: last.rpe,
    };
  }

  /**
   * Aplica un incremento de sobrecarga progresiva (+2.5 kg o +1 rep) sobre la última serie.
   */
  static applyOverload(
    exercise: ExerciseDefinition,
    history: GymSetLog[],
    mode: 'WEIGHT_BUMP' | 'REP_BUMP'
  ): ProgressionSuggestion {
    const base = this.getPreviousSetClone(history);
    const stepKg = exercise.min_increment_kg || 2.5;

    if (mode === 'WEIGHT_BUMP') {
      return {
        weight_kg: parseFloat((base.weight_kg + stepKg).toFixed(1)),
        reps: base.reps,
        rpe: base.rpe,
        mode: 'PROGRESSION_WEIGHT',
        appliedIncrementKg: stepKg,
        overloadType: 'WEIGHT',
        isOverloadRecommended: true,
      };
    }

    return {
      weight_kg: base.weight_kg,
      reps: base.reps + 1,
      rpe: base.rpe,
      mode: 'PROGRESSION_REPS',
      appliedIncrementReps: 1,
      overloadType: 'REPS',
      isOverloadRecommended: true,
    };
  }

  /**
   * Normaliza y valida los valores numéricos de una serie (enteros para reps, flotante para peso/RPE).
   */
  static sanitizeSet(set: { weight_kg?: number; reps?: number; rpe?: number }): {
    weight_kg: number;
    reps: number;
    rpe: number;
  } {
    return {
      weight_kg: typeof set.weight_kg === 'number' ? parseFloat(set.weight_kg.toFixed(1)) : 0,
      reps: typeof set.reps === 'number' ? Math.floor(set.reps) : 0,
      rpe: typeof set.rpe === 'number' ? parseFloat(set.rpe.toFixed(1)) : 8,
    };
  }
}
