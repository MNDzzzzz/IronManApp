// ====================================================================
// ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 (IronManApp Priority 1)
// Role: critic, specialist | Empirical Verification of P1.1, P1.2, P1.3
// Runner: Node.js Native Test Runner (node:test, node:assert/strict)
// ====================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// P1.1 Imports
import { DiscomfortManager, DiscomfortLevel, DiscomfortReport } from '../src/lib/discomfortManager';
import { tryDeterministicBypass, getSpainTodayStr } from '../src/lib/coachCore';

// P1.2 Imports
import {
  getExerciseReferenceSet,
  calculateOverloadOptions,
  parseTargetReps,
  RPE_SCALE,
  getRpeScaleItem,
  getRpeClinicalNote,
} from '../src/lib/gymOverload';
import { GymExercise, GymWorkoutLog } from '../src/types/database';

// P1.3 Imports
import {
  FREQUENT_MEAL_PRESETS,
  generateTypicalDayMeals,
  calculateMealTotals,
  validateMealBatch,
  applyTypicalDayBatch,
  TYPICAL_DAY_PRESETS,
  NutritionDayPreset,
} from '../src/lib/nutritionPresets';
import { NutritionLog } from '../src/types/database';

// ====================================================================
// SUITE 1: P1.1 DISCOMFORT ENGINE & TRIAGE STRESS
// ====================================================================
describe('CHALLENGER 1 — P1.1: Discomfort Engine & Triage Stress', () => {

  it('P1.1-S01: Monotonicity of Volume Multipliers across Levels 1-6', () => {
    const levels = [
      DiscomfortLevel.VERY_LIGHT,
      DiscomfortLevel.LIGHT,
      DiscomfortLevel.MODERATE,
      DiscomfortLevel.MODERATE_HIGH,
      DiscomfortLevel.HIGH,
      DiscomfortLevel.INJURY,
    ];

    let prevMultiplier = 1.1;
    let prevVolumeReduction = -1;
    let prevHydration = -1;

    for (const lvl of levels) {
      const strat = DiscomfortManager.evaluate({
        bodyPartId: 'knee_right',
        level: lvl,
      });

      const mult = strat.training.volumeMultiplier ?? 0;
      const red = strat.training.volumeReductionPercent;
      const hyd = strat.nutrition.hydrationIncreaseMl;

      // Multiplier must be monotonically non-increasing
      assert.ok(
        mult <= prevMultiplier,
        `Level ${lvl} volumeMultiplier (${mult}) should be <= previous (${prevMultiplier})`
      );
      prevMultiplier = mult;

      // Volume reduction percentage must be monotonically non-decreasing
      assert.ok(
        red >= prevVolumeReduction,
        `Level ${lvl} volumeReductionPercent (${red}) should be >= previous (${prevVolumeReduction})`
      );
      prevVolumeReduction = red;

      // Hydration increase must be monotonically non-decreasing
      assert.ok(
        hyd >= prevHydration,
        `Level ${lvl} hydrationIncreaseMl (${hyd}) should be >= previous (${prevHydration})`
      );
      prevHydration = hyd;
    }
  });

  it('P1.1-S02: Out-of-Range Discomfort Level safely defaults to Maximum Caution (Level 6)', () => {
    // Fuzz with non-standard levels: 0, 7, 999, -1
    const invalidLevels = [0, 7, 999, -1] as unknown as DiscomfortLevel[];

    for (const invalidLvl of invalidLevels) {
      const strat = DiscomfortManager.evaluate({
        bodyPartId: 'rodilla',
        level: invalidLvl,
      });

      assert.strictEqual(strat.training.volumeMultiplier, 0.0, `Level ${invalidLvl} should fall back to 0.0 volumeMultiplier`);
      assert.strictEqual(strat.training.skipMuscleGroup, true, `Level ${invalidLvl} should skip muscle group`);
      assert.strictEqual(strat.clinicalAlert, true, `Level ${invalidLvl} should trigger clinical alert`);
      assert.ok(strat.recommendationsMarkdown.includes('PEACE & LOVE'), 'Should recommend conservative protocol');
    }
  });

  it('P1.1-S03: Discomfort Evaluation resilience with non-standard bodyPartId', () => {
    const testCases = [
      'PATELLAR_RIGHT',
      'tendon_rotuliano_izquierdo',
      'UNKNOWN_JOINT_123',
      '',
    ];

    for (const part of testCases) {
      assert.doesNotThrow(() => {
        const strat = DiscomfortManager.evaluate({
          bodyPartId: part,
          level: DiscomfortLevel.LIGHT,
        });
        assert.ok(strat.training.volumeMultiplier !== undefined);
      });
    }
  });

  it('P1.1-S04: Triage Fuzzing — Spacing, Casing, and Variant Formatting', () => {
    const variants = [
      { text: 'NIVEL   1 EN EL GEMELO', expectedLvl: DiscomfortLevel.VERY_LIGHT, part: 'gemelo_soleo' },
      { text: '  nivel 2 en la rodilla  ', expectedLvl: DiscomfortLevel.LIGHT, part: 'rodilla_patellar' },
      { text: 'Dolor moderada nivel 3 hombro izquierdo', expectedLvl: DiscomfortLevel.MODERATE, part: 'hombro' },
      { text: 'Molestia media-alta nivel 4 en el cuadriceps', expectedLvl: DiscomfortLevel.MODERATE_HIGH, part: 'cuadriceps' },
      { text: 'DOLOR FUERTE NIVEL 5 EN LA ESPALDA LUMBAR', expectedLvl: DiscomfortLevel.HIGH, part: 'lumbar' },
      { text: 'Pinchazo agudo nivel 6 rotula derecha', expectedLvl: DiscomfortLevel.INJURY, part: 'rodilla_patellar' },
    ];

    for (const { text, expectedLvl, part } of variants) {
      const result = DiscomfortManager.triageMessage(text);
      assert.ok(result, `Should parse: "${text}"`);
      assert.strictEqual(result?.level, expectedLvl, `Level mismatch for "${text}"`);
      assert.strictEqual(result?.bodyPartId, part, `Body part mismatch for "${text}"`);
    }
  });

  it('P1.1-S05: Triage Qualitative Triggers without explicit "nivel X"', () => {
    const qualitative = [
      { text: 'tengo un pinchazo agudo en el isquio', expectedLvl: DiscomfortLevel.INJURY, part: 'isquiosurales' },
      { text: 'siento rigidez matutina en el tobillo aquiles', expectedLvl: DiscomfortLevel.VERY_LIGHT, part: 'tobillo_aquiles' },
      { text: 'tengo dolor fuerte en el hombro', expectedLvl: DiscomfortLevel.HIGH, part: 'hombro' },
      { text: 'molestia media en la rodilla', expectedLvl: DiscomfortLevel.MODERATE, part: 'rodilla_patellar' },
    ];

    for (const { text, expectedLvl, part } of qualitative) {
      const result = DiscomfortManager.triageMessage(text);
      assert.ok(result, `Should parse qualitative: "${text}"`);
      assert.strictEqual(result?.level, expectedLvl, `Qualitative level mismatch for "${text}"`);
      assert.strictEqual(result?.bodyPartId, part, `Qualitative part mismatch for "${text}"`);
    }
  });

  it('P1.1-S06: Triage Negative Scenarios — Empty, irrelevant, and corrupt inputs return null', () => {
    const negatives = [
      '',
      '   ',
      'hoy comí arroz con pollo 200g',
      'hice 4 series de sentadillas a 100 kg',
      '¿cuándo es la media maratón?',
      'buenos días coach',
      null as any,
      undefined as any,
      12345 as any,
    ];

    for (const text of negatives) {
      const result = DiscomfortManager.triageMessage(text);
      assert.strictEqual(result, null, `Expected null for negative input: ${text}`);
    }
  });

  it('P1.1-S07: Deterministic Bypass vs. Gemini Escalation Contract', async () => {
    const today = getSpainTodayStr();

    // Direct statement -> Deterministic bypass (O(1))
    const report1 = await tryDeterministicBypass('reporto molestia nivel 3 en la rodilla', today);
    assert.ok(report1, 'Direct statement should be bypassed deterministically');
    assert.strictEqual(report1.action, 'discomfort_report');
    assert.strictEqual(report1.discomfort_report.level, DiscomfortLevel.MODERATE);

    // Question with '?' -> Escalates to Gemini (returns null)
    const question1 = await tryDeterministicBypass('¿Debería parar si tengo molestia nivel 3 en la rodilla?', today);
    assert.strictEqual(question1, null, 'Clinical advice question must return null to trigger Gemini');

    // Question with '¿' -> Escalates to Gemini
    const question2 = await tryDeterministicBypass('¿Qué estiramiento hago para nivel 2 en el gemelo?', today);
    assert.strictEqual(question2, null, 'Question with ¿ must return null');

    // Advice verbs without question marks -> Escalates to Gemini
    const question3 = await tryDeterministicBypass('dame consejo sobre molestia nivel 2 en el gemelo', today);
    assert.strictEqual(question3, null, 'Advice request must return null');
  });
});

// ====================================================================
// SUITE 2: P1.2 GYM PROGRESSIVE OVERLOAD & RPE ENGINE STRESS
// ====================================================================
describe('CHALLENGER 1 — P1.2: Gym Overload Math & Precedence Stress', () => {

  const dummyBench: GymExercise = {
    id: 'ex-bench-99',
    name: 'Press Banca',
    category: 'Pecho',
    is_stretch: false,
    day: 'Día 1: Torso',
    target_sets: 4,
    target_reps: '8-10',
    current_weight_kg: 80,
  };

  it('P1.2-S01: Extreme Weights & Decimal Micro-loading Floating Point Precision', () => {
    // Decimal weight ending in .25 or .75: e.g. 37.5 kg
    const refDecimal: any = {
      weight_kg: 37.5,
      reps: 8,
      rpe: 8,
    };

    const optDecimal = calculateOverloadOptions(refDecimal);
    assert.strictEqual(optDecimal.same.weight_kg, 37.5);
    assert.strictEqual(optDecimal.weight_plus.weight_kg, 40.0, '37.5 + 2.5 must equal exactly 40.0 without IEEE-754 drift');
    assert.strictEqual(optDecimal.rep_plus.weight_kg, 37.5);

    // Large weight: 350 kg
    const refHeavy: any = {
      weight_kg: 350,
      reps: 3,
      rpe: 9,
    };
    const optHeavy = calculateOverloadOptions(refHeavy);
    assert.strictEqual(optHeavy.weight_plus.weight_kg, 352.5);
    assert.strictEqual(optHeavy.rep_plus.reps, 4);
  });

  it('P1.2-S02: Bodyweight (0 kg) behavior across all 3 1-tap options', () => {
    const refBW: any = {
      weight_kg: 0,
      reps: 10,
      rpe: 8,
    };

    const optBW = calculateOverloadOptions(refBW);
    assert.strictEqual(optBW.same.weight_kg, 0);
    assert.strictEqual(optBW.same.displayText, 'PC × 10 reps');
    assert.strictEqual(optBW.weight_plus.weight_kg, 2.5, '0 kg + 2.5 kg must set 2.5 kg ballast');
    assert.strictEqual(optBW.weight_plus.displayText, '2.5 kg × 10 reps');
    assert.strictEqual(optBW.rep_plus.weight_kg, 0);
    assert.strictEqual(optBW.rep_plus.reps, 11);
    assert.strictEqual(optBW.rep_plus.displayText, 'PC × 11 reps');
  });

  it('P1.2-S03: Degraded and Corrupted Reference Inputs Resilience', () => {
    // Null reference
    const optNull = calculateOverloadOptions(null);
    assert.strictEqual(optNull.same.weight_kg, 0);
    assert.strictEqual(optNull.same.reps, 8, 'Default reps fallback should be 8');
    assert.strictEqual(optNull.weight_plus.weight_kg, 2.5);
    assert.strictEqual(optNull.rep_plus.reps, 9);

    // Undefined reference
    const optUndef = calculateOverloadOptions(undefined);
    assert.strictEqual(optUndef.same.weight_kg, 0);
    assert.strictEqual(optUndef.same.reps, 8);

    // Negative reps in reference (corrupted log)
    const optNegReps = calculateOverloadOptions({ weight_kg: 50, reps: -5, rpe: 8 });
    assert.strictEqual(optNegReps.same.reps, 8, 'Negative reps must be guarded by fallback to 8');
    assert.strictEqual(optNegReps.rep_plus.reps, 9);
  });

  it('P1.2-S04: Session Precedence — Priority of Today Over Yesterday', () => {
    const today = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      // Yesterday: heavier weight
      {
        id: 'log-yesterday',
        date: '2026-10-06',
        exercise_id: dummyBench.id,
        set_number: 1,
        weight_kg: 100,
        reps: 10,
        rpe: 9,
      },
      // Today: lower weight warmup set 1
      {
        id: 'log-today-1',
        date: today,
        exercise_id: dummyBench.id,
        set_number: 1,
        weight_kg: 60,
        reps: 12,
        rpe: 7,
      },
      // Today: working set 2
      {
        id: 'log-today-2',
        date: today,
        exercise_id: dummyBench.id,
        set_number: 2,
        weight_kg: 80,
        reps: 8,
        rpe: 8,
      },
    ];

    const ref = getExerciseReferenceSet(logs, dummyBench, today);
    assert.strictEqual(ref.isToday, true, 'Must prioritize today');
    assert.strictEqual(ref.set_number, 2, 'Must pick set #2 of today');
    assert.strictEqual(ref.weight_kg, 80, 'Weight must be 80 from set #2');
    assert.strictEqual(ref.reps, 8);
  });

  it('P1.2-S05: Session Precedence — Best Set in Previous Session (Tie-Breaking)', () => {
    const today = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      // Older session
      {
        id: 'log-old',
        date: '2026-09-15',
        exercise_id: dummyBench.id,
        set_number: 1,
        weight_kg: 120,
        reps: 5,
        rpe: 10,
      },
      // Most recent past session: Set 1
      {
        id: 'log-prev-1',
        date: '2026-10-02',
        exercise_id: dummyBench.id,
        set_number: 1,
        weight_kg: 85,
        reps: 8,
        rpe: 8,
      },
      // Most recent past session: Set 2 (Best set by weight and reps)
      {
        id: 'log-prev-2',
        date: '2026-10-02',
        exercise_id: dummyBench.id,
        set_number: 2,
        weight_kg: 90,
        reps: 8,
        rpe: 8.5,
      },
      // Most recent past session: Set 3 (Lower weight due to fatigue)
      {
        id: 'log-prev-3',
        date: '2026-10-02',
        exercise_id: dummyBench.id,
        set_number: 3,
        weight_kg: 85,
        reps: 7,
        rpe: 9,
      },
    ];

    const ref = getExerciseReferenceSet(logs, dummyBench, today);
    assert.strictEqual(ref.isToday, false);
    assert.strictEqual(ref.date, '2026-10-02', 'Must pick the most recent past session date');
    assert.strictEqual(ref.weight_kg, 90, 'Must pick set 2 with 90 kg (best in session)');
    assert.strictEqual(ref.set_number, 2);
  });

  it('P1.2-S06: Cross-Exercise Isolation — Completely ignores logs from other exercise IDs', () => {
    const today = '2026-10-07';
    const logs: GymWorkoutLog[] = [
      {
        id: 'log-other',
        date: today,
        exercise_id: 'ex-squat-other',
        set_number: 1,
        weight_kg: 140,
        reps: 5,
        rpe: 9,
      },
    ];

    const ref = getExerciseReferenceSet(logs, dummyBench, today);
    assert.strictEqual(ref.source, 'exercise_target', 'Should ignore other exercise and fallback to catalog');
    assert.strictEqual(ref.weight_kg, 80, 'Weight should be catalog 80 kg, NOT squat 140 kg');
  });

  it('P1.2-S07: Stringified Numeric Values in Logs are coerced safely', () => {
    const today = '2026-10-07';
    const logsWithStrings: any[] = [
      {
        id: 'log-str',
        date: today,
        exercise_id: dummyBench.id,
        set_number: 1,
        weight_kg: '75',
        reps: '10',
        rpe: 8,
      },
    ];

    const ref = getExerciseReferenceSet(logsWithStrings, dummyBench, today);
    assert.strictEqual(ref.weight_kg, 75);
    assert.strictEqual(ref.reps, 10);
  });

  it('P1.2-S08: RPE Scale Boundary Lookups & Nearest Matcher', () => {
    // Under minimum (< 6) -> Clamps to 6
    const under = getRpeScaleItem(4);
    assert.strictEqual(under.value, 6);
    assert.strictEqual(under.rir, '4 RIR');

    // Over maximum (> 10) -> Clamps to 10
    const over = getRpeScaleItem(12);
    assert.strictEqual(over.value, 10);
    assert.strictEqual(over.rir, 'Fallo');

    // Intermediate points
    const mid1 = getRpeScaleItem(7.3);
    assert.strictEqual(mid1.value, 7.5); // 7.3 is closer to 7.5 (0.2) than 7.0 (0.3)

    const mid2 = getRpeScaleItem(7.1);
    assert.strictEqual(mid2.value, 7.0);

    // Clinical note check
    const note1 = getRpeClinicalNote(6);
    assert.ok(note1.includes('desgaste tendinoso'));
    const note10 = getRpeClinicalNote(10);
    assert.ok(note10.includes('Fatiga neuromuscular máxima'));
  });

  it('P1.2-S09: parseTargetReps Fuzzing on complex rep strings', () => {
    assert.strictEqual(parseTargetReps('10-12'), 10);
    assert.strictEqual(parseTargetReps('3 x 15 reps'), 3);
    assert.strictEqual(parseTargetReps('al fallo'), 8);
    assert.strictEqual(parseTargetReps('0'), 8);
    assert.strictEqual(parseTargetReps('-10'), 10); // Regex matches first digit sequence '10'
    assert.strictEqual(parseTargetReps(null), 8);
    assert.strictEqual(parseTargetReps(undefined), 8);
  });
});

// ====================================================================
// SUITE 3: P1.3 NUTRITION PRESETS & BATCH OPERATIONS STRESS
// ====================================================================
describe('CHALLENGER 1 — P1.3: Nutrition Presets & Batch Operations Stress', () => {

  it('P1.3-S01: calculateMealTotals precision with empty, partial, and stringified values', () => {
    // Empty array
    const emptyTotals = calculateMealTotals([]);
    assert.deepStrictEqual(emptyTotals, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    // Partial values with missing properties
    const partialMeals: any[] = [
      { calories: 250 },
      { protein_g: 30.5 },
      { carbs_g: 45.2 },
      { fat_g: 10.1 },
    ];
    const partialTotals = calculateMealTotals(partialMeals);
    assert.strictEqual(partialTotals.calories, 250);
    assert.strictEqual(partialTotals.protein_g, 30.5);
    assert.strictEqual(partialTotals.carbs_g, 45.2);
    assert.strictEqual(partialTotals.fat_g, 10.1);

    // Stringified values
    const stringMeals: any[] = [
      { calories: '300', protein_g: '25.3', carbs_g: '30.1', fat_g: '8.4' },
      { calories: '400', protein_g: '35.2', carbs_g: '40.2', fat_g: '11.2' },
    ];
    const stringTotals = calculateMealTotals(stringMeals);
    assert.strictEqual(stringTotals.calories, 700);
    assert.strictEqual(stringTotals.protein_g, 60.5);
    assert.strictEqual(stringTotals.carbs_g, 70.3);
    assert.strictEqual(stringTotals.fat_g, 19.6);
  });

  it('P1.3-S02: validateMealBatch Adversarial Fuzzing', () => {
    // Non-array input
    const notArray = validateMealBatch(null as any);
    assert.strictEqual(notArray.valid, false);
    assert.ok(notArray.errors.length > 0);

    // Empty array
    const emptyArray = validateMealBatch([]);
    assert.strictEqual(emptyArray.valid, false);

    // Negative macros
    const negativeBatch: any[] = [
      { description: 'Alimento corrupto', calories: -200, protein_g: 20, carbs_g: 30, fat_g: 5 },
      { description: 'Alimento negativo', calories: 200, protein_g: -10, carbs_g: 30, fat_g: 5 },
      { description: 'Sin descripción', calories: 200, protein_g: 10, carbs_g: 30, fat_g: -5 },
    ];
    const negResult = validateMealBatch(negativeBatch);
    assert.strictEqual(negResult.valid, false);
    assert.ok(negResult.errors.length >= 3);

    // Missing description
    const noDescBatch: any[] = [
      { description: '', calories: 200, protein_g: 20, carbs_g: 30, fat_g: 5 },
    ];
    const noDescResult = validateMealBatch(noDescBatch);
    assert.strictEqual(noDescResult.valid, false);
    assert.ok(noDescResult.errors.some((e) => e.includes('descripción')));
  });

  it('P1.3-S03: applyTypicalDayBatch Case-Insensitive and Spacing Normalization Deduplication', async () => {
    const preset = TYPICAL_DAY_PRESETS[0];
    const date = '2026-10-08';

    // Existing breakfast with uppercase and whitespace: "  DESAYUNO  "
    const existingMessyBreakfast: NutritionLog = {
      id: 'existing-01',
      date,
      timestamp: `${date}T08:00:00Z`,
      meal_type: '  DESAYUNO  ' as any,
      description: 'Desayuno ya consumido',
      calories: 500,
      protein_g: 40,
      carbs_g: 50,
      fat_g: 15,
    };

    const result = await applyTypicalDayBatch(preset, [existingMessyBreakfast], date);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.insertedMeals.length, 3, 'Must insert 3 meals, skipping desayuno');
    assert.ok(result.skippedMeals.includes('desayuno'), 'Must recognize and skip desayuno regardless of casing/spaces');
  });

  it('P1.3-S04: applyTypicalDayBatch Date Isolation — Prior day records do not trigger skip for today', async () => {
    const preset = TYPICAL_DAY_PRESETS[0];
    const targetDate = '2026-10-09';
    const yesterdayDate = '2026-10-08';

    // Yesterday's full day logs
    const yesterdayLogs: NutritionLog[] = [
      { id: 'y-1', date: yesterdayDate, timestamp: `${yesterdayDate}T08:00:00Z`, meal_type: 'desayuno' as any, description: 'D', calories: 400, protein_g: 30, carbs_g: 40, fat_g: 10 },
      { id: 'y-2', date: yesterdayDate, timestamp: `${yesterdayDate}T14:00:00Z`, meal_type: 'almuerzo' as any, description: 'A', calories: 700, protein_g: 60, carbs_g: 60, fat_g: 20 },
      { id: 'y-3', date: yesterdayDate, timestamp: `${yesterdayDate}T17:00:00Z`, meal_type: 'merienda' as any, description: 'M', calories: 400, protein_g: 40, carbs_g: 40, fat_g: 10 },
      { id: 'y-4', date: yesterdayDate, timestamp: `${yesterdayDate}T21:00:00Z`, meal_type: 'cena' as any, description: 'C', calories: 600, protein_g: 50, carbs_g: 40, fat_g: 20 },
    ];

    const result = await applyTypicalDayBatch(preset, yesterdayLogs, targetDate);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.insertedMeals.length, 4, 'Must insert ALL 4 meals for targetDate even if yesterday had all meals');
    assert.strictEqual(result.skippedMeals.length, 0);
  });

  it('P1.3-S05: generateTypicalDayMeals ID Uniqueness across Multiple Invocations', () => {
    const date = '2026-10-10';
    const batch1 = generateTypicalDayMeals(date);
    const batch2 = generateTypicalDayMeals(date);

    const ids1 = new Set(batch1.map((m) => m.id));
    const ids2 = new Set(batch2.map((m) => m.id));

    assert.strictEqual(ids1.size, 4, 'Batch 1 must have 4 unique IDs');
    assert.strictEqual(ids2.size, 4, 'Batch 2 must have 4 unique IDs');

    // No ID collision between invocations
    Array.from(ids1).forEach((id) => {
      assert.strictEqual(ids2.has(id), false, `ID ${id} collided between batch1 and batch2`);
    });
  });

  it('P1.3-S06: FREQUENT_MEAL_PRESETS 8 Catalog Items Comprehensive Macro Sanity Check', () => {
    assert.strictEqual(FREQUENT_MEAL_PRESETS.length, 8);

    for (const item of FREQUENT_MEAL_PRESETS) {
      // 4 kcal per g protein, 4 kcal per g carbs, 9 kcal per g fat
      const theoreticalCals = item.protein_g * 4 + item.carbs_g * 4 + item.fat_g * 9;
      const difference = Math.abs(theoreticalCals - item.calories);
      const percentDiff = (difference / item.calories) * 100;

      // Real world food labels allow small variances due to fiber and rounding, but must be within 15%
      assert.ok(
        percentDiff < 15,
        `Preset "${item.name}" macro sum (${theoreticalCals.toFixed(0)} kcal) diverges by ${percentDiff.toFixed(1)}% from listed calories (${item.calories})`
      );
    }
  });
});
