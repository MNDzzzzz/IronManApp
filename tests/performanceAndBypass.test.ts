import test from 'node:test';
import assert from 'node:assert';
import { tryDeterministicBypass, getSpainTodayStr } from '../src/lib/coach/coachCore';
import { findMercadonaProduct } from '../src/lib/mercadonaNutrition';

test('PERFORMANCE: Búsqueda indexada en memoria O(1) de Mercadona en < 1ms', () => {
  const t0 = performance.now();
  const pollo = findMercadonaProduct('pechuga de pollo cocinada');
  const t1 = performance.now();

  assert.ok(pollo, 'Debe encontrar la pechuga de pollo cocinada');
  assert.strictEqual(pollo.calories_100g, 145);
  assert.ok(!('protein_g' in pollo), 'En product es protein_100g, no protein_g');
  assert.strictEqual(pollo.protein_100g, 31);
  assert.ok((t1 - t0) < 5, `La búsqueda debe ser ultra-rápida (tardó ${(t1 - t0).toFixed(3)}ms)`);
});

test('PERFORMANCE & BYPASS: Comida pesada con múltiples ingredientes resuelve en 0ms sin tocar Gemini', async () => {
  const today = getSpainTodayStr();
  const input = '200g de pechuga de pollo cocinada y 150g de arroz basmati';

  const t0 = performance.now();
  const result = await tryDeterministicBypass(input, today);
  const t1 = performance.now();

  assert.ok(result, 'El bypass determinista debe activarse');
  assert.strictEqual(result.action, 'log_nutrition');
  assert.ok(result.nutrition);
  assert.ok(result.nutrition.calories > 0);
  assert.ok(result.nutrition.protein_g > 0);
  assert.ok((t1 - t0) < 15, `El cálculo bromatológico determinista tardó ${(t1 - t0).toFixed(2)}ms (< 15ms)`);
});

test('PERFORMANCE & BYPASS: Registro directo de agua resuelve instantáneamente', async () => {
  const today = getSpainTodayStr();
  const input = 'me he bebido 750 ml de agua';

  const result = await tryDeterministicBypass(input, today);

  assert.ok(result);
  assert.strictEqual(result.action, 'log_water');
  assert.strictEqual(result.water_ml, 750);
});

test('PERFORMANCE & BYPASS: Registro de peso corporal directo resuelve en 0ms', async () => {
  const today = getSpainTodayStr();
  const input = 'peso 100.4 kg';

  const result = await tryDeterministicBypass(input, today);

  assert.ok(result);
  assert.strictEqual(result.action, 'log_weight');
  assert.strictEqual(result.weight_log?.weight_kg, 100.4);
});

test('PERFORMANCE & BYPASS: Preguntas clínicas y dudas articulares NO hacen bypass (se derivan a IA)', async () => {
  const today = getSpainTodayStr();
  const consulta = '¿Qué me recomiendas para el dolor en la rodilla tras rodar?';

  const result = await tryDeterministicBypass(consulta, today);

  assert.strictEqual(result, null, 'Debe devolver null para que el Coach con Gemini responda');
});
