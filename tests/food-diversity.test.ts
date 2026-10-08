import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  analyzeWeeklyFoodDiversity, 
  BromatologicalGroup, 
  FoodDiversityReport 
} from '../src/lib/nutrition/foodDiversityEngine';
import { NutritionLog } from '../src/types/database';

describe('FASE 1: Food Diversity & Bromatological Audit Engine', () => {

  const sampleMockLogs: NutritionLog[] = [
    {
      id: 'log-1',
      timestamp: '2026-10-01T14:00:00Z',
      date: '2026-10-01',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo a la plancha con arroz blanco y aceite de oliva',
      calories: 550,
      protein_g: 45,
      carbs_g: 60,
      fat_g: 12
    },
    {
      id: 'log-2',
      timestamp: '2026-10-02T14:00:00Z',
      date: '2026-10-02',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo con verduras al vapor y espinacas',
      calories: 400,
      protein_g: 42,
      carbs_g: 15,
      fat_g: 8
    },
    {
      id: 'log-3',
      timestamp: '2026-10-03T14:00:00Z',
      date: '2026-10-03',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo con patata cocida y tomate',
      calories: 480,
      protein_g: 40,
      carbs_g: 50,
      fat_g: 7
    },
    {
      id: 'log-4',
      timestamp: '2026-10-04T14:00:00Z',
      date: '2026-10-04',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo con arroz integral',
      calories: 520,
      protein_g: 44,
      carbs_g: 58,
      fat_g: 9
    },
    {
      id: 'log-5',
      timestamp: '2026-10-05T14:00:00Z',
      date: '2026-10-05',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo con queso mozzarella y claras de huevo',
      calories: 490,
      protein_g: 50,
      carbs_g: 8,
      fat_g: 16
    },
    {
      id: 'log-6',
      timestamp: '2026-10-06T14:00:00Z',
      date: '2026-10-06',
      meal_type: 'Almuerzo',
      description: 'Pechuga de pollo a la plancha con ensalada de tomate y lechuga',
      calories: 420,
      protein_g: 43,
      carbs_g: 12,
      fat_g: 10
    }
  ];

  it('DIV-1: Manejo robusto de semana sin registros (registros vacíos)', () => {
    const report: FoodDiversityReport = analyzeWeeklyFoodDiversity([]);
    assert.strictEqual(report.totalFoodsLogged, 0);
    assert.strictEqual(report.diversityScore, 0);
    assert.strictEqual(report.diversityLevel, 'POOR');
    assert.strictEqual(report.uniquePlantCount, 0);
    assert.ok(report.deficiencyAlerts.length > 0, 'Debe alertar de falta de grupos nutricionales básicos');
  });

  it('DIV-2: Detección de Sobreconsumo/Monotonía (>5 tomas de pechuga de pollo)', () => {
    const report = analyzeWeeklyFoodDiversity(sampleMockLogs);
    
    // Pollo consumido 6 veces en 6 logs
    const chickenWarning = report.abuseWarnings.find(w => w.food.toLowerCase().includes('pollo'));
    assert.ok(chickenWarning, 'Debe emitir una alerta por abuso o monotonía de pechuga de pollo');
    assert.ok(chickenWarning.count >= 5, 'El conteo debe ser igual o superior a 5 tomas');
    assert.ok(chickenWarning.message.includes('pollo'), 'El mensaje debe especificar el alimento');
  });

  it('DIV-3: Detección de Carencias Críticas (0 pescado azul / Omega-3 y 0 legumbres)', () => {
    const report = analyzeWeeklyFoodDiversity(sampleMockLogs);

    const omega3Deficiency = report.deficiencyAlerts.find(d => d.group === BromatologicalGroup.FATTY_FISH);
    assert.ok(omega3Deficiency, 'Debe alertar de la falta total de pescado azul / Omega-3');
    assert.ok(omega3Deficiency.message.includes('pescado azul') || omega3Deficiency.message.includes('Omega-3'));

    const legumeDeficiency = report.deficiencyAlerts.find(d => d.group === BromatologicalGroup.LEGUMES);
    assert.ok(legumeDeficiency, 'Debe alertar de la falta de legumbres');
  });

  it('DIV-4: Contabilización de Plant Points (Microbioma vegetal diverso)', () => {
    const variedPlantLogs: NutritionLog[] = [
      {
        id: 'plant-1',
        timestamp: '2026-10-07T14:00:00Z',
        date: '2026-10-07',
        meal_type: 'Almuerzo',
        description: 'Ensalada con espinacas, tomate, zanahoria, nueces, arándanos y garbanzos',
        calories: 450,
        protein_g: 18,
        carbs_g: 45,
        fat_g: 16
      },
      {
        id: 'plant-2',
        timestamp: '2026-10-07T09:00:00Z',
        date: '2026-10-07',
        meal_type: 'Desayuno',
        description: 'Avena integral con plátano, kiwi, semillas de chía y canela',
        calories: 380,
        protein_g: 12,
        carbs_g: 62,
        fat_g: 8
      }
    ];

    const report = analyzeWeeklyFoodDiversity(variedPlantLogs);
    // Plantas detectadas: espinacas, tomate, zanahoria, nueces, arándanos, garbanzos, avena, plátano, kiwi, chía (al menos 8-10 plantas únicas)
    assert.ok(report.uniquePlantCount >= 7, `Se esperaban >=7 puntos vegetales, se detectaron ${report.uniquePlantCount}`);
    assert.ok(report.plantPoints.includes('espinacas'));
    assert.ok(report.plantPoints.includes('garbanzos'));
  });

  it('DIV-5: Sugerencias de Rotación Inteligente con Alternativas de Mercadona', () => {
    const report = analyzeWeeklyFoodDiversity(sampleMockLogs);
    assert.ok(report.rotationSuggestions.length >= 2, 'Debe ofrecer al menos 2 recomendaciones de rotación');
    
    const hasFishOrLegumeSwap = report.rotationSuggestions.some(s => 
      s.alternativeFood.toLowerCase().includes('salmón') || 
      s.alternativeFood.toLowerCase().includes('merluza') ||
      s.alternativeFood.toLowerCase().includes('garbanzo')
    );
    assert.ok(hasFishOrLegumeSwap, 'Debe sugerir alternativas para no comer siempre lo mismo');
  });

  it('DIV-6: Puntuación de Diversidad Global (Score 0 a 100) calibrada', () => {
    // Dieta hiper-variada con todos los grupos cubiertos
    const balancedWeekLogs: NutritionLog[] = [
      { id: 'b1', timestamp: '2026-10-01T14:00:00Z', date: '2026-10-01', meal_type: 'Almuerzo', description: 'Salmón a la plancha con espinacas y patata', calories: 500, protein_g: 40, carbs_g: 35, fat_g: 20 },
      { id: 'b2', timestamp: '2026-10-02T14:00:00Z', date: '2026-10-02', meal_type: 'Almuerzo', description: 'Garbanzos cocidos con verduras y ternera magra', calories: 550, protein_g: 42, carbs_g: 50, fat_g: 12 },
      { id: 'b3', timestamp: '2026-10-03T14:00:00Z', date: '2026-10-03', meal_type: 'Almuerzo', description: 'Tortilla de huevos con queso batido, plátano y nueces', calories: 480, protein_g: 38, carbs_g: 40, fat_g: 18 },
      { id: 'b4', timestamp: '2026-10-04T14:00:00Z', date: '2026-10-04', meal_type: 'Almuerzo', description: 'Merluza al horno con arroz integral y aceite de oliva', calories: 460, protein_g: 39, carbs_g: 45, fat_g: 11 },
      { id: 'b5', timestamp: '2026-10-05T14:00:00Z', date: '2026-10-05', meal_type: 'Almuerzo', description: 'Pechuga de pavo con brócoli y arándanos', calories: 420, protein_g: 41, carbs_g: 25, fat_g: 8 }
    ];

    const balancedReport = analyzeWeeklyFoodDiversity(balancedWeekLogs);
    const monotonousReport = analyzeWeeklyFoodDiversity(sampleMockLogs);

    assert.ok(balancedReport.diversityScore > monotonousReport.diversityScore, 
      `El score variado (${balancedReport.diversityScore}) debe superar al monótono (${monotonousReport.diversityScore})`);
    assert.ok(balancedReport.diversityScore >= 70, 'Una dieta equilibrada debe superar 70 puntos');
  });

});
