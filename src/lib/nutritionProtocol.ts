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
  queso_fresco_batido: {
    name: 'Queso Fresco Batido 0% Hacendado',
    unit: '100g',
    referenceGrams: 100,
    calories: 46,
    carbs_g: 3.5,
    protein_g: 8.0,
    fat_g: 0.1,
  },
  salmon_fresco: {
    name: 'Salmón Fresco a la Plancha',
    unit: '100g',
    referenceGrams: 100,
    calories: 208,
    carbs_g: 0.0,
    protein_g: 20.4,
    fat_g: 13.4,
  },
  patata_cocida: {
    name: 'Patata Cocida / Asada / Vapor',
    unit: '100g',
    referenceGrams: 100,
    calories: 77,
    carbs_g: 17.5,
    protein_g: 2.0,
    fat_g: 0.1,
    fiber_g: 2.2,
  },
  arroz_cocido: {
    name: 'Arroz Blanco Cocido',
    unit: '100g',
    referenceGrams: 100,
    calories: 130,
    carbs_g: 28.2,
    protein_g: 2.7,
    fat_g: 0.3,
  },
  frutos_secos: {
    name: 'Nueces o Almendras Tostadas sin Sal',
    unit: '100g',
    referenceGrams: 100,
    calories: 610,
    carbs_g: 14.0,
    protein_g: 21.0,
    fat_g: 54.0,
  },
  verduras_vapor: {
    name: 'Verduras al Vapor (Brócoli, Judías, Zanahoria)',
    unit: '100g',
    referenceGrams: 100,
    calories: 35,
    carbs_g: 5.5,
    protein_g: 2.5,
    fat_g: 0.2,
    fiber_g: 3.0,
  },
};

// Protocolo activo en memoria (Plan Oficial 2.400 kcal - Recomposición y Media Maratón)
export const activeProtocol: UserProtocol = {
  athleteName: 'Álvaro',
  weightKg: 101.0,
  goal: 'Transición a Media Maratón 21.097 km (28 Feb) + Recomposición (85-88 kg)',
  strategy: 'Déficit seguro (~500–600 kcal) con NEAT alto (>10k pasos). 2.400 kcal y 202 g proteína.',
  currentDayType: 'running',
  targets: {
    calories: 2400,
    proteinMin: 195,
    proteinMax: 205, // 2 g/kg = ~202 g
    carbsMin: 220,
    carbsMax: 240, // ~230 g
    fatMin: 70,
    fatMax: 80, // ~75 g
    waterMl: 3800, // 3.5 - 4.0 L
    creatineGrams: 5,
    creatineTakenToday: false,
  },
  frequentFoods: initialFrequentFoods,
  scheduleTiming: [
    {
      slot: 'Desayuno',
      time: '08:00 – 08:30',
      description:
        'Proteína y Energía (~580 kcal | 38g P, 60g HC, 21g G): 3 huevos revueltos + 2 claras, 70g avena/3 tostadas integrales, 1 plátano + café solo.',
    },
    {
      slot: 'Almuerzo',
      time: '13:30 – 14:15',
      description:
        'Comida Principal (~670 kcal | 60g P, 68g HC, 17g G): 220g pechuga pollo/pavo/ternera magra, 220g arroz cocido o 280g patata/boniato, ensalada grande + 12g AOVE.',
    },
    {
      slot: 'Merienda',
      time: '17:30 – 18:00',
      description:
        'Pre/Post Entreno (~510 kcal | 54g P, 40g HC, 15g G): 300g queso fresco batido 0%, 1 manzana grande + 30g whey + 20g nueces/almendras + 5g creatina.',
    },
    {
      slot: 'Cena',
      time: '21:00 – 21:45',
      description:
        'Reparación Nocturna (~540 kcal | 50g P, 35g HC, 22g G): 220g salmón/merluza/atún fresco, plato grande verduras vapor (brócoli, judías, zanahoria), 180g patata vapor + 10g AOVE.',
    },
  ],
};

/**
 * Obtener targets adaptados al tipo de día
 */
export function getTargetsForDay(dayType: DayType, weightKg = activeProtocol.weightKg): NutritionTargets {
  let calories = 2400;
  let carbsMin = 220;
  let carbsMax = 240;

  if (dayType === 'strength') {
    // Días de fuerza / torso / pierna: 2.400 kcal
    calories = 2400;
    carbsMin = 225;
    carbsMax = 245;
  } else if (dayType === 'running') {
    // Días de carrera: hidratos limpios y buena hidratación
    calories = 2400;
    carbsMin = 230;
    carbsMax = 250;
  } else if (dayType === 'rest_refeed') {
    // Descanso / Regeneración: 2.400 kcal con carbohidratos estables para reparar tendones
    calories = 2400;
    carbsMin = 210;
    carbsMax = 230;
  }

  // Ratio de proteína científico: 2 g/kg de peso corporal (blindaje muscular y tendones)
  const proteinTarget = Math.round(weightKg * 2.0);
  const proteinMin = proteinTarget - 7;
  const proteinMax = proteinTarget + 7;

  return {
    calories,
    proteinMin,
    proteinMax,
    carbsMin,
    carbsMax,
    fatMin: 70,
    fatMax: 80,
    waterMl: 3800,
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
