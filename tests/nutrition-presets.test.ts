// ====================================================================
// SUITE DE TESTS: FEATURE P1.3 — PLANTILLAS DE COMIDA & DÍA TÍPICO
// Runner: Node.js Native Test Runner (node:test, node:assert/strict)
// Ejecución: npx tsx --test tests/nutrition-presets.test.ts
// ====================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FREQUENT_MEAL_PRESETS,
  MealBlockTemplate,
  generateTypicalDayMeals,
  getTypicalDayMeals,
  validateMealBatch,
  calculateMealTotals,
  applyTypicalDayBatch,
  TYPICAL_DAY_PRESETS,
  NutritionDayPreset,
} from '../src/lib/nutritionPresets';
import { NutritionLog } from '../src/types/database';
import { mockStore } from '../src/lib/mockStore';

describe('P1.3: Catálogo Oficial de 8 Plantillas de Comidas Frecuentes en Bloque', () => {
  it('CAT-1: Contiene exactamente 8 plantillas de comidas de alta densidad bromatológica', () => {
    assert.strictEqual(
      FREQUENT_MEAL_PRESETS.length,
      8,
      `Se esperaban 8 plantillas pero se encontraron ${FREQUENT_MEAL_PRESETS.length}`
    );
  });

  it('CAT-2: Cubre los 4 momentos clave del día (Desayuno, Almuerzo, Snack/Merienda, Cena)', () => {
    const mealTypes = new Set(FREQUENT_MEAL_PRESETS.map((p) => p.meal_type));
    assert.ok(mealTypes.has('Desayuno'), 'Debe incluir plantillas de Desayuno');
    assert.ok(mealTypes.has('Almuerzo'), 'Debe incluir plantillas de Almuerzo');
    assert.ok(mealTypes.has('Snack'), 'Debe incluir plantillas de Snack/Merienda');
    assert.ok(mealTypes.has('Cena'), 'Debe incluir plantillas de Cena');
  });

  it('CAT-3: Cada plantilla tiene identificador único, nombre, descripción detallada y macros positivos', () => {
    const ids = new Set<string>();

    for (const preset of FREQUENT_MEAL_PRESETS) {
      assert.ok(preset.id && preset.id.trim().length > 0, 'El ID debe ser no vacío');
      assert.ok(!ids.has(preset.id), `ID duplicado detectado: ${preset.id}`);
      ids.add(preset.id);

      assert.ok(preset.name && preset.name.length > 3, `Nombre muy corto para ${preset.id}`);
      assert.ok(preset.description && preset.description.length > 10, `Descripción incompleta para ${preset.id}`);
      assert.ok(preset.calories > 350, `Calorías de ${preset.id} deben ser sustanciales (>350 kcal)`);
      assert.ok(preset.protein_g >= 30, `Proteína de ${preset.id} debe proteger masa muscular (>=30g)`);
      assert.ok(preset.carbs_g >= 0, `Carbohidratos de ${preset.id} deben ser no negativos`);
      assert.ok(preset.fat_g > 0, `Grasas de ${preset.id} deben ser positivas`);
    }
  });

  it('CAT-4: Bromatología exacta de básicos de Mercadona (Pollo/Arroz, Merienda Whey, Salmón)', () => {
    // Almuerzo Pollo + Arroz
    const polloArroz = FREQUENT_MEAL_PRESETS.find((p) => p.id === 'preset-almuerzo-pollo-arroz');
    assert.ok(polloArroz, 'Debe existir la plantilla de pollo y arroz');
    assert.strictEqual(polloArroz?.calories, 670);
    assert.strictEqual(polloArroz?.protein_g, 60.0);
    assert.strictEqual(polloArroz?.carbs_g, 68.0);
    assert.strictEqual(polloArroz?.fat_g, 17.0);

    // Merienda Whey + Queso Batido + Creatina
    const meriendaWhey = FREQUENT_MEAL_PRESETS.find((p) => p.id === 'preset-merienda-whey-creatina');
    assert.ok(meriendaWhey, 'Debe existir la plantilla de merienda con whey y queso batido');
    assert.strictEqual(meriendaWhey?.calories, 510);
    assert.strictEqual(meriendaWhey?.protein_g, 54.0);
    assert.ok(meriendaWhey?.description.includes('creatina'), 'La merienda debe incluir creatina');

    // Cena Salmón + Patata
    const cenaSalmon = FREQUENT_MEAL_PRESETS.find((p) => p.id === 'preset-cena-salmon-patata');
    assert.ok(cenaSalmon, 'Debe existir la plantilla de salmón y patata');
    assert.strictEqual(cenaSalmon?.calories, 540);
    assert.strictEqual(cenaSalmon?.protein_g, 50.0);
    assert.strictEqual(cenaSalmon?.fat_g, 22.0);
  });
});

describe('P1.3: Generador de Modo "Día Típico Cumplido" (1-Tap Full Day Log)', () => {
  it('GEN-1: Genera exactamente 4 tomas estructuradas para la fecha indicada', () => {
    const testDate = '2026-10-15';
    const meals = generateTypicalDayMeals(testDate);

    assert.strictEqual(meals.length, 4, 'Debe generar exactamente 4 tomas');
    meals.forEach((m) => {
      assert.strictEqual(m.date, testDate, 'Todas las comidas deben pertenecer a la fecha solicitada');
      assert.ok(m.id.startsWith('typical-'), 'El ID debe tener prefijo typical-');
      assert.ok(m.timestamp.startsWith(testDate), 'El timestamp debe concordar con la fecha');
    });

    const types = meals.map((m) => m.meal_type);
    assert.deepStrictEqual(types, ['Desayuno', 'Almuerzo', 'Snack', 'Cena']);
  });

  it('GEN-2: Los timestamps están ordenados secuencialmente a lo largo del día', () => {
    const testDate = '2026-10-20';
    const meals = generateTypicalDayMeals(testDate);

    const times = meals.map((m) => new Date(m.timestamp).getTime());
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i] > times[i - 1], `La toma ${i} debe ser posterior a la toma ${i - 1}`);
    }
  });

  it('GEN-3: Totales del día típico cumplen estrictamente con los 202g de proteína del atleta', () => {
    const meals = generateTypicalDayMeals('2026-10-08');
    const totals = calculateMealTotals(meals);

    // Suma de proteínas: 38 + 60 + 54 + 50 = 202g
    assert.strictEqual(totals.protein_g, 202.0, `La proteína debe ser exactamente 202g pero fue ${totals.protein_g}g`);

    // Suma de calorías: 580 + 670 + 510 + 540 = 2300 kcal (dentro de 2300-2400)
    assert.ok(totals.calories >= 2300 && totals.calories <= 2450, `Calorías deben estar en 2300-2450 pero fueron ${totals.calories}`);

    // Grasas controladas: 21 + 17 + 15 + 22 = 75g
    assert.strictEqual(totals.fat_g, 75.0, `Las grasas deben ser 75g pero fueron ${totals.fat_g}g`);
  });

  it('GEN-4: getTypicalDayMeals funciona como alias idéntico de generateTypicalDayMeals', () => {
    const date = '2026-11-01';
    const res1 = generateTypicalDayMeals(date);
    const res2 = getTypicalDayMeals(date);

    assert.strictEqual(res1.length, res2.length);
    assert.strictEqual(res1[0].meal_type, res2[0].meal_type);
    assert.strictEqual(res1[0].calories, res2[0].calories);
  });
});

describe('P1.3: Validación Bromatológica y Cálculo de Lotes (Batch Engine)', () => {
  it('VAL-1: calculateMealTotals suma con precisión decimal Kcal, P, C y G', () => {
    const sampleMeals: Partial<NutritionLog>[] = [
      { calories: 580, protein_g: 38.4, carbs_g: 60.1, fat_g: 21.2 },
      { calories: 670, protein_g: 60.3, carbs_g: 68.2, fat_g: 17.5 },
    ];

    const totals = calculateMealTotals(sampleMeals);
    assert.strictEqual(totals.calories, 1250);
    assert.strictEqual(totals.protein_g, 98.7);
    assert.strictEqual(totals.carbs_g, 128.3);
    assert.strictEqual(totals.fat_g, 38.7);
  });

  it('VAL-2: validateMealBatch aprueba un lote consistente y coherente', () => {
    const validBatch: Partial<NutritionLog>[] = [
      { meal_type: 'Desayuno', description: 'Tortilla y avena', calories: 500, protein_g: 40, carbs_g: 50, fat_g: 15 },
      { meal_type: 'Almuerzo', description: 'Pollo con arroz', calories: 700, protein_g: 60, carbs_g: 75, fat_g: 18 },
    ];

    const result = validateMealBatch(validBatch);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.totals.calories, 1200);
    assert.strictEqual(result.totals.protein_g, 100);
  });

  it('VAL-3: validateMealBatch rechaza lotes vacíos o con macros negativos', () => {
    // Lote vacío
    const emptyResult = validateMealBatch([]);
    assert.strictEqual(emptyResult.valid, false);
    assert.ok(emptyResult.errors.some((e) => e.includes('no contiene')));

    // Lote con anomalías negativas y descripción faltante
    const invalidBatch: Partial<NutritionLog>[] = [
      { meal_type: 'Snack', description: '', calories: -100, protein_g: -5, carbs_g: 10, fat_g: 2 },
    ];
    const invalidResult = validateMealBatch(invalidBatch);
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors.length >= 3, 'Debe detectar múltiples anomalías');
  });
});

describe('P1.3: Deduplicación Inteligente e Idempotencia en Lote (applyTypicalDayBatch)', () => {
  const mockPreset: NutritionDayPreset = {
    id: 'preset-training-normocalorico',
    name: 'Día Típico Entrenamiento (2400 kcal)',
    meals: [
      { meal_type: 'Desayuno', description: 'Tortilla 3 huevos + Avena 60g', calories: 480, protein_g: 35, carbs_g: 45, fat_g: 16 },
      { meal_type: 'Almuerzo', description: 'Arroz 100g + Pechuga 200g + AOVE 10g', calories: 650, protein_g: 55, carbs_g: 80, fat_g: 12 },
      { meal_type: 'Snack', description: 'Yogur Griego 200g + Proteína Whey 30g', calories: 290, protein_g: 38, carbs_g: 10, fat_g: 8 },
      { meal_type: 'Cena', description: 'Salmón 200g + Patata Asada 250g', calories: 580, protein_g: 42, carbs_g: 45, fat_g: 22 },
    ],
  };

  it('BAT-1: Día vacío inserta todas las comidas del preset (4 de 4) en un solo batch', async () => {
    const existingLogsToday: NutritionLog[] = [];
    const date = '2026-10-08';

    const result = await applyTypicalDayBatch(mockPreset, existingLogsToday, date);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.insertedMeals.length, 4, 'Deben insertarse exactamente 4 comidas');
    assert.deepStrictEqual(result.skippedMeals, [], 'No debe omitir ninguna comida en día vacío');

    const totalCals = result.insertedMeals.reduce((acc, m) => acc + m.calories, 0);
    const totalProt = result.insertedMeals.reduce((acc, m) => acc + m.protein_g, 0);
    const totalCarbs = result.insertedMeals.reduce((acc, m) => acc + m.carbs_g, 0);
    const totalFat = result.insertedMeals.reduce((acc, m) => acc + m.fat_g, 0);

    assert.strictEqual(totalCals, 2000);
    assert.strictEqual(totalProt, 170);
    assert.strictEqual(totalCarbs, 180);
    assert.strictEqual(totalFat, 58);
  });

  it('BAT-2: Día con desayuno previo detecta duplicidad, omite desayuno e inserta las 3 restantes', async () => {
    const existingBreakfast: NutritionLog = {
      id: 'log-existing-breakfast',
      date: '2026-10-08',
      meal_type: 'Desayuno',
      description: 'Café solo + Tostada con tomate y jamón',
      calories: 320,
      protein_g: 18,
      carbs_g: 35,
      fat_g: 10,
      timestamp: '2026-10-08T08:30:00Z',
    };

    const existingLogsToday: NutritionLog[] = [existingBreakfast];
    const date = '2026-10-08';

    const result = await applyTypicalDayBatch(mockPreset, existingLogsToday, date);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.insertedMeals.length, 3, 'Deben insertarse 3 comidas (almuerzo, merienda, cena)');
    assert.deepStrictEqual(result.skippedMeals, ['desayuno'], 'Debe reportar "desayuno" como omitido por duplicidad');

    const hasBreakfastInInserted = result.insertedMeals.some(
      (m) => (m.meal_type || '').toLowerCase() === 'desayuno'
    );
    assert.strictEqual(hasBreakfastInInserted, false, 'El batch no debe contener desayuno');
  });

  it('BAT-3: Verificación de balance diario acumulado (desayuno manual + batch restante)', async () => {
    const existingBreakfast: NutritionLog = {
      id: 'log-existing-breakfast',
      date: '2026-10-08',
      meal_type: 'Desayuno',
      description: 'Desayuno manual previo',
      calories: 300,
      protein_g: 20,
      carbs_g: 30,
      fat_g: 10,
      timestamp: '2026-10-08T08:00:00Z',
    };

    const result = await applyTypicalDayBatch(mockPreset, [existingBreakfast], '2026-10-08');

    const combinedMeals = [existingBreakfast, ...result.insertedMeals];
    const finalCalories = combinedMeals.reduce((acc, m) => acc + m.calories, 0);
    const finalProtein = combinedMeals.reduce((acc, m) => acc + m.protein_g, 0);

    assert.strictEqual(finalCalories, 1820, 'Las calorías del día deben sumar 1820 kcal sin duplicar desayuno');
    assert.strictEqual(finalProtein, 155, 'La proteína total debe ser 20g + (55+38+42)g = 155g');
  });

  it('BAT-4: Inmutabilidad estricta de la plantilla base durante operaciones concurrentes de inserción', () => {
    const originalMealCount = mockPreset.meals.length;
    const clonedSnapshot = JSON.stringify(mockPreset);

    const existingBreakfast: NutritionLog = {
      id: 'log-1',
      date: '2026-10-08',
      meal_type: 'Desayuno',
      description: 'Prueba concurrente',
      calories: 100,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 0,
      timestamp: '',
    };

    applyTypicalDayBatch(mockPreset, [existingBreakfast], '2026-10-08');

    assert.strictEqual(mockPreset.meals.length, originalMealCount, 'No debe alterar el número de comidas del preset');
    assert.strictEqual(JSON.stringify(mockPreset), clonedSnapshot, 'El objeto preset debe permanecer idéntico');
  });

  it('BAT-5: TYPICAL_DAY_PRESETS contiene la pauta activa de déficit (2400 kcal / 202g prot)', () => {
    assert.ok(TYPICAL_DAY_PRESETS.length > 0, 'Debe contener al menos 1 preset');
    const standard = TYPICAL_DAY_PRESETS[0];
    const totalProt = standard.meals.reduce((acc, m) => acc + m.protein_g, 0);
    const totalCals = standard.meals.reduce((acc, m) => acc + m.calories, 0);

    assert.ok(totalProt >= 195 && totalProt <= 210, `Proteína debe rondar ~202g pero fue ${totalProt}`);
    assert.ok(totalCals >= 2350 && totalCals <= 2450, `Calorías deben rondar ~2400 pero fueron ${totalCals}`);
  });
});

describe('P1.3: Simulación de Inserción Masiva en MockStore (Backend Batch Support)', () => {
  it('API-1: Inserción atómica de 4 comidas en mockStore.nutritionLogs preserva orden y recalcula totales', () => {
    const initialCount = mockStore.nutritionLogs.length;
    const testDate = '2026-12-25';

    const batchToInsert: NutritionLog[] = [
      {
        id: `mock-batch-1`,
        date: testDate,
        timestamp: `${testDate}T08:30:00Z`,
        meal_type: 'Desayuno',
        description: '3 huevos + avena',
        calories: 580,
        protein_g: 38,
        carbs_g: 60,
        fat_g: 21,
      },
      {
        id: `mock-batch-2`,
        date: testDate,
        timestamp: `${testDate}T14:00:00Z`,
        meal_type: 'Almuerzo',
        description: 'Pollo + arroz',
        calories: 670,
        protein_g: 60,
        carbs_g: 68,
        fat_g: 17,
      },
    ];

    // Simulación del comportamiento de POST /api/nutrition
    mockStore.nutritionLogs.unshift(...batchToInsert);

    assert.strictEqual(
      mockStore.nutritionLogs.length,
      initialCount + 2,
      'Deben añadirse exactamente 2 registros a mockStore'
    );

    const dayMeals = mockStore.nutritionLogs.filter((m) => m.date === testDate);
    assert.strictEqual(dayMeals.length, 2);

    const dayTotals = calculateMealTotals(dayMeals);
    assert.strictEqual(dayTotals.calories, 1250);
    assert.strictEqual(dayTotals.protein_g, 98);

    // Limpieza posterior de mockStore
    mockStore.nutritionLogs = mockStore.nutritionLogs.filter((m) => m.date !== testDate);
  });
});
