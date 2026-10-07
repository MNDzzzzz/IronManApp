import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressionEngine, GymSetLog, ExerciseDefinition } from '../src/lib/training/progressionEngine';
import {
  getExerciseReferenceSet,
  calculateOverloadOptions,
  parseTargetReps,
  RPE_SCALE,
  getRpeScaleItem,
  getRpeClinicalNote,
  OverloadReference,
} from '../src/lib/gymOverload';
import { GymExercise, GymWorkoutLog } from '../src/types/database';

describe('P1.2: 1-Tap Gym Progressive Overload & RPE Engine (ProgressionEngine Legacy)', () => {
  const dummyExercise: ExerciseDefinition = {
    id: 'ex-bench-press',
    name: 'Press de Banca Plano con Mancuernas',
    target_reps: '8-10',
    current_weight_kg: 24,
    min_increment_kg: 2.5,
  };

  it('CASO 1: Primera sesión sin histórico previo retorna valores base de catálogo', () => {
    const history: GymSetLog[] = [];
    const suggestion = ProgressionEngine.calculateNextSet(dummyExercise, history);

    assert.strictEqual(suggestion.weight_kg, 24, 'Debe pre-llenar con current_weight_kg del ejercicio');
    assert.strictEqual(suggestion.reps, 8, 'Debe pre-llenar con el límite inferior del rango target_reps');
    assert.strictEqual(suggestion.rpe, 8, 'RPE base sugerido debe ser 8');
    assert.strictEqual(suggestion.mode, 'BASELINE_INITIAL');
  });

  it('CASO 2: Sesión con histórico previo clona la última serie ejecutada (= Serie Previa)', () => {
    const history: GymSetLog[] = [
      { set_number: 1, weight_kg: 26, reps: 10, rpe: 8, date: '2026-10-01' },
      { set_number: 2, weight_kg: 26, reps: 10, rpe: 8.5, date: '2026-10-01' },
      { set_number: 3, weight_kg: 26, reps: 9, rpe: 9, date: '2026-10-01' },
    ];

    const suggestion = ProgressionEngine.getPreviousSetClone(history);

    assert.strictEqual(suggestion.weight_kg, 26, 'El peso debe ser exactamente 26 kg');
    assert.strictEqual(suggestion.reps, 9, 'Las reps deben clonar la última serie completada');
    assert.strictEqual(suggestion.rpe, 9);
  });

  it('CASO 3: Incremento de Sobrecarga por Carga (+2.5 kg) cuando RPE previo es sólido (<= 8)', () => {
    const lastSessionSets: GymSetLog[] = [
      { set_number: 1, weight_kg: 30, reps: 10, rpe: 7.5, date: '2026-10-01' },
      { set_number: 2, weight_kg: 30, reps: 10, rpe: 8, date: '2026-10-01' },
    ];

    const suggestion = ProgressionEngine.applyOverload(dummyExercise, lastSessionSets, 'WEIGHT_BUMP');

    assert.strictEqual(suggestion.weight_kg, 32.5, 'Debe incrementar exactamente 2.5 kg sobre los 30 kg');
    assert.strictEqual(suggestion.reps, 10, 'Conserva el número de repeticiones');
    assert.strictEqual(suggestion.appliedIncrementKg, 2.5);
    assert.strictEqual(suggestion.overloadType, 'WEIGHT');
  });

  it('CASO 4: Incremento de Sobrecarga por Repeticiones (+1 rep) conservando peso', () => {
    const lastSessionSets: GymSetLog[] = [
      { set_number: 1, weight_kg: 50, reps: 8, rpe: 7.5, date: '2026-10-01' },
    ];

    const suggestion = ProgressionEngine.applyOverload(dummyExercise, lastSessionSets, 'REP_BUMP');

    assert.strictEqual(suggestion.weight_kg, 50, 'Conserva el peso de 50 kg');
    assert.strictEqual(suggestion.reps, 9, 'Debe sumar exactamente 1 repetición');
    assert.strictEqual(suggestion.appliedIncrementReps, 1);
    assert.strictEqual(suggestion.overloadType, 'REPS');
  });

  it('CASO 5: Bloqueo de sobrecarga automática y autorregulación si el RPE previo fue excesivo (>= 9.5)', () => {
    const failureHistory: GymSetLog[] = [
      { set_number: 1, weight_kg: 40, reps: 6, rpe: 10, date: '2026-10-01' },
    ];

    const suggestion = ProgressionEngine.calculateNextSet(dummyExercise, failureHistory);

    assert.ok(suggestion.weight_kg <= 40, 'Bajo RPE 10 no debe incrementar peso');
    assert.strictEqual(suggestion.isOverloadRecommended, false, 'No se recomienda incremento bajo fallo muscular');
    assert.ok(suggestion.warningMessage?.includes('RPE alto') || suggestion.warningMessage?.includes('fatiga'));
  });

  it('ESTRUCTURA DE DATOS: Validación de tipos numéricos flotantes (2.5kg y medias reps no permitidas)', () => {
    const invalidSet = { weight_kg: 22.5, reps: 8.5, rpe: 8.2 };
    const validated = ProgressionEngine.sanitizeSet(invalidSet);

    assert.strictEqual(validated.weight_kg, 22.5, 'Soporta decimales en peso (2.5 kg)');
    assert.strictEqual(validated.reps, 8, 'Reps deben truncarse a entero estricto');
    assert.strictEqual(validated.rpe, 8.2, 'RPE soporta granularidad decimal');
  });
});

describe('P1.2: Módulo gymOverload - Sobrecarga Progresiva & Escala RPE Táctil', () => {
  const sampleExercise: GymExercise = {
    id: 'ex-press-mancuernas',
    name: 'Press Plano con Mancuernas',
    category: 'Pecho',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 4,
    target_reps: '8-10 reps',
    current_weight_kg: 26,
    rest_time: '2:00',
    notes: 'Retracción escapular activa',
  };

  const bodyweightExercise: GymExercise = {
    id: 'ex-dominadas-pronadas',
    name: 'Dominadas Pronadas',
    category: 'Espalda',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 4,
    target_reps: '10-12',
    current_weight_kg: 0,
  };

  it('PARSER: parseTargetReps extrae enteros de diferentes formatos de texto y fallback a 8', () => {
    assert.strictEqual(parseTargetReps('6-8 reps'), 6);
    assert.strictEqual(parseTargetReps('8-10 (RIR 1-2)'), 8);
    assert.strictEqual(parseTargetReps('12 reps'), 12);
    assert.strictEqual(parseTargetReps('60 seg'), 60);
    assert.strictEqual(parseTargetReps('sin numero'), 8);
    assert.strictEqual(parseTargetReps(''), 8);
    assert.strictEqual(parseTargetReps(null), 8);
    assert.strictEqual(parseTargetReps(undefined), 8);
  });

  it('REFERENCIA: Prioriza la última serie completada hoy sobre sesiones pasadas', () => {
    const todayStr = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      // Sesión pasada con peso mayor
      {
        id: 'log-past-1',
        date: '2026-10-01',
        exercise_id: sampleExercise.id,
        set_number: 1,
        reps: 10,
        weight_kg: 30,
        rpe: 8,
      },
      // Series de hoy
      {
        id: 'log-today-1',
        date: todayStr,
        exercise_id: sampleExercise.id,
        set_number: 1,
        reps: 10,
        weight_kg: 26,
        rpe: 7.5,
      },
      {
        id: 'log-today-2',
        date: todayStr,
        exercise_id: sampleExercise.id,
        set_number: 2,
        reps: 9,
        weight_kg: 28,
        rpe: 8.5,
      },
    ];

    const ref = getExerciseReferenceSet(logs, sampleExercise, todayStr);

    assert.strictEqual(ref.isToday, true, 'Debe marcarse como serie de hoy');
    assert.strictEqual(ref.source, 'today_previous_set');
    assert.strictEqual(ref.set_number, 2, 'Debe ser la serie #2 de hoy');
    assert.strictEqual(ref.weight_kg, 28, 'Debe tomar el peso de la última serie de hoy');
    assert.strictEqual(ref.reps, 9, 'Debe tomar las reps de la última serie de hoy');
    assert.strictEqual(ref.rpe, 8.5, 'Debe tomar el RPE de la última serie de hoy');
  });

  it('REFERENCIA: Toma la mejor serie de la sesión previa más reciente si hoy no hay series', () => {
    const todayStr = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      // Sesión más antigua
      {
        id: 'log-old-1',
        date: '2026-09-20',
        exercise_id: sampleExercise.id,
        set_number: 1,
        reps: 12,
        weight_kg: 32,
        rpe: 9,
      },
      // Sesión más reciente (2026-10-02)
      {
        id: 'log-recent-1',
        date: '2026-10-02',
        exercise_id: sampleExercise.id,
        set_number: 1,
        reps: 10,
        weight_kg: 26,
        rpe: 7.5,
      },
      {
        id: 'log-recent-2',
        date: '2026-10-02',
        exercise_id: sampleExercise.id,
        set_number: 2,
        reps: 8,
        weight_kg: 28.5,
        rpe: 8.5,
      },
    ];

    const ref = getExerciseReferenceSet(logs, sampleExercise, todayStr);

    assert.strictEqual(ref.isToday, false);
    assert.strictEqual(ref.source, 'last_session_benchmark');
    assert.strictEqual(ref.date, '2026-10-02', 'Debe seleccionar la sesión más reciente previa');
    assert.strictEqual(ref.weight_kg, 28.5, 'Mejor serie de la sesión por peso');
    assert.strictEqual(ref.reps, 8);
    assert.strictEqual(ref.rpe, 8.5);
  });

  it('REFERENCIA: Fallback al catálogo del ejercicio cuando no existe histórico de series', () => {
    const todayStr = '2026-10-07';
    const logs: GymWorkoutLog[] = [];

    const ref = getExerciseReferenceSet(logs, sampleExercise, todayStr);

    assert.strictEqual(ref.isToday, false);
    assert.strictEqual(ref.source, 'exercise_target');
    assert.strictEqual(ref.weight_kg, 26, 'Toma current_weight_kg del catálogo');
    assert.strictEqual(ref.reps, 8, 'Parsea target_reps del catálogo (8-10 reps -> 8)');
    assert.strictEqual(ref.rpe, 8);
  });

  it('REFERENCIA: Fallback base cuando no hay logs ni ejercicio especificado', () => {
    const ref = getExerciseReferenceSet([], null, '2026-10-07');

    assert.strictEqual(ref.source, 'baseline_fallback');
    assert.strictEqual(ref.weight_kg, 0);
    assert.strictEqual(ref.reps, 8);
    assert.strictEqual(ref.rpe, 8);
  });

  it('POLIMORFISMO: Soporta la firma alternativa (exerciseId, exercise, logs, todayDateStr)', () => {
    const todayStr = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      {
        id: 'log-1',
        date: todayStr,
        exercise_id: 'ex-press-mancuernas',
        set_number: 1,
        reps: 10,
        weight_kg: 25,
        rpe: 8,
      },
    ];

    const ref = getExerciseReferenceSet('ex-press-mancuernas', sampleExercise, logs, todayStr);

    assert.strictEqual(ref.isToday, true);
    assert.strictEqual(ref.weight_kg, 25);
    assert.strictEqual(ref.reps, 10);
  });

  it('SOBRECARGA: Opción "= Serie previa" clona peso, reps y RPE exactamente', () => {
    const ref: OverloadReference = {
      weight_kg: 50,
      reps: 10,
      rpe: 8.5,
      source: 'today_previous_set',
      label: 'Serie previa',
      isToday: true,
    };

    const options = calculateOverloadOptions(ref);

    assert.strictEqual(options.same.label, '= Serie previa');
    assert.strictEqual(options.same.action, 'same');
    assert.strictEqual(options.same.weight_kg, 50);
    assert.strictEqual(options.same.reps, 10);
    assert.strictEqual(options.same.rpe, 8.5);
    assert.strictEqual(options.same.deltaWeight, 0);
    assert.strictEqual(options.same.deltaReps, 0);
    assert.strictEqual(options.same.displayText, '50 kg × 10 reps');
  });

  it('SOBRECARGA: Opción "+2.5 kg" suma micro-carga con precisión flotante redondeada a 1 decimal', () => {
    const ref: OverloadReference = {
      weight_kg: 62.5,
      reps: 8,
      rpe: 8,
      source: 'today_previous_set',
      label: 'Serie previa',
      isToday: true,
    };

    const options = calculateOverloadOptions(ref);

    assert.strictEqual(options.weight_plus.label, '+2.5 kg');
    assert.strictEqual(options.weight_plus.action, 'weight_plus');
    assert.strictEqual(options.weight_plus.weight_kg, 65, '62.5 + 2.5 debe ser exactamente 65');
    assert.strictEqual(options.weight_plus.reps, 8, 'Conserva el número de repeticiones');
    assert.strictEqual(options.weight_plus.deltaWeight, 2.5);
    assert.strictEqual(options.weight_plus.deltaReps, 0);
    assert.strictEqual(options.weight_plus.displayText, '65 kg × 8 reps');
  });

  it('SOBRECARGA: Opción "+1 rep" suma una repetición manteniendo el peso', () => {
    const ref: OverloadReference = {
      weight_kg: 70,
      reps: 7,
      rpe: 8,
      source: 'today_previous_set',
      label: 'Serie previa',
      isToday: true,
    };

    const options = calculateOverloadOptions(ref);

    assert.strictEqual(options.rep_plus.label, '+1 rep');
    assert.strictEqual(options.rep_plus.action, 'rep_plus');
    assert.strictEqual(options.rep_plus.weight_kg, 70, 'Mantiene el peso');
    assert.strictEqual(options.rep_plus.reps, 8, 'Incrementa reps de 7 a 8');
    assert.strictEqual(options.rep_plus.deltaWeight, 0);
    assert.strictEqual(options.rep_plus.deltaReps, 1);
    assert.strictEqual(options.rep_plus.displayText, '70 kg × 8 reps');
  });

  it('SOBRECARGA EN PESO CORPORAL: 0 kg genera 2.5 kg de lastre para "+2.5 kg" y muestra "PC"', () => {
    const ref: OverloadReference = {
      weight_kg: 0,
      reps: 12,
      rpe: 8,
      source: 'exercise_target',
      label: 'Catálogo',
      isToday: false,
    };

    const options = calculateOverloadOptions(ref);

    assert.strictEqual(options.same.weight_kg, 0);
    assert.strictEqual(options.same.displayText, 'PC × 12 reps');

    assert.strictEqual(options.weight_plus.weight_kg, 2.5, '0 kg + 2.5 kg genera 2.5 kg de lastre inicial');
    assert.strictEqual(options.weight_plus.reps, 12);
    assert.strictEqual(options.weight_plus.displayText, '2.5 kg × 12 reps');

    assert.strictEqual(options.rep_plus.weight_kg, 0);
    assert.strictEqual(options.rep_plus.reps, 13);
    assert.strictEqual(options.rep_plus.displayText, 'PC × 13 reps');
  });

  it('ESTRUCTURA POLIMÓRFICA: calculateOverloadOptions permite iteración como array y acceso por clave', () => {
    const ref: OverloadReference = {
      weight_kg: 40,
      reps: 10,
      rpe: 8,
      source: 'today_previous_set',
      label: 'Serie previa',
      isToday: true,
    };

    const options = calculateOverloadOptions(ref);

    // Validación como Array
    assert.strictEqual(Array.isArray(options), true, 'Debe ser compatible con Array.isArray');
    assert.strictEqual(options.length, 3, 'Debe tener exactamente 3 opciones');
    assert.strictEqual(options[0].label, '= Serie previa');
    assert.strictEqual(options[1].label, '+2.5 kg');
    assert.strictEqual(options[2].label, '+1 rep');

    // Validación de métodos de Array (.map)
    const labels = options.map((o) => o.label);
    assert.deepStrictEqual(labels, ['= Serie previa', '+2.5 kg', '+1 rep']);

    // Validación de acceso por clave
    assert.strictEqual(options.same, options[0]);
    assert.strictEqual(options.weight_plus, options[1]);
    assert.strictEqual(options.rep_plus, options[2]);
    assert.strictEqual(options['= Serie previa'], options[0]);
    assert.strictEqual(options['+2.5 kg'], options[1]);
    assert.strictEqual(options['+1 rep'], options[2]);
  });

  it('ESCALA RPE: Contiene 8 puntos tácticos exactos con badges de RIR requeridos', () => {
    assert.strictEqual(RPE_SCALE.length, 8, 'La escala debe contener exactamente 8 puntos');

    const expectedValues = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];
    const actualValues = RPE_SCALE.map((item) => item.value);
    assert.deepStrictEqual(actualValues, expectedValues, 'Los valores deben ser [6, 7, 7.5, 8, 8.5, 9, 9.5, 10]');

    const expectedRirBadges = [
      '4 RIR',
      '3 RIR',
      '2.5 RIR',
      '2 RIR',
      '1.5 RIR',
      '1 RIR',
      '0.5 RIR',
      'Fallo',
    ];
    const actualRirBadges = RPE_SCALE.map((item) => item.rir);
    assert.deepStrictEqual(actualRirBadges, expectedRirBadges, 'Los badges de RIR deben coincidir con la especificación');

    // Comprobar que cada ítem tiene estilos y descripción válidos
    for (const item of RPE_SCALE) {
      assert.ok(item.description.length > 5, `Descripción válida para RPE ${item.value}`);
      assert.ok(item.colorClasses.activeBg.length > 0, `Clase activeBg para RPE ${item.value}`);
      assert.ok(item.badge === item.rir, `Badge y RIR consistentes para RPE ${item.value}`);
    }
  });

  it('HELPERS RPE: getRpeScaleItem y getRpeClinicalNote resuelven valores exactos y aproximados', () => {
    const itemExact = getRpeScaleItem(8.5);
    assert.strictEqual(itemExact.value, 8.5);
    assert.strictEqual(itemExact.rir, '1.5 RIR');

    const itemApprox = getRpeScaleItem(8.2);
    assert.strictEqual(itemApprox.value, 8, '8.2 debe redondear al valor RPE 8 más cercano');

    const note10 = getRpeClinicalNote(10);
    assert.ok(note10.includes('Fatiga neuromuscular'), 'Debe alertar sobre fatiga en RPE 10');

    const note8 = getRpeClinicalNote(8);
    assert.ok(note8.includes('óptimo') || note8.includes('ideal'), 'Debe indicar estímulo óptimo');
  });
});
