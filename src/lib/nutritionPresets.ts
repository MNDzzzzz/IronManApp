// ====================================================================
// CATÁLOGO DE PLANTILLAS FRECUENTES Y GENERADOR "DÍA TÍPICO CUMPLIDO"
// Proyecto: IronManApp | Atleta: Álvaro (101 kg -> 85-88 kg)
// Idioma: Español (TypeScript estricto)
// ====================================================================

import { NutritionLog } from '@/types/database';
import { getTodayRoutine, getSpainDate, STRUCTURED_MENU_2400 } from '@/lib/weeklyRoutine';
import { DayType, activeProtocol } from '@/lib/nutritionProtocol';

export interface MealBlockTemplate {
  id: string;
  name: string;
  meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category?: 'fuerza' | 'running' | 'refeed' | 'general';
  isDefault?: boolean;
}

export interface PresetMealItem {
  meal_type: string;
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

export interface MealBatchValidationResult {
  valid: boolean;
  errors: string[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

// --------------------------------------------------------------------
// 1. CATÁLOGO OFICIAL DE 8 PLANTILLAS DE COMIDA EN BLOQUE (MERCADONA)
// --------------------------------------------------------------------
export const FREQUENT_MEAL_PRESETS: MealBlockTemplate[] = [
  // 1. Desayuno Fuerza & Energía
  {
    id: 'preset-desayuno-fuerza',
    name: 'Desayuno Fuerza & Energía',
    meal_type: 'Desayuno',
    description: '3 huevos revueltos (195g) + 2 claras pasteurizadas (70g) + 70g copos de avena + 1 plátano de Canarias + café solo',
    calories: 580,
    protein_g: 38.0,
    carbs_g: 60.0,
    fat_g: 21.0,
    category: 'fuerza',
    isDefault: true,
  },
  // 2. Desayuno Rápido Tortilla & Pavo
  {
    id: 'preset-desayuno-rapido',
    name: 'Desayuno Rápido Tortilla & Pavo',
    meal_type: 'Desayuno',
    description: 'Tortilla francesa (2 huevos) + 50g pavo en lonchas 92% + 30g queso tierno + 2 tostadas pan integral',
    calories: 450,
    protein_g: 36.0,
    carbs_g: 28.0,
    fat_g: 20.0,
    category: 'general',
  },
  // 3. Almuerzo Atleta: Pollo, Arroz y AOVE
  {
    id: 'preset-almuerzo-pollo-arroz',
    name: 'Almuerzo Atleta: Pollo, Arroz y AOVE',
    meal_type: 'Almuerzo',
    description: '220g pechuga de pollo cocinada/plancha + 220g arroz blanco cocido + ensalada verde grande con 12g AOVE',
    calories: 670,
    protein_g: 60.0,
    carbs_g: 68.0,
    fat_g: 17.0,
    category: 'fuerza',
    isDefault: true,
  },
  // 4. Almuerzo Magro: Lomo, Patata y Verduras
  {
    id: 'preset-almuerzo-lomo-patata',
    name: 'Almuerzo Magro: Lomo, Patata y Verduras',
    meal_type: 'Almuerzo',
    description: '200g lomo de cerdo cocinado + 250g patata cocida/asada + verduras al vapor + 10g AOVE',
    calories: 620,
    protein_g: 58.0,
    carbs_g: 52.0,
    fat_g: 18.0,
    category: 'general',
  },
  // 5. Merienda Pre/Post Entreno: Avena, Whey y Creatina
  {
    id: 'preset-merienda-whey-creatina',
    name: 'Merienda Atleta: Avena, Whey y Creatina',
    meal_type: 'Snack',
    description: '300g queso fresco batido 0% + 35g Impact Whey + 1 manzana grande + 20g nueces peladas + 5g creatina',
    calories: 510,
    protein_g: 54.0,
    carbs_g: 40.0,
    fat_g: 15.0,
    category: 'fuerza',
    isDefault: true,
  },
  // 6. Snack Rápido: Bol Avena, Leche y Whey
  {
    id: 'preset-snack-bol-avena-leche',
    name: 'Snack Rápido: Bol Avena, Leche y Whey',
    meal_type: 'Snack',
    description: '50g copos de avena + 200ml leche desnatada + 30g proteína whey + 15g crema de cacahuete 100%',
    calories: 440,
    protein_g: 38.0,
    carbs_g: 42.0,
    fat_g: 12.0,
    category: 'running',
  },
  // 7. Cena Reparadora: Salmón, Patata y Brócoli
  {
    id: 'preset-cena-salmon-patata',
    name: 'Cena Reparadora: Salmón, Patata y Brócoli',
    meal_type: 'Cena',
    description: '220g salmón fresco a la plancha + 180g patata al vapor + plato de brócoli al vapor + 10g AOVE',
    calories: 540,
    protein_g: 50.0,
    carbs_g: 35.0,
    fat_g: 22.0,
    category: 'fuerza',
    isDefault: true,
  },
  // 8. Cena Ligera: Contramuslo, Calabacín y Mozzarella
  {
    id: 'preset-cena-contramuslo-calabacin',
    name: 'Cena Ligera: Contramuslo, Calabacín y Mozzarella',
    meal_type: 'Cena',
    description: '200g contramuslo de pollo deshuesado cocinado + 200g calabacín a la plancha + 60g mozzarella fresca + 10g AOVE',
    calories: 520,
    protein_g: 52.0,
    carbs_g: 8.0,
    fat_g: 30.0,
    category: 'general',
  },
];

// Alias para compatibilidad de nomenclatura
export const DEFAULT_MEAL_TEMPLATES = FREQUENT_MEAL_PRESETS;

export function getFrequentMealPresets(): MealBlockTemplate[] {
  return [...FREQUENT_MEAL_PRESETS];
}

export function getDefaultMealTemplates(): MealBlockTemplate[] {
  return [...FREQUENT_MEAL_PRESETS];
}

// --------------------------------------------------------------------
// 2. CATÁLOGO DE DÍAS TÍPICOS COMPLETOS (PRESETS DE DÍA COMPLETO)
// --------------------------------------------------------------------
export const TYPICAL_DAY_PRESETS: NutritionDayPreset[] = [
  {
    id: 'preset-recomposicion-2400',
    name: 'Día Típico Recomposición Álvaro (2.400 kcal / 202g Prot)',
    description: 'Menú estándar de 4 comidas con ingredientes oficiales de Mercadona/Hacendado',
    meals: [
      {
        meal_type: 'desayuno',
        description: 'Tortilla (1 huevo + 150g claras) + 60g Copos de avena + 250ml Leche desnatada',
        calories: 480,
        protein_g: 42,
        carbs_g: 48,
        fat_g: 12,
      },
      {
        meal_type: 'almuerzo',
        description: '200g Contramuslo pollo cocinado + 80g Arroz basmati en seco + 10g AOVE + 150g Calabacín',
        calories: 760,
        protein_g: 62,
        carbs_g: 65,
        fat_g: 22,
      },
      {
        meal_type: 'merienda',
        description: '250g Queso fresco batido 0% + 30g Proteína Whey Hacendado + 1 Plátano (100g)',
        calories: 410,
        protein_g: 48,
        carbs_g: 35,
        fat_g: 5,
      },
      {
        meal_type: 'cena',
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
        meal_type: 'desayuno',
        description: '80g Avena + 200ml Leche + 1 Plátano + 30g Whey',
        calories: 550,
        protein_g: 42,
        carbs_g: 75,
        fat_g: 8,
      },
      {
        meal_type: 'almuerzo',
        description: '100g Arroz + 200g Pechuga de pollo + 10g AOVE + Verdura',
        calories: 780,
        protein_g: 60,
        carbs_g: 90,
        fat_g: 12,
      },
      {
        meal_type: 'merienda',
        description: '2 Tostadas con mermelada y queso fresco + 200g Yogur + 20g Nueces',
        calories: 460,
        protein_g: 32,
        carbs_g: 48,
        fat_g: 14,
      },
      {
        meal_type: 'cena',
        description: '200g Salmón + 300g Patata cocida + Ensalada',
        calories: 760,
        protein_g: 61,
        carbs_g: 55,
        fat_g: 28,
      },
    ],
  },
];

// --------------------------------------------------------------------
// 3. GENERADOR DEL DÍA TÍPICO CUMPLIDO
// --------------------------------------------------------------------

/**
 * Genera el lote de 4 comidas oficiales del día para la fecha dada,
 * respetando los objetivos de macronutrientes (2.300-2.400 kcal, 202g Proteína)
 * y la rutina prescrita en WEEKLY_ROUTINE.
 */
export function generateTypicalDayMeals(dateStr?: string): NutritionLog[] {
  const targetDate = dateStr || getSpainDate().toISOString().split('T')[0];
  const routine = getTodayRoutine(targetDate);
  const recommended = routine.nutritionStrategy?.recommendedMeals || [];

  // Plantilla canónica de 4 tomas de 2.400 kcal / 202g P
  const defaultItems: Array<{
    meal_type: NutritionLog['meal_type'];
    time: string;
    description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }> = [
    {
      meal_type: 'Desayuno',
      time: '08:30:00',
      description:
        recommended[0]?.dish ||
        '3 huevos revueltos + 2 claras + 70g avena/3 tostadas integrales + plátano y café solo',
      calories: 580,
      protein_g: 38.0,
      carbs_g: 60.0,
      fat_g: 21.0,
    },
    {
      meal_type: 'Almuerzo',
      time: '14:00:00',
      description:
        recommended[1]?.dish ||
        '220g pechuga pollo/pavo con 220g arroz cocido + ensalada con 12g AOVE',
      calories: 670,
      protein_g: 60.0,
      carbs_g: 68.0,
      fat_g: 17.0,
    },
    {
      meal_type: 'Snack',
      time: '17:30:00',
      description:
        recommended[2]?.dish ||
        '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g nueces + 5g creatina',
      calories: 510,
      protein_g: 54.0,
      carbs_g: 40.0,
      fat_g: 15.0,
    },
    {
      meal_type: 'Cena',
      time: '21:15:00',
      description:
        recommended[3]?.dish ||
        '220g salmón o merluza + verduras vapor + 180g patata vapor con AOVE',
      calories: 540,
      protein_g: 50.0,
      carbs_g: 35.0,
      fat_g: 22.0,
    },
  ];

  return defaultItems.map((item, index) => ({
    id: `typical-${targetDate}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    date: targetDate,
    timestamp: `${targetDate}T${item.time}.000Z`,
    meal_type: item.meal_type,
    description: item.description,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
  }));
}

// Alias para compatibilidad de nomenclatura
export const getTypicalDayMeals = generateTypicalDayMeals;

// --------------------------------------------------------------------
// 4. VALIDACIÓN Y MATEMÁTICA DE LOTES DE COMIDA
// --------------------------------------------------------------------

/**
 * Calcula los totales acumulados de un lote de comidas
 */
export function calculateMealTotals(meals: Array<Partial<NutritionLog>>): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const cals = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const prot = meals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
  const carbs = meals.reduce((sum, m) => sum + (Number(m.carbs_g) || 0), 0);
  const fat = meals.reduce((sum, m) => sum + (Number(m.fat_g) || 0), 0);

  return {
    calories: Math.round(cals),
    protein_g: Number(prot.toFixed(1)),
    carbs_g: Number(carbs.toFixed(1)),
    fat_g: Number(fat.toFixed(1)),
  };
}

export const calculateDayPlanTotals = calculateMealTotals;

/**
 * Valida un lote de comidas verificando consistencia bromatológica y ausencia de anomalías.
 */
export function validateMealBatch(meals: Array<Partial<NutritionLog>>): MealBatchValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(meals)) {
    return {
      valid: false,
      errors: ['El payload de comidas debe ser un array válido'],
      totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
  }

  if (meals.length === 0) {
    return {
      valid: false,
      errors: ['El lote no contiene ninguna comida'],
      totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
  }

  meals.forEach((meal, idx) => {
    if (!meal.description || !meal.description.trim()) {
      errors.push(`Comida en índice ${idx}: descripción vacía o no especificada`);
    }

    if (meal.calories === undefined || meal.calories === null || Number(meal.calories) < 0) {
      errors.push(`Comida en índice ${idx}: calorías inválidas (${meal.calories})`);
    }

    if (meal.protein_g === undefined || meal.protein_g === null || Number(meal.protein_g) < 0) {
      errors.push(`Comida en índice ${idx}: proteína inválida (${meal.protein_g})`);
    }

    if (meal.carbs_g === undefined || meal.carbs_g === null || Number(meal.carbs_g) < 0) {
      errors.push(`Comida en índice ${idx}: carbohidratos inválidos (${meal.carbs_g})`);
    }

    if (meal.fat_g === undefined || meal.fat_g === null || Number(meal.fat_g) < 0) {
      errors.push(`Comida en índice ${idx}: grasas inválidas (${meal.fat_g})`);
    }
  });

  const totals = calculateMealTotals(meals);

  return {
    valid: errors.length === 0,
    errors,
    totals,
  };
}

// --------------------------------------------------------------------
// 5. INSERCIÓN DE LOTE CON DEDUPLICACIÓN INTELIGENTE
// --------------------------------------------------------------------

/**
 * Aplica una plantilla de día completo deduplicando automáticamente las comidas
 * que ya hayan sido registradas por el atleta en la fecha indicada.
 * Función pura e inmutable.
 */
export async function applyTypicalDayBatch(
  preset: NutritionDayPreset,
  existingLogsToday: NutritionLog[],
  date: string
): Promise<BatchInsertResult> {
  const existingMealTypes = new Set(
    existingLogsToday
      .filter((log) => log.date === date)
      .map((log) => (log.meal_type || '').toLowerCase().trim())
  );

  const insertedMeals: NutritionLog[] = [];
  const skippedMeals: string[] = [];
  const now = new Date();

  // Clonamos e iteramos sobre las comidas del preset de forma inmutable
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
      meal_type: meal.meal_type as any,
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
