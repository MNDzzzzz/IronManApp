// ====================================================================
// ADAPTADOR DINÁMICO DE NUTRICIÓN Y MACROS: IronManApp
// Analiza telemetría real (Pasos Fit3, Km carrera, evolución de peso y tendones)
// para prescribir y aplicar los ajustes nutricionales exactos de la semana siguiente.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { NutritionAdaptation } from '@/types/database';
import { activeProtocol } from '@/lib/nutritionProtocol';
import { WeeklyReportDataset } from './weeklyDataAggregator';

export interface ProposedDietPlan {
  adaptation: NutritionAdaptation;
  recommendations: string[];
  neatCategory: 'Bajo' | 'Óptimo' | 'Elevado';
  metabolicStatus: string;
}

/**
 * Calcula la adaptación de dieta para la próxima semana con base en datos 100% reales
 */
export function calculateWeeklyDietAdaptation(dataset: WeeklyReportDataset): ProposedDietPlan {
  const summary = dataset.summary;
  const currentWeight = summary.latestWeightKg || activeProtocol.weightKg || 101.0;
  const avgSteps = summary.avgDailySteps;
  const cardioKm = summary.totalCardioKm;
  const deltaWeight = summary.weightDeltaKg;
  const nextWeekNumber = dataset.weekNumber + 1;

  // 1. Evaluación de NEAT y Gasto Energético Real (Fit3)
  let neatCategory: 'Bajo' | 'Óptimo' | 'Elevado' = 'Óptimo';
  let kcalAdjustment = 0;
  const reasons: string[] = [];
  const tacticalRecommendations: string[] = [];

  if (avgSteps < 9500) {
    neatCategory = 'Bajo';
    kcalAdjustment -= 100; // Déficit se reduce si el NEAT baja para evitar estancamiento
    reasons.push(`NEAT semanal bajo (${avgSteps.toLocaleString('es-ES')} pasos/día vs objetivo 10.5k). Ajuste calórico preventivo (-100 kcal).`);
    tacticalRecommendations.push('Aumentar paseos activos en descansos para mantener el gasto sin sobrecargar rodilla.');
  } else if (avgSteps > 12500) {
    neatCategory = 'Elevado';
    kcalAdjustment += 100; // Si el NEAT fue altísimo, prevenimos catabolismo y fatiga tendinosa
    reasons.push(`NEAT semanal muy alto (${avgSteps.toLocaleString('es-ES')} pasos/día). Ligero aporte extra (+100 kcal) para evitar degradación muscular.`);
    tacticalRecommendations.push('Asegurar ingesta de hidratos complejos tras caminatas largas para reponer glucógeno.');
  } else {
    neatCategory = 'Óptimo';
    reasons.push(`NEAT semanal consolidado (${avgSteps.toLocaleString('es-ES')} pasos/día en rango diana 10.0k-12.0k).`);
  }

  // 2. Evaluación de Volumen de Carrera (Strava / Rodajes)
  if (cardioKm >= 12) {
    reasons.push(`Volumen de carrera completado alto (${cardioKm.toFixed(1)} km). Prioridad recarga de glucógeno para rodaje largo.`);
    tacticalRecommendations.push('Priorizar 60-80g de hidratos limpios (arroz/patata) en la comida previa y posterior a rodajes.');
  } else if (cardioKm > 0) {
    reasons.push(`Volumen de cardio registrado (${cardioKm.toFixed(1)} km). Hidratos calibrados al volumen actual.`);
  } else {
    reasons.push('Semana de descarga o sin cardio registrado en exterior. Hidratos ajustados al trabajo de fuerza de gimnasio.');
    tacticalRecommendations.push('Mantener distribución de hidratos regular sin sobrecargas excesivas pre-entreno.');
  }

  // 3. Evaluación de Peso y Recomposición
  if (deltaWeight !== null) {
    if (deltaWeight < -1.2) {
      // Pérdida demasiado rápida (>1.2 kg en una semana con 101 kg suele implicar agua + riesgo muscular)
      kcalAdjustment += 80;
      reasons.push(`Descenso de peso rápido (${deltaWeight.toFixed(2)} kg). Aumentamos 80 kcal para preservar masa magra.`);
      tacticalRecommendations.push('Controlar que la pérdida semanal no supere 0.7-1.0 kg para no perder potencia neuromuscular.');
    } else if (deltaWeight > 0.4) {
      // Ligero repunte de peso
      kcalAdjustment -= 80;
      reasons.push(`Ligero incremento de peso (+${deltaWeight.toFixed(2)} kg). Ajustamos déficit a 2.320 kcal.`);
      tacticalRecommendations.push('Revisar pesaje de alimentos en aceite de oliva (AOVE) y frutos secos para evitar calorías ocultas.');
    } else {
      reasons.push(`Ritmo de recomposición excelente (${deltaWeight ? deltaWeight.toFixed(2) : 'estable'} kg).`);
    }
  }

  // 4. Cálculo final de Calorías y Macronutrientes
  // Base segura de recomposición para 101 kg: 2.400 kcal
  let targetCalories = Math.round(2400 + kcalAdjustment);
  // Límites de seguridad clínica: entre 2.250 y 2.500 kcal
  targetCalories = Math.max(2250, Math.min(2500, targetCalories));

  // Proteína: 2.0 g por kg de peso corporal actual (innegociable para blindaje de tendones)
  const targetProteinG = Math.round(currentWeight * 2.0);

  // Grasas: 0.75 g por kg (soporte hormonal y absorción de vitaminas liposolubles A, D, E, K)
  const targetFatG = Math.round(Math.min(80, Math.max(68, currentWeight * 0.75)));

  // Carbohidratos: el resto calórico
  // Kcal restantes = targetCalories - (protein * 4) - (fat * 9)
  const remainingKcal = targetCalories - targetProteinG * 4 - targetFatG * 9;
  const targetCarbsG = Math.max(180, Math.round(remainingKcal / 4));

  // Hidratación: 3.800 ml base, +200ml si volumen cardio > 10 km
  let targetWaterMl = 3800;
  if (cardioKm >= 10 || avgSteps >= 12000) {
    targetWaterMl = 4000;
  }

  // Recomendación específica de creatina y rodilla
  tacticalRecommendations.push('5g de creatina monohidrato diarios con agua o batido para preservar depósitos de fosfocreatina.');
  tacticalRecommendations.push('Mantener ingesta de sal adecuada y 1 vaso de agua mineral al despertar para contrarrestar hipovolemia matutina.');

  const adaptation: NutritionAdaptation = {
    id: `diet-adapt-w${nextWeekNumber}-${Date.now()}`,
    week_number: nextWeekNumber,
    start_date: new Date().toISOString().split('T')[0],
    calories: targetCalories,
    protein_g: targetProteinG,
    carbs_g: targetCarbsG,
    fat_g: targetFatG,
    water_ml: targetWaterMl,
    reason: reasons.join(' '),
    applied: false,
  };

  const metabolicStatus = `Atleta en ${currentWeight.toFixed(1)} kg | Ingesta objetivo: ${targetCalories} kcal (${targetProteinG}g P, ${targetCarbsG}g HC, ${targetFatG}g G) | Hidratación: ${(targetWaterMl / 1000).toFixed(1)} L/día.`;

  return {
    adaptation,
    recommendations: tacticalRecommendations,
    neatCategory,
    metabolicStatus,
  };
}

/**
 * Aplica la prescripción de dieta al protocolo activo de la aplicación
 * y persiste el registro en la base de datos (Supabase y mockStore).
 */
export async function applyDietAdaptation(adaptation: NutritionAdaptation): Promise<{
  success: boolean;
  message: string;
  appliedProtocol: typeof activeProtocol;
}> {
  adaptation.applied = true;
  adaptation.applied_at = new Date().toISOString();

  // 1. Actualizar el protocolo activo en memoria
  activeProtocol.targets.calories = adaptation.calories;
  activeProtocol.targets.proteinMin = adaptation.protein_g - 7;
  activeProtocol.targets.proteinMax = adaptation.protein_g + 7;
  activeProtocol.targets.carbsMin = adaptation.carbs_g - 10;
  activeProtocol.targets.carbsMax = adaptation.carbs_g + 10;
  activeProtocol.targets.fatMin = adaptation.fat_g - 5;
  activeProtocol.targets.fatMax = adaptation.fat_g + 5;
  activeProtocol.targets.waterMl = adaptation.water_ml;

  // 2. Persistir en mockStore
  if (!mockStore.nutritionAdaptations) {
    mockStore.nutritionAdaptations = [];
  }
  const existingIdx = mockStore.nutritionAdaptations.findIndex(
    (a) => a.week_number === adaptation.week_number
  );
  if (existingIdx >= 0) {
    mockStore.nutritionAdaptations[existingIdx] = adaptation;
  } else {
    mockStore.nutritionAdaptations.push(adaptation);
  }

  // 3. Persistir en Supabase si está disponible
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('nutrition_adaptations').upsert(
        {
          id: adaptation.id,
          week_number: adaptation.week_number,
          start_date: adaptation.start_date,
          calories: adaptation.calories,
          protein_g: adaptation.protein_g,
          carbs_g: adaptation.carbs_g,
          fat_g: adaptation.fat_g,
          water_ml: adaptation.water_ml,
          reason: adaptation.reason,
          applied: true,
          applied_at: adaptation.applied_at,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('Aviso guardando nutrition_adaptation en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('Error en upsert de nutrition_adaptation en Supabase:', err.message);
    }
  }

  return {
    success: true,
    message: `Plan nutricional de la Semana ${adaptation.week_number} aplicado con éxito: ${adaptation.calories} kcal, ${adaptation.protein_g}g proteína, ${adaptation.carbs_g}g carbohidratos, ${adaptation.fat_g}g grasa y ${(adaptation.water_ml / 1000).toFixed(1)}L agua.`,
    appliedProtocol: activeProtocol,
  };
}

/**
 * Consulta la última adaptación de nutrición registrada
 */
export async function getLatestNutritionAdaptation(): Promise<NutritionAdaptation | null> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('nutrition_adaptations')
        .select('*')
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) return data;
    } catch (err) {
      console.warn('Aviso leyendo nutrition_adaptations en Supabase:', err);
    }
  }

  if (mockStore.nutritionAdaptations && mockStore.nutritionAdaptations.length > 0) {
    return [...mockStore.nutritionAdaptations].sort((a, b) => b.week_number - a.week_number)[0];
  }

  return null;
}
