// ====================================================================
// PROTOCOLO NUTRICIONAL Y ATLETA: ÁLVARO (101.5 KG)
// Recomposición corporal + Preparación Maratón (Fuerza + Running)
// Idioma: Español (PSR-12 / TypeScript estricto)
// ====================================================================

export interface FrequentFood {
  name: string;
  unit: string;
  referenceGrams: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g?: number;
}

export type DayType = 'strength' | 'running' | 'rest_refeed';

export interface NutritionTargets {
  calories: number;
  proteinMin: number;
  proteinMax: number;
  carbsMin: number;
  carbsMax: number;
  fatMin: number;
  fatMax: number;
  waterMl: number;
  creatineGrams: number;
  creatineTakenToday: boolean;
}

export interface UserProtocol {
  athleteName: string;
  weightKg: number;
  goal: string;
  strategy: string;
  currentDayType: DayType;
  targets: NutritionTargets;
  frequentFoods: Record<string, FrequentFood>;
  scheduleTiming: {
    slot: string;
    time: string;
    description: string;
  }[];
}

// Alimentos habituales de referencia (con valores exactos por 100g / 100ml)
export const initialFrequentFoods: Record<string, FrequentFood> = {
  pan_integral: {
    name: 'Pan 100% Integral Hacendado',
    unit: '100g',
    referenceGrams: 100,
    calories: 249,
    carbs_g: 36.0,
    protein_g: 11.3,
    fat_g: 4.8,
    fiber_g: 8.3,
  },
  avena: {
    name: 'Copos de Avena Extrasuaves',
    unit: '100g',
    referenceGrams: 100,
    calories: 375,
    carbs_g: 59.0,
    protein_g: 13.5,
    fat_g: 7.0,
  },
  leche_desnatada: {
    name: 'Leche Desnatada Hacendado',
    unit: '100ml',
    referenceGrams: 100,
    calories: 34,
    carbs_g: 4.9,
    protein_g: 3.2,
    fat_g: 0.1,
  },
  yogur_griego_ligero: {
    name: 'Yogur Griego Ligero Natural',
    unit: '100g',
    referenceGrams: 100,
    calories: 60,
    carbs_g: 4.7,
    protein_g: 5.8,
    fat_g: 2.0,
  },
  jamon_serrano: {
    name: 'Taquitos de Jamón Serrano',
    unit: '100g',
    referenceGrams: 100,
    calories: 234.2,
    carbs_g: 1.0,
    protein_g: 33.7,
    fat_g: 10.6,
  },
  pavo_lonchas: {
    name: 'Pechuga de Pavo Lonchas (17.8% pro)',
    unit: '100g',
    referenceGrams: 100,
    calories: 78,
    carbs_g: 0.6,
    protein_g: 17.8,
    fat_g: 0.5,
  },
  impact_whey: {
    name: 'Impact Whey Protein (Myprotein)',
    unit: '100g',
    referenceGrams: 100,
    calories: 340,
    carbs_g: 3.3,
    protein_g: 66.7,
    fat_g: 6.5,
  },
  huevo_cocido: {
    name: 'Huevo Cocido Entero (1 ud ~58g)',
    unit: 'unidad',
    referenceGrams: 58,
    calories: 78,
    carbs_g: 0.6,
    protein_g: 6.5,
    fat_g: 5.5,
  },
  lomo_cerdo: {
    name: 'Lomo de Cerdo Cocinado',
    unit: '100g',
    referenceGrams: 100,
    calories: 210,
    carbs_g: 0.0,
    protein_g: 31.0,
    fat_g: 8.5,
  },
  noodles_huevo: {
    name: 'Noodles de Huevo (Cocinado)',
    unit: '100g',
    referenceGrams: 100,
    calories: 153,
    carbs_g: 29.0,
    protein_g: 5.4,
    fat_g: 1.3,
  },
  mollejas_pollo: {
    name: 'Mollejas de Pollo Guisadas',
    unit: '100g',
    referenceGrams: 100,
    calories: 143.3,
    carbs_g: 1.3,
    protein_g: 17.3,
    fat_g: 7.3,
  },
};

// Protocolo activo en memoria
export const activeProtocol: UserProtocol = {
  athleteName: 'Álvaro',
  weightKg: 101.5,
  goal: 'Recomposición corporal + preparación Maratón (fuerza + running)',
  strategy: 'Déficit moderado (~300–500 kcal) con periodización según exigencia del entreno',
  currentDayType: 'running',
  targets: {
    calories: 2350,
    proteinMin: 160,
    proteinMax: 190,
    carbsMin: 200,
    carbsMax: 280,
    fatMin: 60,
    fatMax: 75,
    waterMl: 3000,
    creatineGrams: 5,
    creatineTakenToday: false,
  },
  frequentFoods: initialFrequentFoods,
  scheduleTiming: [
    { slot: 'Desayuno', time: '08:30 – 09:15', description: 'Base proteica alta + grasas saludables + hidratos moderados (pan 100% integral, jamón, pavo, leche, café)' },
    { slot: 'Media Mañana', time: '11:30 – 12:00', description: 'Opcional (teletrabajo): fruta, huevo cocido o frutos secos según apetito y grasas restantes' },
    { slot: 'Comida', time: '14:00 – 14:45', description: 'Carga principal de hidratos complejos + proteína magra + verdura (>5h antes de entrenar)' },
    { slot: 'Merienda Pre-Entreno', time: '18:15 – 18:45', description: 'Bol avena + yogur griego ligero + whey + fruta + 5g creatina (~75-90 min antes del entreno)' },
    { slot: 'Café Pre-Entreno', time: '19:15 – 19:30', description: 'Café solo con agua (sin calorías), 30-45 min antes del entreno' },
    { slot: 'Entrenamiento', time: '20:00 – 21:30', description: 'Fuerza / Pierna o Running / Series' },
    { slot: 'Cena Post-Entreno', time: '22:00 – 22:30', description: 'Proteína magra alta + verduras + hidratos ajustados según desgaste' },
  ],
};

/**
 * Obtener targets adaptados al tipo de día
 */
export function getTargetsForDay(dayType: DayType, weightKg = activeProtocol.weightKg): NutritionTargets {
  let calories = 2350;
  let carbsMin = 220;
  let carbsMax = 270;

  if (dayType === 'strength') {
    // Días de pierna / fuerza: recarga glucógeno y recuperación
    calories = 2380;
    carbsMin = 250;
    carbsMax = 280;
  } else if (dayType === 'running') {
    // Días de carrera: hidratos limpios y digestión rápida pre-carrera
    calories = 2400;
    carbsMin = 260;
    carbsMax = 290;
  } else if (dayType === 'rest_refeed') {
    // Descanso / Refeed a mantenimiento
    calories = 2500;
    carbsMin = 200;
    carbsMax = 240;
  }

  // Ratio de proteína: 1.65 a 1.85 g/kg de peso corporal
  const proteinMin = Math.round(weightKg * 1.65);
  const proteinMax = Math.round(weightKg * 1.85);

  return {
    calories,
    proteinMin,
    proteinMax,
    carbsMin,
    carbsMax,
    fatMin: 60,
    fatMax: 75,
    waterMl: 3000,
    creatineGrams: 5,
    creatineTakenToday: activeProtocol.targets.creatineTakenToday,
  };
}

/**
 * Actualizar peso corporal y recalcular rangos
 */
export function updateWeight(newWeightKg: number) {
  activeProtocol.weightKg = newWeightKg;
  activeProtocol.targets = getTargetsForDay(activeProtocol.currentDayType, newWeightKg);
  return activeProtocol;
}

/**
 * Cambiar tipo de día
 */
export function setDayType(dayType: DayType) {
  activeProtocol.currentDayType = dayType;
  activeProtocol.targets = getTargetsForDay(dayType, activeProtocol.weightKg);
  return activeProtocol;
}

/**
 * Marcar o alternar creatina
 */
export function toggleCreatine(taken?: boolean) {
  activeProtocol.targets.creatineTakenToday =
    taken !== undefined ? taken : !activeProtocol.targets.creatineTakenToday;
  return activeProtocol.targets.creatineTakenToday;
}
