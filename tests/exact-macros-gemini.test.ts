import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractExplicitMacrosFromText,
  parseMultipleDishesWithExactMacros,
} from '../src/lib/frequentFoodsManager';
import { executeCoachTurn } from '../src/lib/coach/coachCore';

test('EXACT MACROS: Extracción de macros explícitos desde texto dictado', () => {
  const text1 = 'Arroz con pollo: 480 kcal, 42g proteína, 55g hidratos y 8g grasa';
  const res1 = extractExplicitMacrosFromText(text1);

  assert.equal(res1.hasExplicitMacros, true);
  assert.equal(res1.calories, 480);
  assert.equal(res1.protein_g, 42);
  assert.equal(res1.carbs_g, 55);
  assert.equal(res1.fat_g, 8);

  // Formato alternativo con decimales y términos como "ch" y "calorías"
  const text2 = 'Batido de proteína 250 calorías, 30.5g de proteina y 2g grasas';
  const res2 = extractExplicitMacrosFromText(text2);
  assert.equal(res2.hasExplicitMacros, true);
  assert.equal(res2.calories, 250);
  assert.equal(res2.protein_g, 30.5);
  assert.equal(res2.fat_g, 2);
});

test('EXACT MACROS: Parseo de múltiples platos en salidas estructuradas de Gemini', () => {
  const geminiOutput = `
1. Desayuno: Tortilla de 3 huevos con espinacas y tostada de centeno
Calorías: 380 kcal, 28g proteína, 25g hidratos, 18g grasa

2. Almuerzo: Salmón a la plancha con arroz basmati y brócoli
Calorías: 620 kcal, 45g proteína, 58g carbohidratos, 22g grasa

3. Merienda: Yogur griego con nueces
Calorías: 240 kcal, 16g proteína, 12g carbohidratos, 14g grasa
  `;

  const dishes = parseMultipleDishesWithExactMacros(geminiOutput);

  assert.equal(dishes.length, 3);
  assert.equal(dishes[0].mealType, 'Desayuno');
  assert.equal(dishes[0].calories, 380);
  assert.equal(dishes[0].protein_g, 28);
  assert.equal(dishes[0].carbs_g, 25);
  assert.equal(dishes[0].fat_g, 18);

  assert.equal(dishes[1].mealType, 'Almuerzo');
  assert.equal(dishes[1].calories, 620);
  assert.equal(dishes[1].protein_g, 45);

  assert.equal(dishes[2].mealType, 'Merienda');
  assert.equal(dishes[2].calories, 240);
  assert.equal(dishes[2].fat_g, 14);
});

test('EXACT MACROS: Deterministic Bypass procesa lote de platos sin llamar a Gemini', async () => {
  const multipleDishesText = `
1. Ternera con patatas: 550 kcal, 50g proteína, 40g hidratos, 15g grasa
2. Manzana con crema de cacahuete: 220 kcal, 6g proteína, 24g carbohidratos, 10g grasa
  `;

  const turnResult = await executeCoachTurn({ text: multipleDishesText });

  assert.equal(turnResult.success, true);
  assert.equal(turnResult.action, 'log_multiple_dishes');
  assert.ok(turnResult.replyText.includes('Registradas 2 comidas'));
  assert.ok(turnResult.replyText.includes('770 kcal'));
  assert.equal(turnResult.coachTip, 'Tus macros dictados se han guardado con 100% de fidelidad sin modificaciones.');
});
