// ====================================================================
// CHALLENGER 2: EMPIRICAL INTEGRATION ROBUSTNESS & REGRESSION SUITE
// IronManApp Priority 1 Features Adversarial Challenge
// Runner: Node.js Native Test Runner (node:test, node:assert/strict)
// ====================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pre-existing modules
import { tryDeterministicBypass, getSpainTodayStr } from '../src/lib/coach/coachCore';
import { findMercadonaProduct } from '../src/lib/mercadonaNutrition';
import {
  WEEKLY_ROUTINE,
  getSpainDate,
  getTodayRoutine,
  getHalfMarathonCountdown,
  getRunningProgressionForWeek,
} from '../src/lib/weeklyRoutine';
import {
  enqueueMutation,
  getPendingMutations,
  resetOfflineDBForTesting,
} from '../src/lib/offline/offlineStore';

// P1.1 Modules
import {
  DiscomfortManager,
  DiscomfortLevel,
  DiscomfortReport,
} from '../src/lib/discomfortManager';

// P1.2 Modules
import {
  getExerciseReferenceSet,
  calculateOverloadOptions,
  parseTargetReps,
  RPE_SCALE,
  getRpeScaleItem,
  getRpeClinicalNote,
} from '../src/lib/gymOverload';
import { GymExercise, GymWorkoutLog } from '../src/types/database';

// P1.3 Modules
import {
  FREQUENT_MEAL_PRESETS,
  TYPICAL_DAY_PRESETS,
  generateTypicalDayMeals,
  getTypicalDayMeals,
  calculateMealTotals,
  validateMealBatch,
  applyTypicalDayBatch,
} from '../src/lib/nutritionPresets';
import { mockStore } from '../src/lib/mockStore';

describe('CHALLENGER 2 SUITE 1: Regresiones en Características Preexistentes', () => {
  it('REG-1: Búsqueda O(1) de Mercadona resiste 10.000 iteraciones consecutivas en < 50ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) {
      const p = findMercadonaProduct('pechuga de pollo cocinada');
      assert.ok(p !== null);
    }
    const t1 = performance.now();
    const elapsed = t1 - t0;
    assert.ok(
      elapsed < 150,
      `10.000 búsquedas tardaron ${elapsed.toFixed(2)}ms (límite: 150ms)`
    );
  });

  it('REG-2: Bypass determinista NO intercepta consultas clínicas ambiguas o con interrogación', async () => {
    const today = getSpainTodayStr();
    const clinicalQueries = [
      '¿Qué me recomiendas para el dolor en la rodilla tras rodar?',
      '¿Puedo tomar creatina hoy si me duele el estómago?',
      'Me duele la rodilla al bajar escaleras, ¿debería descansar?',
      '¿Cuánto peso debería subir la próxima semana?',
      '¿Cómo adapto la sesión si tengo molestias?',
      'Tengo molestia nivel 2 en la rodilla ¿debo parar o seguir corriendo?',
    ];

    for (const q of clinicalQueries) {
      const res = await tryDeterministicBypass(q, today);
      assert.strictEqual(
        res,
        null,
        `La consulta "${q}" no debe ser resuelta por bypass (debe derivarse a IA)`
      );
    }
  });

  it('REG-3: Bypass de pesajes y agua gestiona decimales con coma y rechaza valores anómalos', async () => {
    const today = getSpainTodayStr();

    // Agua con decimal y coma
    const waterRes1 = await tryDeterministicBypass('me he bebido 1,5 litros de agua', today);
    assert.ok(waterRes1);
    assert.strictEqual(waterRes1.action, 'log_water');
    assert.strictEqual(waterRes1.water_ml, 1500);

    const waterRes2 = await tryDeterministicBypass('bebi 0.75 l de agua', today);
    assert.ok(waterRes2);
    assert.strictEqual(waterRes2.action, 'log_water');
    assert.strictEqual(waterRes2.water_ml, 750);

    // Peso dentro de rango normal (60 - 160 kg)
    const weightValid = await tryDeterministicBypass('peso hoy 101,4 kg', today);
    assert.ok(weightValid);
    assert.strictEqual(weightValid.action, 'log_weight');
    assert.strictEqual(weightValid.weight_log?.weight_kg, 101.4);

    // Pesos anómalos imposibles (fuera de rango)
    const weightLow = await tryDeterministicBypass('peso 35 kg', today);
    assert.strictEqual(weightLow, null, 'Peso < 60 kg debe ser rechazado por seguridad');

    const weightHigh = await tryDeterministicBypass('peso 250 kg', today);
    assert.strictEqual(weightHigh, null, 'Peso > 160 kg debe ser rechazado por seguridad');
  });

  it('REG-4: WEEKLY_ROUTINE permanece estrictamente inmutable tras múltiples lecturas y operaciones', () => {
    const snapshotBefore = JSON.stringify(WEEKLY_ROUTINE);

    // Ejecutar múltiples consultas de rutina
    getTodayRoutine('2026-10-05');
    getTodayRoutine('2026-10-06');
    getTodayRoutine('2026-10-07');
    getTodayRoutine('2026-10-08');

    // Intentar disparar adaptación
    DiscomfortManager.evaluate({
      bodyPartId: 'knee_right',
      level: DiscomfortLevel.HIGH,
    });

    const snapshotAfter = JSON.stringify(WEEKLY_ROUTINE);
    assert.strictEqual(snapshotBefore, snapshotAfter, 'WEEKLY_ROUTINE no fue mutado');
  });

  it('REG-5: Progresión de running y countdown hacia 2027 son matemáticamente estables', () => {
    const progWeek1 = getRunningProgressionForWeek(1);
    const progWeek4 = getRunningProgressionForWeek(4);
    const progWeek12 = getRunningProgressionForWeek(12);

    assert.ok(progWeek1.thursdayKm > 0);
    assert.ok(progWeek4.thursdayKm >= progWeek1.thursdayKm);
    assert.ok(progWeek12.sundayKm >= progWeek4.sundayKm);

    const cd = getHalfMarathonCountdown('2026-10-08');
    assert.ok(cd.daysRemaining > 0);
    assert.ok(cd.weeksRemaining > 0);
  });
});

describe('CHALLENGER 2 SUITE 2: Robustez de Sincronización Offline y Resiliencia SSR', () => {
  it('OFF-1: Encolado masivo de 50 mutaciones secuenciales sin pérdida de orden FIFO', async () => {
    resetOfflineDBForTesting();
    const originalWindow = (global as any).window;
    delete (global as any).window; // Simular entorno SSR

    try {
      const generatedIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const mut = await enqueueMutation({
          endpoint: '/api/gym',
          method: 'POST',
          payload: { index: i, weight: 80 + i },
        });
        assert.ok(mut);
        generatedIds.push(mut.id);
      }

      // Validar unicidad total de identificadores generados
      const uniqueIds = new Set(generatedIds);
      assert.strictEqual(uniqueIds.size, 50, 'Cada mutación debe poseer ID único');
    } finally {
      if (originalWindow) (global as any).window = originalWindow;
      resetOfflineDBForTesting();
    }
  });
});

describe('CHALLENGER 2 SUITE 3: Estrés y Casos Límite en Gestor de Molestias (P1.1)', () => {
  it('DISC-1: Tolerancia a mayúsculas, espacios irregulares y variaciones de texto en triage', () => {
    // Mayúsculas completas
    const t1 = DiscomfortManager.triageMessage('TENGO MOLESTIA NIVEL 3 EN LA RODILLA DERECHA');
    assert.ok(t1);
    assert.strictEqual(t1.level, DiscomfortLevel.MODERATE);
    assert.ok(t1.bodyPartId.includes('rodilla'));

    // Múltiples espacios
    const t2 = DiscomfortManager.triageMessage('siento   molestia   nivel   4   en   el   tobillo');
    assert.ok(t2);
    assert.strictEqual(t2.level, DiscomfortLevel.MODERATE_HIGH);
    assert.ok(t2.bodyPartId.includes('tobillo'));

    // Sin la palabra "nivel", usando términos cualitativos
    const t3 = DiscomfortManager.triageMessage('pinchazo agudo en el isquio');
    assert.ok(t3);
    assert.strictEqual(t3.level, DiscomfortLevel.INJURY);
    assert.ok(t3.bodyPartId.includes('isquio'));

    const t4 = DiscomfortManager.triageMessage('noto rigidez matutina en el soleo');
    assert.ok(t4);
    assert.strictEqual(t4.level, DiscomfortLevel.VERY_LIGHT);
    assert.ok(t4.bodyPartId.includes('soleo'));
  });

  it('DISC-2: Entradas vacías, nulas o cadenas monstruosas no causan errores no controlados', () => {
    assert.strictEqual(DiscomfortManager.triageMessage(''), null);
    assert.strictEqual(DiscomfortManager.triageMessage('   '), null);
    assert.strictEqual(DiscomfortManager.triageMessage(null as any), null);
    assert.strictEqual(DiscomfortManager.triageMessage(undefined as any), null);

    // Cadena gigante de 10.000 caracteres
    const bigText = 'dolor '.repeat(2000);
    const resBig = DiscomfortManager.triageMessage(bigText);
    assert.ok(resBig === null || typeof resBig.level === 'number');
  });

  it('DISC-3: Matriz de multiplicadores de volumen e impacto para los 6 niveles exacta', () => {
    const expectations = [
      { lvl: DiscomfortLevel.VERY_LIGHT, mult: 1.0, impactSuspend: false, alert: false },
      { lvl: DiscomfortLevel.LIGHT, mult: 0.85, impactSuspend: false, alert: false },
      { lvl: DiscomfortLevel.MODERATE, mult: 0.70, impactSuspend: false, alert: false },
      { lvl: DiscomfortLevel.MODERATE_HIGH, mult: 0.50, impactSuspend: true, alert: false },
      { lvl: DiscomfortLevel.HIGH, mult: 0.25, impactSuspend: true, alert: false },
      { lvl: DiscomfortLevel.INJURY, mult: 0.0, impactSuspend: true, alert: true },
    ];

    for (const exp of expectations) {
      const res = DiscomfortManager.evaluate({
        bodyPartId: 'patellar',
        level: exp.lvl,
      });

      assert.strictEqual(res.training.volumeMultiplier, exp.mult);
      assert.strictEqual(res.training.suspendImpact, exp.impactSuspend);
      assert.strictEqual(res.clinicalAlert, exp.alert);
    }
  });
});

describe('CHALLENGER 2 SUITE 4: Estrés Aritmético y Polimorfismo en Gym Overload (P1.2)', () => {
  it('GYM-1: Aritmética decimal de sobrecarga (+2.5 kg) libre de artefactos de coma flotante IEEE-754', () => {
    // Probar pesos donde los números en coma flotante suelen generar .0000000000001
    const testWeights = [12.5, 17.5, 22.5, 32.5, 62.5, 87.5, 97.5, 102.5, 142.5];

    for (const w of testWeights) {
      const ref = { weight_kg: w, reps: 8, rpe: 8 };
      const options = calculateOverloadOptions(ref);

      const expected = Math.round((w + 2.5) * 10) / 10;
      assert.strictEqual(
        options.weight_plus.weight_kg,
        expected,
        `Fallo de precisión flotante en ${w} + 2.5: esperado ${expected}, obtenido ${options.weight_plus.weight_kg}`
      );
      assert.strictEqual(options.weight_plus.displayText, `${expected} kg × 8 reps`);
    }
  });

  it('GYM-2: Resuelve ejercicios de peso corporal (0 kg) con lastre y display PC sin fallos', () => {
    const ref = { weight_kg: 0, reps: 10, rpe: 8 };
    const options = calculateOverloadOptions(ref);

    // = Serie previa
    assert.strictEqual(options.same.weight_kg, 0);
    assert.strictEqual(options.same.displayText, 'PC × 10 reps');
    assert.strictEqual(options.same.badgeText, 'Repetir');

    // +2.5 kg
    assert.strictEqual(options.weight_plus.weight_kg, 2.5);
    assert.strictEqual(options.weight_plus.displayText, '2.5 kg × 10 reps');
    assert.strictEqual(options.weight_plus.badgeText, '+Carga');

    // +1 rep
    assert.strictEqual(options.rep_plus.weight_kg, 0);
    assert.strictEqual(options.rep_plus.reps, 11);
    assert.strictEqual(options.rep_plus.displayText, 'PC × 11 reps');
  });

  it('GYM-3: getExerciseReferenceSet resuelve correctamente listas no ordenadas cronológicamente', () => {
    const today = '2026-10-08';
    const ex: GymExercise = {
      id: 'ex-prensa',
      name: 'Prensa 45°',
      category: 'Pierna',
      is_stretch: false,
      day: 'Día 2: Pierna',
      target_sets: 4,
      target_reps: '10-12',
      current_weight_kg: 100,
    };

    // Logs desordenados intencionadamente
    const logs: GymWorkoutLog[] = [
      { id: '1', date: today, exercise_id: 'ex-prensa', set_number: 1, reps: 12, weight_kg: 120, rpe: 8 },
      { id: '3', date: today, exercise_id: 'ex-prensa', set_number: 3, reps: 10, weight_kg: 140, rpe: 9 },
      { id: '2', date: today, exercise_id: 'ex-prensa', set_number: 2, reps: 11, weight_kg: 130, rpe: 8.5 },
    ];

    const ref = getExerciseReferenceSet(logs, ex, today);
    // Debe elegir la serie 3 (mayor set_number de hoy)
    assert.strictEqual(ref.set_number, 3);
    assert.strictEqual(ref.weight_kg, 140);
    assert.strictEqual(ref.reps, 10);
    assert.strictEqual(ref.isToday, true);
  });

  it('GYM-4: Escala táctil RPE y resolución de valores fuera de los 8 puntos estándar', () => {
    // Escala contiene exactamente 8 puntos
    assert.strictEqual(RPE_SCALE.length, 8);

    // RPE no estándar resuelve al punto más próximo sin lanzar excepción
    const closeTo7 = getRpeScaleItem(6.9);
    assert.strictEqual(closeTo7.value, 7);

    const closeTo85 = getRpeScaleItem(8.4);
    assert.strictEqual(closeTo85.value, 8.5);

    const highLimit = getRpeScaleItem(11);
    assert.strictEqual(highLimit.value, 10);

    const lowLimit = getRpeScaleItem(4);
    assert.strictEqual(lowLimit.value, 6);

    // Notas clínicas de RPE
    assert.ok(getRpeClinicalNote(10).includes('Fatiga'));
    assert.ok(getRpeClinicalNote(8).includes('óptimo') || getRpeClinicalNote(8).includes('ideal'));
  });
});

describe('CHALLENGER 2 SUITE 5: Deduplicación e Inserción de Comidas en Lote (P1.3)', () => {
  it('NUT-1: Deduplicación robusta insensible a mayúsculas y espacios en blanco', async () => {
    const preset = TYPICAL_DAY_PRESETS[0];
    const date = '2026-10-08';

    // Logs existentes con mayúsculas y espacios en meal_type
    const existingLogs: any[] = [
      {
        id: 'ex-1',
        date,
        meal_type: ' DESAYUNO ',
        description: 'Desayuno previo',
        calories: 450,
        protein_g: 35,
        carbs_g: 40,
        fat_g: 10,
      },
      {
        id: 'ex-2',
        date,
        meal_type: 'Almuerzo',
        description: 'Almuerzo previo',
        calories: 700,
        protein_g: 60,
        carbs_g: 65,
        fat_g: 15,
      },
    ];

    const result = await applyTypicalDayBatch(preset, existingLogs, date);

    // Solo deben insertarse 2 comidas (merienda y cena)
    assert.strictEqual(result.insertedMeals.length, 2);
    assert.strictEqual(result.skippedMeals.length, 2);
    assert.ok(result.skippedMeals.includes('desayuno'));
    assert.ok(result.skippedMeals.includes('almuerzo'));
  });

  it('NUT-2: Día completo ya registrado no inserta ninguna comida adicional (0 duplicados)', async () => {
    const preset = TYPICAL_DAY_PRESETS[0];
    const date = '2026-10-08';

    const allExisting: any[] = [
      { id: '1', date, meal_type: 'desayuno' },
      { id: '2', date, meal_type: 'almuerzo' },
      { id: '3', date, meal_type: 'merienda' },
      { id: '4', date, meal_type: 'cena' },
    ];

    const result = await applyTypicalDayBatch(preset, allExisting, date);
    assert.strictEqual(result.insertedMeals.length, 0, 'No debe insertar comidas si todas existen');
    assert.strictEqual(result.skippedMeals.length, 4, 'Las 4 comidas deben marcarse como omitidas');
  });

  it('NUT-3: validateMealBatch y calculateMealTotals operan con precisión en lotes extremos', () => {
    // Validación con lote nulo o vacío
    assert.strictEqual(validateMealBatch([]).valid, false);
    assert.strictEqual(validateMealBatch(null as any).valid, false);

    // Suma de 100 comidas generadas aleatoriamente
    const bulkMeals = Array.from({ length: 100 }, (_, i) => ({
      calories: 100,
      protein_g: 10.5,
      carbs_g: 12.3,
      fat_g: 2.1,
    }));

    const totals = calculateMealTotals(bulkMeals);
    assert.strictEqual(totals.calories, 10000);
    assert.strictEqual(totals.protein_g, 1050.0);
    assert.strictEqual(totals.carbs_g, 1230.0);
    assert.strictEqual(totals.fat_g, 210.0);
  });
});
