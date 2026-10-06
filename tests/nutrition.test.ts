import test from 'node:test';
import assert from 'node:assert/strict';
import { extractItemsFromText, calculateMealFromWeighedItems } from '../src/lib/mercadonaNutrition';

test('TDD: Audio complejo con puntos y preparación separa correctamente los 4 ingredientes', async () => {
  const audioText = '217 g de calabacín cocinado, 204 g de contramuslo deshuesado cocinado. Para cocinar estas dos cosas hemos usado 10 g de aceite de oliva virgen extra y 63 g de mozzarella.';
  
  const items = extractItemsFromText(audioText);
  
  // Debe extraer exactamente 4 alimentos pesados
  assert.strictEqual(items.length, 4, `Esperados 4 alimentos pero se obtuvieron ${items.length}: ${JSON.stringify(items)}`);
  
  const calabacin = items.find(i => i.food.toLowerCase().includes('calabac'));
  const contramuslo = items.find(i => i.food.toLowerCase().includes('contramuslo'));
  const aove = items.find(i => i.food.toLowerCase().includes('aceite') || i.food.toLowerCase().includes('aove'));
  const mozzarella = items.find(i => i.food.toLowerCase().includes('mozzarella'));

  assert.ok(calabacin, 'Debe detectar calabacín');
  assert.strictEqual(calabacin?.amount, 217);

  assert.ok(contramuslo, 'Debe detectar contramuslo');
  assert.strictEqual(contramuslo?.amount, 204);
  // El nombre no debe tener el texto del aceite adherido
  assert.ok(!contramuslo?.food.toLowerCase().includes('aceite'), 'El nombre del contramuslo no debe contener la frase del aceite');

  assert.ok(aove, 'Debe detectar aceite de oliva');
  assert.strictEqual(aove?.amount, 10);

  assert.ok(mozzarella, 'Debe detectar mozzarella');
  assert.strictEqual(mozzarella?.amount, 63);

  // Verificación bromatológica del cálculo completo
  const meal = await calculateMealFromWeighedItems(items);
  
  // El contramuslo debe aportar ~50g de proteína y ~363 kcal
  const contramusloResult = meal.items.find(i => i.foodName.toLowerCase().includes('contramuslo'));
  assert.ok(contramusloResult, 'Debe existir resultado para contramuslo');
  assert.ok(contramusloResult.protein_g >= 45, `Proteína de contramuslo debe ser >= 45g pero fue ${contramusloResult.protein_g}g`);
  assert.ok(contramusloResult.calories < 450, `Calorías de contramuslo deben ser < 450 kcal pero fueron ${contramusloResult.calories} kcal`);
  assert.strictEqual(contramusloResult.carbs_g, 0, 'El contramuslo no debe tener carbohidratos');

  // Total de la comida: ~630-670 kcal, ~60-66g proteína
  assert.ok(meal.totalCalories >= 600 && meal.totalCalories <= 700, `Calorías totales deben estar entre 600 y 700 pero fueron ${meal.totalCalories}`);
  assert.ok(meal.totalProtein >= 60 && meal.totalProtein <= 70, `Proteína total debe estar entre 60 y 70g pero fue ${meal.totalProtein}`);
  assert.ok(meal.totalFat >= 35 && meal.totalFat <= 45, `Grasa total debe estar entre 35 y 45g pero fue ${meal.totalFat}`);
});

test('TDD: Separación de pesajes múltiples continuos sin signos de puntuación', () => {
  const text = '200g lomo de cerdo cocinado 80g arroz cocinado y 15g aceite de oliva';
  const items = extractItemsFromText(text);

  assert.strictEqual(items.length, 3, `Esperados 3 alimentos, obtenidos: ${JSON.stringify(items)}`);
  assert.strictEqual(items[0].amount, 200);
  assert.ok(items[0].food.toLowerCase().includes('lomo'));
  assert.strictEqual(items[1].amount, 80);
  assert.ok(items[1].food.toLowerCase().includes('arroz'));
  assert.strictEqual(items[2].amount, 15);
  assert.ok(items[2].food.toLowerCase().includes('aceite'));
});

test('TDD: Inmutabilidad del catálogo tras procesar alimentos con menciones cruzadas de aceite', async () => {
  // Primero procesar contramuslo con mención de aceite
  const items1 = extractItemsFromText('200g contramuslo con unas gotas de aceite');
  await calculateMealFromWeighedItems(items1);

  // Segundo procesar contramuslo limpio sin aceite: debe mantener intactos sus ~25g de proteína por 100g
  const items2 = [{ food: 'contramuslo cocinado', amount: 100, unit: 'g' }];
  const cleanMeal = await calculateMealFromWeighedItems(items2);
  const cleanContramuslo = cleanMeal.items[0];

  assert.strictEqual(cleanContramuslo.protein_g, 25, 'La proteína del catálogo debe seguir siendo 25g por 100g y no mutar a 0');
  assert.strictEqual(cleanContramuslo.carbs_g, 0, 'Carbohidratos deben ser 0g');
  assert.ok(cleanContramuslo.calories < 200, 'Calorías deben corresponder a contramuslo (~178 kcal), nunca aceite (~824 kcal)');
});

test('TDD: Desayuno complejo con 5 ingredientes y etiquetas nutricionales por 100g dictadas por voz', async () => {
  const audioText = 'Finalmente, he usado un huevo que pesaba 54 g, 151 g de claras de huevo pasteurizadas, 20 g de espinacas, 40 g de queso mozzarella gouda rallado, que por 100 g tiene 326 calorías, 25 g de grasas, 3,3 g de hidratos de carbono y 22 g de proteína. Y después, 80 g de pechuga de pavo en finas lonchas, que por 100 g tiene 76 calorías, 0,5 de grasas, 1,3 de hidratos de carbono y 16,5 g de proteína. Todos estos valores antes de cocinar.';

  const items = extractItemsFromText(audioText);

  // Deben extraerse exactamente 5 ingredientes
  assert.strictEqual(items.length, 5, `Esperados 5 alimentos pero se obtuvieron ${items.length}: ${JSON.stringify(items)}`);

  const huevo = items.find(i => i.food.toLowerCase().includes('huevo') && !i.food.toLowerCase().includes('clara'));
  const claras = items.find(i => i.food.toLowerCase().includes('clara'));
  const espinacas = items.find(i => i.food.toLowerCase().includes('espinaca'));
  const queso = items.find(i => i.food.toLowerCase().includes('queso') || i.food.toLowerCase().includes('gouda') || i.food.toLowerCase().includes('mozzarella'));
  const pavo = items.find(i => i.food.toLowerCase().includes('pavo'));

  assert.ok(huevo, 'Debe detectar el huevo');
  assert.strictEqual(huevo?.amount, 54);

  assert.ok(claras, 'Debe detectar las claras');
  assert.strictEqual(claras?.amount, 151);

  assert.ok(espinacas, 'Debe detectar las espinacas');
  assert.strictEqual(espinacas?.amount, 20);

  assert.ok(queso, 'Debe detectar el queso con su etiqueta por 100g');
  assert.strictEqual(queso?.amount, 40);
  assert.ok(queso?.explicit_macros_100g, 'El queso debe tener explicit_macros_100g');
  assert.strictEqual(queso?.explicit_macros_100g?.calories, 326);
  assert.strictEqual(queso?.explicit_macros_100g?.fat_g, 25);
  assert.strictEqual(queso?.explicit_macros_100g?.protein_g, 22);

  assert.ok(pavo, 'Debe detectar la pechuga de pavo con su etiqueta por 100g');
  assert.strictEqual(pavo?.amount, 80);
  assert.ok(pavo?.explicit_macros_100g, 'El pavo debe tener explicit_macros_100g');
  assert.strictEqual(pavo?.explicit_macros_100g?.calories, 76);
  assert.strictEqual(pavo?.explicit_macros_100g?.protein_g, 16.5);

  const meal = await calculateMealFromWeighedItems(items);

  // Verificación bromatológica acumulada estricta:
  // ~345-360 kcal, ~44-48g de proteína real, ~3.5-4.5g carbohidratos, ~15-17g grasas
  assert.ok(meal.totalCalories >= 330 && meal.totalCalories <= 370, `Calorías esperadas ~349 pero fueron ${meal.totalCalories}`);
  assert.ok(meal.totalProtein >= 44 && meal.totalProtein <= 48, `Proteína esperada ~46g pero fue ${meal.totalProtein}`);
  assert.ok(meal.totalFat >= 14 && meal.totalFat <= 18, `Grasa esperada ~16g pero fue ${meal.totalFat}`);
});

