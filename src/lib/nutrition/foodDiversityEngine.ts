/**
 * Motor de Auditoría Bromatológica Semanal y Diversidad Nutricional
 * Analiza la variedad de grupos de alimentos, detecta sobreconsumos o monotonías,
 * evalúa carencias de micronutrientes y sugiere alternativas de rotación saludables de Mercadona.
 */

import { NutritionLog } from '../../types/database';

export enum BromatologicalGroup {
  POULTRY_WHITE_MEAT = 'POULTRY_WHITE_MEAT',
  RED_PROCESSED_MEAT = 'RED_PROCESSED_MEAT',
  FATTY_FISH = 'FATTY_FISH',
  WHITE_FISH_SEAFOOD = 'WHITE_FISH_SEAFOOD',
  EGGS = 'EGGS',
  DAIRY = 'DAIRY',
  LEGUMES = 'LEGUMES',
  VEGETABLES_GREENS = 'VEGETABLES_GREENS',
  FRUITS = 'FRUITS',
  GRAINS_TUBERS = 'GRAINS_TUBERS',
  HEALTHY_FATS = 'HEALTHY_FATS'
}

export interface GroupBreakdown {
  name: string;
  count: number;
  detected: boolean;
  examples: string[];
}

export interface DiversityAlert {
  id: string;
  food: string;
  count: number;
  threshold: number;
  message: string;
  severity: 'warning' | 'critical';
}

export interface DeficiencyAlert {
  id: string;
  group: BromatologicalGroup;
  groupName: string;
  message: string;
  recommendedFood: string;
  severity: 'warning' | 'info';
}

export interface RotationSuggestion {
  originalFood: string;
  alternativeFood: string;
  benefit: string;
  mercadonaProduct: string;
}

export interface FoodDiversityReport {
  totalFoodsLogged: number;
  uniquePlantCount: number;
  plantPoints: string[];
  plantScoreTarget: number;
  plantScorePercentage: number;
  diversityScore: number;
  diversityLevel: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
  groupsBreakdown: Record<BromatologicalGroup, GroupBreakdown>;
  abuseWarnings: DiversityAlert[];
  deficiencyAlerts: DeficiencyAlert[];
  rotationSuggestions: RotationSuggestion[];
}

// Diccionario bromatológico de mapeo semántico
interface FoodRule {
  term: string;
  group: BromatologicalGroup;
  isPlant?: boolean;
  cleanName: string;
}

const FOOD_DICTIONARY: FoodRule[] = [
  // Carnes blancas
  { term: 'pollo', group: BromatologicalGroup.POULTRY_WHITE_MEAT, cleanName: 'Pechuga de pollo' },
  { term: 'pechuga', group: BromatologicalGroup.POULTRY_WHITE_MEAT, cleanName: 'Pechuga de pollo' },
  { term: 'pavo', group: BromatologicalGroup.POULTRY_WHITE_MEAT, cleanName: 'Pechuga de pavo' },
  { term: 'conejo', group: BromatologicalGroup.POULTRY_WHITE_MEAT, cleanName: 'Conejo' },

  // Carnes rojas y procesadas
  { term: 'ternera', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Ternera magra' },
  { term: 'buey', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Carne de buey' },
  { term: 'cerdo', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Lomo de cerdo' },
  { term: 'jamón', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Jamón serrano' },
  { term: 'serrano', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Jamón serrano' },
  { term: 'lomo', group: BromatologicalGroup.RED_PROCESSED_MEAT, cleanName: 'Lomo embuchado' },

  // Pescado azul (Omega-3)
  { term: 'salmón', group: BromatologicalGroup.FATTY_FISH, cleanName: 'Salmón fresco' },
  { term: 'atún', group: BromatologicalGroup.FATTY_FISH, cleanName: 'Atún al natural' },
  { term: 'bonito', group: BromatologicalGroup.FATTY_FISH, cleanName: 'Bonito del norte' },
  { term: 'sardina', group: BromatologicalGroup.FATTY_FISH, cleanName: 'Sardinas' },
  { term: 'caballa', group: BromatologicalGroup.FATTY_FISH, cleanName: 'Caballa' },

  // Pescado blanco y mariscos
  { term: 'merluza', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Merluza' },
  { term: 'bacalao', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Bacalao' },
  { term: 'gambas', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Gambas' },
  { term: 'langostino', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Langostinos' },
  { term: 'sepia', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Sepia limpia' },
  { term: 'calamar', group: BromatologicalGroup.WHITE_FISH_SEAFOOD, cleanName: 'Calamar' },

  // Huevos
  { term: 'huevo', group: BromatologicalGroup.EGGS, cleanName: 'Huevo entero' },
  { term: 'claras', group: BromatologicalGroup.EGGS, cleanName: 'Claras de huevo' },
  { term: 'tortilla', group: BromatologicalGroup.EGGS, cleanName: 'Tortilla de claras' },

  // Lácteos
  { term: 'leche', group: BromatologicalGroup.DAIRY, cleanName: 'Leche desnatada' },
  { term: 'queso', group: BromatologicalGroup.DAIRY, cleanName: 'Queso' },
  { term: 'mozzarella', group: BromatologicalGroup.DAIRY, cleanName: 'Queso mozzarella' },
  { term: 'batido', group: BromatologicalGroup.DAIRY, cleanName: 'Queso fresco batido 0%' },
  { term: 'yogur', group: BromatologicalGroup.DAIRY, cleanName: 'Yogur natural' },
  { term: 'kéfir', group: BromatologicalGroup.DAIRY, cleanName: 'Kéfir natural' },
  { term: 'whey', group: BromatologicalGroup.DAIRY, cleanName: 'Proteína Whey' },

  // Legumbres (Plant points)
  { term: 'garbanzo', group: BromatologicalGroup.LEGUMES, isPlant: true, cleanName: 'garbanzos' },
  { term: 'lenteja', group: BromatologicalGroup.LEGUMES, isPlant: true, cleanName: 'lentejas' },
  { term: 'alubia', group: BromatologicalGroup.LEGUMES, isPlant: true, cleanName: 'alubias' },
  { term: 'soja', group: BromatologicalGroup.LEGUMES, isPlant: true, cleanName: 'soja' },
  { term: 'edamame', group: BromatologicalGroup.LEGUMES, isPlant: true, cleanName: 'edamame' },

  // Verduras y hortalizas (Plant points)
  { term: 'espinaca', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'espinacas' },
  { term: 'brócoli', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'brócoli' },
  { term: 'calabacín', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'calabacín' },
  { term: 'tomate', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'tomate' },
  { term: 'lechuga', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'lechuga' },
  { term: 'judía', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'judías verdes' },
  { term: 'zanahoria', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'zanahoria' },
  { term: 'pimiento', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'pimiento' },
  { term: 'champiñ', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'champiñones' },
  { term: 'verdura', group: BromatologicalGroup.VEGETABLES_GREENS, isPlant: true, cleanName: 'verduras variadas' },

  // Frutas (Plant points)
  { term: 'plátano', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'plátano' },
  { term: 'platano', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'plátano' },
  { term: 'higo', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'higos' },
  { term: 'kiwi', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'kiwi' },
  { term: 'manzana', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'manzana' },
  { term: 'fresa', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'fresas' },
  { term: 'arándano', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'arándanos' },
  { term: 'arandano', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'arándanos' },
  { term: 'naranja', group: BromatologicalGroup.FRUITS, isPlant: true, cleanName: 'naranja' },

  // Cereales y tubérculos (Plant points)
  { term: 'arroz', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'arroz' },
  { term: 'avena', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'avena' },
  { term: 'pan', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'pan integral' },
  { term: 'patata', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'patata' },
  { term: 'boniato', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'boniato' },
  { term: 'quinoa', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'quinoa' },
  { term: 'pasta', group: BromatologicalGroup.GRAINS_TUBERS, isPlant: true, cleanName: 'pasta' },

  // Grasas saludables, semillas y frutos secos (Plant points)
  { term: 'aceite', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'aceite de oliva virgen extra' },
  { term: 'aove', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'aceite de oliva virgen extra' },
  { term: 'nuez', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'nueces' },
  { term: 'nueces', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'nueces' },
  { term: 'pistacho', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'pistachos' },
  { term: 'almendra', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'almendras' },
  { term: 'aguacate', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'aguacate' },
  { term: 'chía', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'semillas de chía' },
  { term: 'chia', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'semillas de chía' },
  { term: 'canela', group: BromatologicalGroup.HEALTHY_FATS, isPlant: true, cleanName: 'canela' }
];

const GROUP_TITLES: Record<BromatologicalGroup, string> = {
  [BromatologicalGroup.POULTRY_WHITE_MEAT]: 'Carnes Blancas (Pollo/Pavo)',
  [BromatologicalGroup.RED_PROCESSED_MEAT]: 'Carnes Rojas / Embutidos',
  [BromatologicalGroup.FATTY_FISH]: 'Pescado Azul (Omega-3)',
  [BromatologicalGroup.WHITE_FISH_SEAFOOD]: 'Pescado Blanco / Mariscos',
  [BromatologicalGroup.EGGS]: 'Huevos y Claras',
  [BromatologicalGroup.DAIRY]: 'Lácteos y Derivados',
  [BromatologicalGroup.LEGUMES]: 'Legumbres y Proteína Vegetal',
  [BromatologicalGroup.VEGETABLES_GREENS]: 'Verduras y Hortalizas',
  [BromatologicalGroup.FRUITS]: 'Frutas Frescas y Deshidratadas',
  [BromatologicalGroup.GRAINS_TUBERS]: 'Cereales y Tubérculos',
  [BromatologicalGroup.HEALTHY_FATS]: 'Grasas Saludables y Frutos Secos'
};

/**
 * Analiza un conjunto de registros de nutrición (normalmente de los últimos 7 días)
 * y genera una auditoría completa de diversidad bromatológica.
 */
export function analyzeWeeklyFoodDiversity(logs: NutritionLog[]): FoodDiversityReport {
  // Inicializar acumuladores por grupo
  const groupsBreakdown: Record<BromatologicalGroup, GroupBreakdown> = {
    [BromatologicalGroup.POULTRY_WHITE_MEAT]: { name: GROUP_TITLES[BromatologicalGroup.POULTRY_WHITE_MEAT], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.RED_PROCESSED_MEAT]: { name: GROUP_TITLES[BromatologicalGroup.RED_PROCESSED_MEAT], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.FATTY_FISH]: { name: GROUP_TITLES[BromatologicalGroup.FATTY_FISH], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.WHITE_FISH_SEAFOOD]: { name: GROUP_TITLES[BromatologicalGroup.WHITE_FISH_SEAFOOD], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.EGGS]: { name: GROUP_TITLES[BromatologicalGroup.EGGS], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.DAIRY]: { name: GROUP_TITLES[BromatologicalGroup.DAIRY], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.LEGUMES]: { name: GROUP_TITLES[BromatologicalGroup.LEGUMES], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.VEGETABLES_GREENS]: { name: GROUP_TITLES[BromatologicalGroup.VEGETABLES_GREENS], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.FRUITS]: { name: GROUP_TITLES[BromatologicalGroup.FRUITS], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.GRAINS_TUBERS]: { name: GROUP_TITLES[BromatologicalGroup.GRAINS_TUBERS], count: 0, detected: false, examples: [] },
    [BromatologicalGroup.HEALTHY_FATS]: { name: GROUP_TITLES[BromatologicalGroup.HEALTHY_FATS], count: 0, detected: false, examples: [] }
  };

  const detectedPlants = new Set<string>();
  const specificFoodCounts: Record<string, number> = {};
  let totalFoodsLogged = 0;

  for (const log of logs) {
    if (!log.description) continue;
    const descLower = log.description.toLowerCase();
    totalFoodsLogged++;

    const matchedInLog = new Set<string>();

    for (const rule of FOOD_DICTIONARY) {
      if (descLower.includes(rule.term)) {
        if (!matchedInLog.has(rule.cleanName)) {
          matchedInLog.add(rule.cleanName);
          specificFoodCounts[rule.cleanName] = (specificFoodCounts[rule.cleanName] || 0) + 1;

          const groupEntry = groupsBreakdown[rule.group];
          groupEntry.count += 1;
          groupEntry.detected = true;
          if (!groupEntry.examples.includes(rule.cleanName) && groupEntry.examples.length < 3) {
            groupEntry.examples.push(rule.cleanName);
          }

          if (rule.isPlant) {
            detectedPlants.add(rule.cleanName);
          }
        }
      }
    }
  }

  // Detección de abusos / monotonías
  const abuseWarnings: DiversityAlert[] = [];
  for (const [food, count] of Object.entries(specificFoodCounts)) {
    if (count >= 5) {
      abuseWarnings.push({
        id: `abuse-${food.replace(/\s+/g, '-').toLowerCase()}`,
        food,
        count,
        threshold: 5,
        message: `${food} consumido ${count} veces esta semana. Considera rotar con pescado blanco o legumbres para diversificar micronutrientes y aminoácidos.`,
        severity: count >= 7 ? 'critical' : 'warning'
      });
    }
  }

  // Detección de carencias nutricionales
  const deficiencyAlerts: DeficiencyAlert[] = [];

  if (!groupsBreakdown[BromatologicalGroup.FATTY_FISH].detected) {
    deficiencyAlerts.push({
      id: 'def-fatty-fish',
      group: BromatologicalGroup.FATTY_FISH,
      groupName: GROUP_TITLES[BromatologicalGroup.FATTY_FISH],
      message: '0 tomas de pescado azul / Omega-3 detectadas. Esencial para la modulación inflamatoria de la rodilla.',
      recommendedFood: 'Lomos de salmón fresco o latas de atún claro al natural Hacendado',
      severity: 'warning'
    });
  }

  if (!groupsBreakdown[BromatologicalGroup.LEGUMES].detected) {
    deficiencyAlerts.push({
      id: 'def-legumes',
      group: BromatologicalGroup.LEGUMES,
      groupName: GROUP_TITLES[BromatologicalGroup.LEGUMES],
      message: '0 tomas de legumbres esta semana. Incorpora legumbres cocidas para elevar la saciedad y fibra prebiótica.',
      recommendedFood: 'Bote de garbanzos o lentejas cocidas Hacendado',
      severity: 'info'
    });
  }

  if (groupsBreakdown[BromatologicalGroup.VEGETABLES_GREENS].count < 4) {
    deficiencyAlerts.push({
      id: 'def-greens',
      group: BromatologicalGroup.VEGETABLES_GREENS,
      groupName: GROUP_TITLES[BromatologicalGroup.VEGETABLES_GREENS],
      message: `Bajo consumo de verduras y hojas verdes (${groupsBreakdown[BromatologicalGroup.VEGETABLES_GREENS].count} tomas). Prioriza espinacas o brócoli.`,
      recommendedFood: 'Bolsa de espinacas lavadas o ramilletes de brócoli al vapor',
      severity: 'warning'
    });
  }

  if (groupsBreakdown[BromatologicalGroup.FRUITS].count < 3) {
    deficiencyAlerts.push({
      id: 'def-fruits',
      group: BromatologicalGroup.FRUITS,
      groupName: GROUP_TITLES[BromatologicalGroup.FRUITS],
      message: `Bajo consumo de frutas frescas (${groupsBreakdown[BromatologicalGroup.FRUITS].count} tomas). Incorpora kiwi o frutos rojos para optimizar polifenoles.`,
      recommendedFood: 'Kiwis maduros, plátano o tarrina de arándanos frescos',
      severity: 'info'
    });
  }

  // Sugerencias de rotación inteligente
  const rotationSuggestions: RotationSuggestion[] = [];

  if (specificFoodCounts['Pechuga de pollo'] && specificFoodCounts['Pechuga de pollo'] >= 4) {
    rotationSuggestions.push({
      originalFood: 'Pechuga de pollo',
      alternativeFood: 'Lomos de salmón fresco o merluza ultracongelada',
      benefit: 'Aporta ácidos grasos EPA/DHA antiinflamatorios y yodo sin elevar carbohidratos.',
      mercadonaProduct: 'Filetes de merluza sin piel Hacendado o Salmón noruego'
    });
    rotationSuggestions.push({
      originalFood: 'Pechuga de pollo',
      alternativeFood: 'Garbanzos cocidos con espinacas y pimentón',
      benefit: 'Suma 12g de fibra y magnesio, reduciendo la fatiga digestiva.',
      mercadonaProduct: 'Tarro de garbanzos cocidos 400g Hacendado'
    });
  }

  if (rotationSuggestions.length < 2) {
    rotationSuggestions.push({
      originalFood: 'Arroz blanco',
      alternativeFood: 'Boniato asado o Quinoa cocida',
      benefit: 'Menor índice glucémico y mayor carga de betacarotenos y potasio.',
      mercadonaProduct: 'Boniato rojo o Vasitos de quinoa Hacendado'
    });
    rotationSuggestions.push({
      originalFood: 'Queso mozzarella',
      alternativeFood: 'Queso fresco batido 0% con canela y nueces',
      benefit: 'Mayor contenido de caseína de lenta digestión y menor grasa saturada.',
      mercadonaProduct: 'Tarrina de queso fresco batido desnatado 500g'
    });
  }

  // Cálculo de Puntuación de Diversidad Global (0 - 100)
  const totalGroups = Object.keys(groupsBreakdown).length;
  const groupsCovered = Object.values(groupsBreakdown).filter(g => g.detected).length;
  const groupScore = (groupsCovered / totalGroups) * 60; // Hasta 60 puntos

  const uniquePlantCount = detectedPlants.size;
  const plantScoreTarget = 30; // Recomendación de microbiota de The American Gut Project (30 plantas distintas)
  const plantPoints = Array.from(detectedPlants);
  const plantScore = Math.min(25, (uniquePlantCount / 10) * 25); // Hasta 25 puntos por variedad vegetal

  // Penalización por sobreconsumo/monotonía
  const abusePenalty = abuseWarnings.length * 8; // -8 por cada alimento abusado

  let rawScore = Math.round(groupScore + plantScore + (totalFoodsLogged > 0 ? 15 : 0) - abusePenalty);
  if (totalFoodsLogged === 0) rawScore = 0;
  const diversityScore = Math.max(0, Math.min(100, rawScore));

  let diversityLevel: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' = 'POOR';
  if (diversityScore >= 80) diversityLevel = 'EXCELLENT';
  else if (diversityScore >= 60) diversityLevel = 'GOOD';
  else if (diversityScore >= 40) diversityLevel = 'MODERATE';

  return {
    totalFoodsLogged,
    uniquePlantCount,
    plantPoints,
    plantScoreTarget,
    plantScorePercentage: Math.min(100, Math.round((uniquePlantCount / plantScoreTarget) * 100)),
    diversityScore,
    diversityLevel,
    groupsBreakdown,
    abuseWarnings,
    deficiencyAlerts,
    rotationSuggestions
  };
}
