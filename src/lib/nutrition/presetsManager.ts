// ====================================================================
// GESTOR DE PLANTILLAS Y DÍA TÍPICO CUMPLIDO (IronManApp)
// Especialista: Nutrición Deportiva y Lógica Bromatológica en Bloque
// Inserción por lotes idempotente sin fatiga de tracking ni duplicados.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { NutritionLog } from '@/types/database';

export type ValidMealType = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';

export interface PresetMealItem {
  meal_type: ValidMealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface NutritionDayPreset {
  id: string;
  name: string;
  description?: string;
  meals: PresetMealItem[];
}

export interface BatchInsertResult {
  success: boolean;
  insertedMeals: NutritionLog[];
  skippedMeals: string[];
}

/**
 * Catálogo de plantillas de día completo alineadas con el protocolo activo de Álvaro
 * (Déficit de recomposición: 2.400 kcal | 202g Proteína | 220g Carbohidratos | ~65g Grasa).
 */
export const TYPICAL_DAY_PRESETS: NutritionDayPreset[] = [
  {
    id: 'preset-recomposicion-2400',
    name: 'Día Típico Recomposición Álvaro (2.400 kcal / 202g Prot)',
    description: 'Menú estándar de 4 comidas con ingredientes oficiales de Mercadona/Hacendado',
    meals: [
      {
        meal_type: 'Desayuno',
        description: 'Tortilla (1 huevo + 150g claras) + 60g Copos de avena + 250ml Leche desnatada',
        calories: 480,
        protein_g: 42,
        carbs_g: 48,
        fat_g: 12,
      },
      {
        meal_type: 'Almuerzo',
        description: '200g Contramuslo pollo cocinado + 80g Arroz basmati en seco + 10g AOVE + 150g Calabacín',
        calories: 760,
        protein_g: 62,
        carbs_g: 65,
        fat_g: 22,
      },
      {
        meal_type: 'Snack',
        description: '250g Queso fresco batido 0% + 30g Proteína Whey Hacendado + 1 Plátano (100g)',
        calories: 410,
        protein_g: 48,
        carbs_g: 35,
        fat_g: 5,
      },
      {
        meal_type: 'Cena',
        description: '200g Lomo de cerdo / Ternera magra + 250g Patata cocida + 10g AOVE + Ensalada verde',
        calories: 750,
        protein_g: 50,
        carbs_g: 62,
        fat_g: 25,
      },
    ],
  },
  {
    id: 'preset-running-carbload',
    name: 'Día Típico Running / Carga Glucógeno (2.550 kcal / 195g Prot)',
    description: 'Mayor proporción de carbohidratos complejos para tiradas largas',
    meals: [
      {
        meal_type: 'Desayuno',
        description: '80g Avena + 200ml Leche + 1 Plátano + 30g Whey',
        calories: 550,
        protein_g: 42,
        carbs_g: 75,
        fat_g: 8,
      },
      {
        meal_type: 'Almuerzo',
        description: '100g Arroz + 200g Pechuga de pollo + 10g AOVE + Verdura',
        calories: 780,
        protein_g: 60,
        carbs_g: 90,
        fat_g: 12,
      },
      {
        meal_type: 'Snack',
        description: '2 Tostadas con mermelada y queso fresco + 200g Yogur + 20g Nueces',
        calories: 460,
        protein_g: 32,
        carbs_g: 48,
        fat_g: 14,
      },
      {
        meal_type: 'Cena',
        description: '200g Salmón + 300g Patata cocida + Ensalada',
        calories: 760,
        protein_g: 61,
        carbs_g: 55,
        fat_g: 28,
      },
    ],
  },
];

export const DEFAULT_TYPICAL_MEALS: PresetMealItem[] = TYPICAL_DAY_PRESETS[0].meals;

/**
 * Aplica una plantilla de día completo deduplicando automáticamente las comidas
 * que ya hayan sido registradas por el atleta en la fecha indicada.
 * Soporta firma (preset, existingLogs, date) y firma simplificada (existingLogs, date).
 * Función pura e inmutable.
 */
export async function applyTypicalDayBatch(
  presetOrLogs: NutritionDayPreset | NutritionLog[],
  logsOrDate: NutritionLog[] | string,
  maybeDate?: string
): Promise<BatchInsertResult> {
  let preset: NutritionDayPreset;
  let existingLogsToday: NutritionLog[];
  let date: string;

  if (Array.isArray(presetOrLogs)) {
    preset = TYPICAL_DAY_PRESETS[0];
    existingLogsToday = presetOrLogs;
    date = (logsOrDate as string) || new Date().toISOString().split('T')[0];
  } else {
    preset = presetOrLogs;
    existingLogsToday = (logsOrDate as NutritionLog[]) || [];
    date = maybeDate || new Date().toISOString().split('T')[0];
  }

  const existingMealTypes = new Set(
    existingLogsToday
      .filter((log) => log.date === date)
      .map((log) => (log.meal_type || '').toLowerCase().trim())
  );

  const insertedMeals: NutritionLog[] = [];
  const skippedMeals: string[] = [];
  const now = new Date();

  // Clonamos e iteramos sobre las comidas del preset
  const mealsToEvaluate = [...preset.meals];

  for (let i = 0; i < mealsToEvaluate.length; i++) {
    const meal = mealsToEvaluate[i];
    const normType = (meal.meal_type || '').toLowerCase().trim();

    if (existingMealTypes.has(normType)) {
      skippedMeals.push(normType);
      continue;
    }

    const timestamp = new Date(now.getTime() + i * 1000).toISOString();

    const newLog: NutritionLog = {
      id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      date,
      timestamp,
      meal_type: meal.meal_type,
      description: meal.description,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    };

    insertedMeals.push(newLog);
  }

  return {
    success: true,
    insertedMeals,
    skippedMeals,
  };
}
