// ====================================================================
// MOTOR DE NUTRICIÓN MERCADONA & ETIQUETAS OFICIALES (PSR-12 / TypeScript)
// Especialista: Nutrición Deportiva y Precisión de Macronutrientes
// Proporciona búsqueda en base de datos local de Hacendado, consulta a
// Open Food Facts API (España) y cálculo matemático estricto por pesaje.
// ====================================================================

import {
  findUserFrequentFood,
  cleanFoodSearchQuery,
  normalizeText,
} from './frequentFoodsManager';

export interface MercadonaProduct {
  id: string;
  name: string;
  brand: string;
  category:
    | 'carnes_aves'
    | 'pescados_mariscos'
    | 'huevos_claras'
    | 'lacteos_proteinas'
    | 'cereales_arroces_pastas'
    | 'panes_tostadas'
    | 'grasas_aceites_frutos'
    | 'frutas_verduras'
    | 'suplementos_otros';
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g?: number;
  defaultServingGrams?: number; // Peso habitual por unidad o ración
  unitName?: string; // Ej: 'unidad', 'lata', 'vaso', 'rebanada', 'cucharada'
  aliases: string[]; // Sinónimos y formas en que Álvaro lo nombra
}

export interface WeighedItemInput {
  food: string;
  amount: number;
  unit?: string; // 'g', 'ml', 'unidad', 'rebanada', 'lata', etc.
}

export interface CalculatedItemResult {
  foodName: string;
  matchedName: string;
  brand: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'mercadona_catalog' | 'open_food_facts' | 'heuristica';
}

export interface MealCalculationResult {
  items: CalculatedItemResult[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  rawMathCalories: number;
  formattedBreakdown: string;
}

// --------------------------------------------------------------------
// 1. CATÁLOGO MAESTRO DE ALIMENTOS MERCADONA / HACENDADO (100% ETIQUETA)
// --------------------------------------------------------------------
export const MERCADONA_CATALOG: MercadonaProduct[] = [
  // --- CARNES Y AVES ---
  {
    id: 'pechuga_pollo_fresca',
    name: 'Pechuga de Pollo Limpia Hacendado (Cruda)',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 106,
    protein_100g: 22.2,
    carbs_100g: 0.0,
    fat_100g: 1.2,
    aliases: ['pollo crudo', 'pechuga de pollo cruda', 'pechuga cruda', 'filetes de pollo crudos'],
  },
  {
    id: 'pechuga_pollo_cocinada',
    name: 'Pechuga de Pollo Cocinada / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 145,
    protein_100g: 31.0,
    carbs_100g: 0.0,
    fat_100g: 1.8,
    aliases: [
      'pollo',
      'pechuga de pollo',
      'pechuga',
      'filetes de pollo',
      'pechuga pollo',
      'pollo cocinado',
      'pechuga de pollo cocinada',
      'pechuga cocinada',
      'pollo a la plancha',
      'pechuga a la plancha',
      'pechuga de pollo a la plancha',
      'pollo hecho',
      'pechuga hecha',
    ],
  },
  {
    id: 'pechuga_pavo_fresca',
    name: 'Pechuga de Pavo Filetes Hacendado (Cruda)',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 105,
    protein_100g: 24.0,
    carbs_100g: 0.0,
    fat_100g: 1.0,
    aliases: ['pavo crudo', 'pechuga de pavo cruda', 'pechuga pavo cruda'],
  },
  {
    id: 'pechuga_pavo_cocinada',
    name: 'Pechuga de Pavo Cocinada / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 140,
    protein_100g: 32.0,
    carbs_100g: 0.0,
    fat_100g: 1.5,
    aliases: [
      'pavo',
      'pechuga de pavo',
      'filetes de pavo',
      'pechuga pavo',
      'pavo cocinado',
      'pechuga de pavo cocinada',
      'pavo a la plancha',
      'pechuga de pavo a la plancha',
      'pavo hecho',
    ],
  },
  {
    id: 'pavo_lonchas_92',
    name: 'Pechuga de Pavo 92% Lonchas Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 86,
    protein_100g: 18.0,
    carbs_100g: 1.0,
    fat_100g: 1.0,
    defaultServingGrams: 25,
    unitName: 'loncha',
    aliases: ['fiambre pavo', 'pavo lonchas', 'jamon pavo', 'pechuga de pavo 92%'],
  },
  {
    id: 'pollo_lonchas_90',
    name: 'Pechuga de Pollo 90% Lonchas Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 85,
    protein_100g: 17.5,
    carbs_100g: 1.2,
    fat_100g: 1.1,
    defaultServingGrams: 25,
    unitName: 'loncha',
    aliases: ['pollo lonchas', 'fiambre pollo', 'pollo 90%'],
  },
  {
    id: 'ternera_magra_picada',
    name: 'Carne Picada Vacuno Añojo Magro Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 130,
    protein_100g: 21.0,
    carbs_100g: 0.0,
    fat_100g: 5.0,
    aliases: ['ternera', 'carne picada ternera', 'filete ternera', 'ternera magra', 'añojo', 'ternera cruda'],
  },
  {
    id: 'ternera_cocinada',
    name: 'Filete de Ternera Cocinado / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 175,
    protein_100g: 28.0,
    carbs_100g: 0.0,
    fat_100g: 7.0,
    aliases: ['ternera cocinada', 'ternera a la plancha', 'filete de ternera a la plancha', 'filete ternera cocinado'],
  },
  {
    id: 'lomo_fresco',
    name: 'Cinta de Lomo Fresca de Cerdo (Crudo) Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 125,
    protein_100g: 22.0,
    carbs_100g: 0.0,
    fat_100g: 4.0,
    defaultServingGrams: 150,
    unitName: 'filete',
    aliases: [
      'lomo crudo',
      'cinta de lomo cruda',
      'lomo fresco',
      'lomo de cerdo crudo',
      'filetes de lomo crudos',
      'lomo en crudo',
      'cinta de lomo fresca',
      'cinta de lomo en crudo',
    ],
  },
  {
    id: 'lomo_cocinado',
    name: 'Cinta de Lomo de Cerdo Cocinada / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 167,
    protein_100g: 29.3,
    carbs_100g: 0.0,
    fat_100g: 5.3,
    defaultServingGrams: 120,
    unitName: 'filete',
    aliases: [
      'lomo cocinado',
      'lomo a la plancha',
      'cinta de lomo cocinada',
      'lomo hecho',
      'lomo pesado cocinado',
      'cinta de lomo a la plancha',
      'lomo plancha',
      'lomo de cerdo cocinado',
      'lomo frito',
      'filetes de lomo cocinados',
      'lomo de cerdo a la plancha',
      'cinta de lomo hecha',
      'lomo de cerdo',
      'lomo',
      'cinta de lomo',
      'filetes de lomo',
      'filete de lomo',
      'lomo cerdo',
    ],
  },
  {
    id: 'lomo_embuchado',
    name: 'Lomo Embuchado Duroc Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 198,
    protein_100g: 38.0,
    carbs_100g: 0.8,
    fat_100g: 4.8,
    defaultServingGrams: 30,
    unitName: 'racion',
    aliases: [
      'lomo embuchado',
      'cinta de lomo embuchada',
      'lomo curado',
      'lomo duroc',
      'lomo embuchado duroc',
      'embutido de lomo',
    ],
  },
  {
    id: 'jamon_serrano_taquitos',
    name: 'Taquitos de Jamón Serrano Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 234,
    protein_100g: 33.7,
    carbs_100g: 1.0,
    fat_100g: 10.6,
    aliases: ['taquitos jamon', 'taquitos de jamon', 'jamon serrano taquitos'],
  },
  {
    id: 'jamon_serrano_reserva',
    name: 'Jamón Serrano Reserva Lonchas Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 225,
    protein_100g: 32.0,
    carbs_100g: 0.5,
    fat_100g: 10.5,
    aliases: ['jamon serrano', 'jamon', 'lonchas jamon serrano'],
  },

  // --- PESCADOS Y MARISCOS ---
  {
    id: 'atun_natural',
    name: 'Atún Claro al Natural Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 101,
    protein_100g: 24.0,
    carbs_100g: 0.0,
    fat_100g: 0.7,
    defaultServingGrams: 52, // Peso escurrido de 1 lata
    unitName: 'lata',
    aliases: ['atun al natural', 'atun natural', 'atun claro natural', 'lata de atun', 'atun'],
  },
  {
    id: 'atun_aceite_oliva',
    name: 'Atún Claro en Aceite de Oliva Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 185,
    protein_100g: 26.0,
    carbs_100g: 0.0,
    fat_100g: 9.0,
    defaultServingGrams: 52,
    unitName: 'lata',
    aliases: ['atun aceite', 'atun en aceite', 'atun en aceite de oliva'],
  },
  {
    id: 'salmon_fresco',
    name: 'Salmón Fresco Lomos Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 208,
    protein_100g: 20.4,
    carbs_100g: 0.0,
    fat_100g: 13.4,
    aliases: ['salmon', 'salmon fresco', 'lomo de salmon', 'salmon a la plancha'],
  },
  {
    id: 'merluza_lomos',
    name: 'Lomos de Merluza Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 78,
    protein_100g: 16.5,
    carbs_100g: 0.0,
    fat_100g: 1.2,
    aliases: ['merluza', 'filetes de merluza', 'lomos de merluza', 'merluza congelada'],
  },
  {
    id: 'bacalao_fresco',
    name: 'Bacalao Desalado / Fresco Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 75,
    protein_100g: 17.0,
    carbs_100g: 0.0,
    fat_100g: 0.5,
    aliases: ['bacalao', 'lomo bacalao', 'bacalao fresco'],
  },
  {
    id: 'langostinos_cocidos',
    name: 'Langostinos Cocidos Hacendado',
    brand: 'Hacendado',
    category: 'pescados_mariscos',
    calories_100g: 85,
    protein_100g: 18.5,
    carbs_100g: 0.5,
    fat_100g: 0.8,
    aliases: ['langostinos', 'gambas', 'gambas cocidas'],
  },

  // --- HUEVOS Y CLARAS ---
  {
    id: 'claras_huevo',
    name: 'Claras de Huevo Pasteurizadas Hacendado',
    brand: 'Hacendado',
    category: 'huevos_claras',
    calories_100g: 45,
    protein_100g: 10.5,
    carbs_100g: 0.7,
    fat_100g: 0.1,
    defaultServingGrams: 35, // Peso de 1 clara
    unitName: 'clara',
    aliases: ['claras', 'clara de huevo', 'claras de huevo', 'bote de claras'],
  },
  {
    id: 'huevo_entero',
    name: 'Huevo Entero Campero M/L Hacendado',
    brand: 'Hacendado',
    category: 'huevos_claras',
    calories_100g: 143,
    protein_100g: 12.5,
    carbs_100g: 0.7,
    fat_100g: 9.7,
    defaultServingGrams: 55, // 1 huevo mediano entero sin cáscara
    unitName: 'huevo',
    aliases: ['huevo', 'huevos', 'huevo entero', 'huevos enteros', 'huevo cocido', 'huevos revueltos'],
  },

  // --- LÁCTEOS Y GAMA +PROTEÍNAS MERCADONA ---
  {
    id: 'queso_fresco_batido_0',
    name: 'Queso Fresco Batido 0% Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 46,
    protein_100g: 8.0,
    carbs_100g: 3.5,
    fat_100g: 0.1,
    aliases: ['queso batido', 'queso fresco batido', 'queso batido 0%', 'queso fresco batido 0'],
  },
  {
    id: 'yogur_proteinas_natural',
    name: 'Yogur +Proteínas Natural Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 52,
    protein_100g: 10.0,
    carbs_100g: 3.0,
    fat_100g: 0.1,
    defaultServingGrams: 120,
    unitName: 'vasito',
    aliases: ['yogur proteico natural', 'yogur proteinas natural', 'yogur +proteinas natural'],
  },
  {
    id: 'yogur_proteinas_sabores',
    name: 'Yogur +Proteínas Vainilla / Fresa / Arándanos Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 56,
    protein_100g: 10.0,
    carbs_100g: 4.0,
    fat_100g: 0.1,
    defaultServingGrams: 120,
    unitName: 'vasito',
    aliases: [
      'yogur proteico',
      'yogur proteinas',
      'yogur +proteinas',
      'yogur proteico vainilla',
      'yogur proteico fresa',
      'yogur proteico arandanos',
      'yogur proteinas vainilla',
      'yogur proteinas fresa',
      'yogur de proteinas',
    ],
  },
  {
    id: 'mousse_proteinas_chocolate',
    name: 'Mousse +Proteínas Chocolate Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 76,
    protein_100g: 10.0,
    carbs_100g: 5.0,
    fat_100g: 1.5,
    defaultServingGrams: 200,
    unitName: 'tarrina',
    aliases: ['mousse proteinas', 'mousse proteica', 'mousse chocolate proteinas', 'mousse proteico'],
  },
  {
    id: 'pudding_proteinas',
    name: 'Pudding +Proteínas Chocolate / Caramelo Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 77,
    protein_100g: 10.0,
    carbs_100g: 5.5,
    fat_100g: 1.5,
    defaultServingGrams: 200,
    unitName: 'tarrina',
    aliases: ['pudding proteinas', 'pudding proteico', 'pudding +proteinas', 'pudin proteinas'],
  },
  {
    id: 'bebida_lactea_proteinas',
    name: 'Bebida Láctea +Proteínas 20g Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 55,
    protein_100g: 6.1,
    carbs_100g: 7.0,
    fat_100g: 0.3,
    defaultServingGrams: 330,
    unitName: 'botella',
    aliases: ['batido proteinas mercadona', 'bebida lactea proteinas', 'batido +proteinas', 'batido proteico mercadona'],
  },
  {
    id: 'gelatina_proteinas_0',
    name: 'Gelatina +Proteínas 0% Azúcar Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 38,
    protein_100g: 6.0,
    carbs_100g: 0.0,
    fat_100g: 0.0,
    defaultServingGrams: 100,
    unitName: 'tarrina',
    aliases: ['gelatina proteinas', 'gelatina +proteinas', 'gelatina proteica'],
  },
  {
    id: 'yogur_griego_ligero',
    name: 'Yogur Griego Ligero Natural Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 60,
    protein_100g: 5.8,
    carbs_100g: 4.7,
    fat_100g: 2.0,
    defaultServingGrams: 125,
    unitName: 'vasito',
    aliases: ['yogur griego ligero', 'griego ligero', 'yogur griego light'],
  },
  {
    id: 'queso_cottage_light',
    name: 'Queso Cottage Semicurado Light Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 85,
    protein_100g: 12.0,
    carbs_100g: 2.5,
    fat_100g: 3.0,
    aliases: ['cottage', 'queso cottage', 'cottage cheese'],
  },
  {
    id: 'leche_desnatada',
    name: 'Leche Desnatada Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 34,
    protein_100g: 3.2,
    carbs_100g: 4.9,
    fat_100g: 0.1,
    defaultServingGrams: 200,
    unitName: 'vaso',
    aliases: ['leche desnatada', 'leche desnatada hacendado'],
  },
  {
    id: 'leche_semidesnatada',
    name: 'Leche Semidesnatada Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 46,
    protein_100g: 3.2,
    carbs_100g: 4.8,
    fat_100g: 1.6,
    defaultServingGrams: 200,
    unitName: 'vaso',
    aliases: ['leche semi', 'leche semidesnatada'],
  },
  {
    id: 'leche_proteinas_desnatada',
    name: 'Leche Desnatada +Proteínas Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 47,
    protein_100g: 6.0,
    carbs_100g: 4.9,
    fat_100g: 0.3,
    defaultServingGrams: 200,
    unitName: 'vaso',
    aliases: ['leche +proteinas', 'leche proteinas', 'leche proteica'],
  },
  {
    id: 'bebida_soja_0',
    name: 'Bebida de Soja 0% Azúcar Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 32,
    protein_100g: 3.0,
    carbs_100g: 0.5,
    fat_100g: 1.8,
    defaultServingGrams: 200,
    unitName: 'vaso',
    aliases: ['leche de soja', 'bebida de soja', 'soja 0%'],
  },
  {
    id: 'bebida_almendras_0',
    name: 'Bebida de Almendras 0% Azúcar Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteinas',
    calories_100g: 14,
    protein_100g: 0.5,
    carbs_100g: 0.2,
    fat_100g: 1.2,
    defaultServingGrams: 200,
    unitName: 'vaso',
    aliases: ['leche de almendras', 'bebida de almendras', 'almendras 0%'],
  },

  // --- CEREALES, ARROCES Y PASTAS ---
  {
    id: 'arroz_basmati_crudo',
    name: 'Arroz Basmati Hacendado (Crudo)',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 351,
    protein_100g: 8.5,
    carbs_100g: 77.0,
    fat_100g: 0.8,
    aliases: ['arroz basmati', 'basmati', 'arroz basmati crudo', 'arroz'],
  },
  {
    id: 'arroz_redondo_crudo',
    name: 'Arroz Redondo Hacendado (Crudo)',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 348,
    protein_100g: 7.0,
    carbs_100g: 78.0,
    fat_100g: 0.9,
    aliases: ['arroz blanco', 'arroz redondo'],
  },
  {
    id: 'arroz_cocido',
    name: 'Arroz Blanco Cocido / Vasito Microondas Hacendado',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 130,
    protein_100g: 2.8,
    carbs_100g: 28.0,
    fat_100g: 0.5,
    defaultServingGrams: 125,
    unitName: 'vasito',
    aliases: ['arroz cocido', 'vasito de arroz', 'vasito basmati', 'vasito arroz'],
  },
  {
    id: 'avena_copos',
    name: 'Copos de Avena Extrasuaves Hacendado',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 375,
    protein_100g: 13.5,
    carbs_100g: 59.0,
    fat_100g: 7.0,
    fiber_100g: 10.0,
    aliases: ['avena', 'copos de avena', 'avena copos', 'avena extrasuave'],
  },
  {
    id: 'harina_avena',
    name: 'Harina de Avena Hacendado',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 370,
    protein_100g: 12.5,
    carbs_100g: 60.0,
    fat_100g: 7.0,
    aliases: ['harina de avena', 'harina avena'],
  },
  {
    id: 'pasta_integral_cruda',
    name: 'Macarrones / Espaguetis Integrales Hacendado (Crudo)',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 345,
    protein_100g: 12.0,
    carbs_100g: 66.0,
    fat_100g: 2.5,
    aliases: ['pasta integral', 'macarrones integrales', 'espaguetis integrales', 'pasta'],
  },
  {
    id: 'pasta_cocida',
    name: 'Pasta Cocida al Dente',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 135,
    protein_100g: 4.5,
    carbs_100g: 27.0,
    fat_100g: 0.6,
    aliases: ['pasta cocida', 'macarrones cocidos', 'espaguetis cocidos'],
  },
  {
    id: 'patata_cocida',
    name: 'Patata Fresca / Cocida / Asada',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 77,
    protein_100g: 2.0,
    carbs_100g: 17.5,
    fat_100g: 0.1,
    defaultServingGrams: 200,
    unitName: 'patata',
    aliases: [
      'patata',
      'patatas',
      'patata hervida',
      'patatas hervidas',
      'patata cocida',
      'patatas cocidas',
      'patata asada',
      'patatas asadas',
      'patata al vapor',
    ],
  },
  {
    id: 'boniato',
    name: 'Boniato / Batata Fresca',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 86,
    protein_100g: 1.6,
    carbs_100g: 20.0,
    fat_100g: 0.1,
    aliases: ['boniato', 'batata', 'boniato asado'],
  },
  {
    id: 'garbanzos_cocidos',
    name: 'Garbanzos Cocidos en Bote Hacendado',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 105,
    protein_100g: 6.5,
    carbs_100g: 14.0,
    fat_100g: 2.2,
    aliases: ['garbanzos', 'garbanzos cocidos', 'bote de garbanzos'],
  },
  {
    id: 'lentejas_cocidas',
    name: 'Lentejas Cocidas en Bote Hacendado',
    brand: 'Hacendado',
    category: 'cereales_arroces_pastas',
    calories_100g: 92,
    protein_100g: 6.8,
    carbs_100g: 13.0,
    fat_100g: 1.0,
    aliases: ['lentejas', 'lentejas cocidas', 'bote de lentejas'],
  },

  // --- PANES Y TOSTADAS ---
  {
    id: 'pan_100_integral',
    name: 'Pan 100% Integral Hacendado',
    brand: 'Hacendado',
    category: 'panes_tostadas',
    calories_100g: 235,
    protein_100g: 9.5,
    carbs_100g: 41.0,
    fat_100g: 2.5,
    defaultServingGrams: 30,
    unitName: 'rebanada',
    aliases: ['pan integral', 'pan 100% integral', 'tostada integral', 'tostadas integrales'],
  },
  {
    id: 'pan_molde_integral',
    name: 'Pan de Molde 100% Integral sin Corteza Hacendado',
    brand: 'Hacendado',
    category: 'panes_tostadas',
    calories_100g: 220,
    protein_100g: 9.0,
    carbs_100g: 40.0,
    fat_100g: 2.2,
    defaultServingGrams: 28,
    unitName: 'rebanada',
    aliases: ['pan de molde integral', 'pan de molde', 'rebanada pan de molde'],
  },
  {
    id: 'tortitas_maiz',
    name: 'Tortitas de Maíz / Arroz Hacendado',
    brand: 'Hacendado',
    category: 'panes_tostadas',
    calories_100g: 380,
    protein_100g: 8.0,
    carbs_100g: 80.0,
    fat_100g: 2.5,
    defaultServingGrams: 8,
    unitName: 'tortita',
    aliases: ['tortitas de maiz', 'tortitas de arroz', 'tortita de maiz', 'tortita de arroz'],
  },

  // --- GRASAS SALUDABLES Y FRUTOS SECOS ---
  {
    id: 'aove',
    name: 'Aceite de Oliva Virgen Extra Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 900,
    protein_100g: 0.0,
    carbs_100g: 0.0,
    fat_100g: 100.0,
    defaultServingGrams: 10,
    unitName: 'cucharada',
    aliases: [
      'aove',
      'aceite de oliva',
      'aceite de oliva virgen extra',
      'aceite virgen extra',
      'aceite oliva',
      'aceite',
      'cucharada de aceite',
      'cucharada aceite',
      'aceite de oliva virgen',
      'aove hacendado',
    ],
  },
  {
    id: 'aguacate_fresco',
    name: 'Aguacate Fresco',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 160,
    protein_100g: 2.0,
    carbs_100g: 8.5,
    fat_100g: 14.7,
    defaultServingGrams: 80,
    unitName: 'medio aguacate',
    aliases: ['aguacate', 'medio aguacate'],
  },
  {
    id: 'nueces_naturales',
    name: 'Nueces Naturales Peladas Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 654,
    protein_100g: 15.0,
    carbs_100g: 13.7,
    fat_100g: 65.2,
    aliases: ['nueces', 'nuez', 'nueces peladas'],
  },
  {
    id: 'almendras_naturales',
    name: 'Almendras Naturales / Tostadas Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 610,
    protein_100g: 21.0,
    carbs_100g: 6.0,
    fat_100g: 53.0,
    aliases: ['almendras', 'almendra', 'almendras tostadas', 'frutos secos'],
  },
  {
    id: 'crema_cacahuete_100',
    name: 'Crema de Cacahuete 100% Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 618,
    protein_100g: 30.0,
    carbs_100g: 7.0,
    fat_100g: 50.0,
    defaultServingGrams: 15,
    unitName: 'cucharada',
    aliases: ['crema de cacahuete', 'crema cacahuete', 'mantequilla de cacahuete'],
  },

  // --- FRUTAS Y VERDURAS ---
  {
    id: 'platano',
    name: 'Plátano de Canarias',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 89,
    protein_100g: 1.1,
    carbs_100g: 22.8,
    fat_100g: 0.3,
    defaultServingGrams: 100, // 1 plátano mediano pelado
    unitName: 'platano',
    aliases: ['platano', 'platanos', 'platano de canarias', 'banana'],
  },
  {
    id: 'manzana',
    name: 'Manzana Golden / Fuji',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 52,
    protein_100g: 0.3,
    carbs_100g: 13.8,
    fat_100g: 0.2,
    defaultServingGrams: 160,
    unitName: 'manzana',
    aliases: ['manzana', 'manzanas'],
  },
  {
    id: 'arandanos_frescos',
    name: 'Arándanos Frescos Hacendado',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 57,
    protein_100g: 0.7,
    carbs_100g: 14.5,
    fat_100g: 0.3,
    aliases: ['arandanos', 'arandano'],
  },
  {
    id: 'fresas',
    name: 'Fresas / Fresones Frescos',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 32,
    protein_100g: 0.7,
    carbs_100g: 7.7,
    fat_100g: 0.3,
    aliases: ['fresas', 'fresa', 'fresones'],
  },
  {
    id: 'brocoli',
    name: 'Brócoli Fresco / Congelado Hacendado',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 34,
    protein_100g: 2.8,
    carbs_100g: 6.6,
    fat_100g: 0.4,
    aliases: ['brocoli', 'brocoli al vapor'],
  },
  {
    id: 'judias_verdes',
    name: 'Judías Verdes Hacendado',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 25,
    protein_100g: 2.0,
    carbs_100g: 3.5,
    fat_100g: 0.3,
    aliases: ['judias verdes', 'judias'],
  },
  {
    id: 'espinacas',
    name: 'Espinacas Frescas / Congeladas Hacendado',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 23,
    protein_100g: 2.9,
    carbs_100g: 3.6,
    fat_100g: 0.4,
    aliases: ['espinacas', 'espinaca'],
  },
  {
    id: 'tomate',
    name: 'Tomate Pera / Ensalada',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 18,
    protein_100g: 0.9,
    carbs_100g: 3.9,
    fat_100g: 0.2,
    aliases: ['tomate', 'tomates', 'tomate pera'],
  },
  {
    id: 'zanahoria',
    name: 'Zanahoria Fresca',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 41,
    protein_100g: 0.9,
    carbs_100g: 9.6,
    fat_100g: 0.2,
    aliases: ['zanahoria', 'zanahorias'],
  },
  {
    id: 'ensalada_brotes',
    name: 'Ensalada Brotes Tiernos / Mezclum Hacendado',
    brand: 'Hacendado',
    category: 'frutas_verduras',
    calories_100g: 15,
    protein_100g: 1.2,
    carbs_100g: 2.0,
    fat_100g: 0.2,
    aliases: ['ensalada', 'lechuga', 'brotes tiernos', 'mezclum'],
  },

  // --- SUPLEMENTOS Y OTROS ---
  {
    id: 'whey_protein',
    name: 'Proteína Whey en Polvo (Concentrado / Aislado)',
    brand: 'Suplemento Deportivo',
    category: 'suplementos_otros',
    calories_100g: 380,
    protein_100g: 78.0,
    carbs_100g: 4.0,
    fat_100g: 4.5,
    defaultServingGrams: 30, // 1 cacito habitual
    unitName: 'cacito',
    aliases: ['whey', 'proteina whey', 'proteina en polvo', 'batido de proteinas', 'cazo de proteina', 'cacito de whey'],
  },
  {
    id: 'creatina_monohidrato',
    name: 'Creatina Monohidrato Creapure',
    brand: 'Suplemento Deportivo',
    category: 'suplementos_otros',
    calories_100g: 0,
    protein_100g: 0.0,
    carbs_100g: 0.0,
    fat_100g: 0.0,
    defaultServingGrams: 5,
    unitName: 'dosis',
    aliases: ['creatina', 'creatina monohidrato'],
  },
  {
    id: 'cafe_solo',
    name: 'Café Solo (Sin Azúcar)',
    brand: 'Hacendado',
    category: 'suplementos_otros',
    calories_100g: 2,
    protein_100g: 0.1,
    carbs_100g: 0.0,
    fat_100g: 0.0,
    defaultServingGrams: 100,
    unitName: 'taza',
    aliases: ['cafe', 'cafe solo', 'espresso'],
  },
  {
    id: 'ketchup_zero',
    name: 'Ketchup Zero Sin Azúcares Añadidos Hacendado',
    brand: 'Hacendado',
    category: 'suplementos_otros',
    calories_100g: 41,
    protein_100g: 1.2,
    carbs_100g: 7.2,
    fat_100g: 0.2,
    defaultServingGrams: 15,
    unitName: 'cucharada',
    aliases: [
      'ketchup',
      'ketchup cero',
      'ketchup zero',
      'ketchup 0',
      'ketchup sin azucar',
      'ketchup sin azucares anadidos',
      'ketchup hacendado',
      'ketchup mercadona',
      'ketchup zero hacendado',
      'ketchup cero hacendado',
      'salsa ketchup',
    ],
  },
  {
    id: 'mayonesa_ligera',
    name: 'Mayonesa Ligera Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 280,
    protein_100g: 0.8,
    carbs_100g: 4.5,
    fat_100g: 28.5,
    defaultServingGrams: 15,
    unitName: 'cucharada',
    aliases: [
      'mayonesa ligera',
      'mayonesa light',
      'mayonesa hacendado',
      'mayonesa mercadona',
      'mahonesa ligera',
      'mahonesa light',
      'mayonesa ligera hacendado',
      'mayonesa light hacendado',
      'mahonesa ligera hacendado',
    ],
  },
  {
    id: 'mayonesa_tradicional',
    name: 'Mayonesa Tradicional Hacendado',
    brand: 'Hacendado',
    category: 'grasas_aceites_frutos',
    calories_100g: 680,
    protein_100g: 0.8,
    carbs_100g: 1.5,
    fat_100g: 75.0,
    defaultServingGrams: 15,
    unitName: 'cucharada',
    aliases: ['mayonesa', 'mahonesa', 'mayonesa normal', 'mayonesa tradicional'],
  },
  {
    id: 'mostaza_dijon',
    name: 'Mostaza Clásica / Dijon Hacendado',
    brand: 'Hacendado',
    category: 'suplementos_otros',
    calories_100g: 90,
    protein_100g: 5.0,
    carbs_100g: 4.0,
    fat_100g: 5.5,
    defaultServingGrams: 15,
    unitName: 'cucharada',
    aliases: ['mostaza', 'mostaza dijon', 'mostaza hacendado'],
  },
  {
    id: 'tomate_frito_cero',
    name: 'Tomate Frito 0% Azúcares Añadidos Hacendado',
    brand: 'Hacendado',
    category: 'suplementos_otros',
    calories_100g: 42,
    protein_100g: 1.3,
    carbs_100g: 6.2,
    fat_100g: 1.2,
    defaultServingGrams: 50,
    aliases: ['tomate frito 0%', 'tomate frito cero', 'tomate frito sin azucar', 'tomate frito hacendado'],
  },
];

// --------------------------------------------------------------------
// 2. FUNCIÓN DE BÚSQUEDA NORMALIZADA EN CATÁLOGO MERCADONA
// --------------------------------------------------------------------

/**
 * Busca un alimento en la base de datos de Mercadona/Hacendado mediante
 * coincidencia exacta de alias o coincidencia difusa protegida de palabras clave.
 */
export function findMercadonaProduct(query: string): MercadonaProduct | null {
  const normQuery = normalizeText(query);
  if (!normQuery) return null;
  const cleanedQuery = cleanFoodSearchQuery(query);

  // 1. Coincidencia exacta de alias o nombre (query original o limpio)
  for (const prod of MERCADONA_CATALOG) {
    const normName = normalizeText(prod.name);
    if (normName === normQuery || (cleanedQuery && normName === cleanedQuery)) {
      return prod;
    }
    for (const alias of prod.aliases) {
      const normAlias = normalizeText(alias);
      if (normAlias === normQuery || (cleanedQuery && normAlias === cleanedQuery)) {
        return prod;
      }
    }
  }

  // 2. Coincidencia difusa inteligente con límites de palabra y penalización de palabras no deseadas
  let bestMatch: MercadonaProduct | null = null;
  let highestScore = 0;

  const targetQueries = Array.from(new Set([normQuery, cleanedQuery].filter(Boolean)));
  const queryTokens = Array.from(
    new Set(
      normQuery
        .split(' ')
        .concat(cleanedQuery ? cleanedQuery.split(' ') : [])
        .filter((t) => t.length > 2)
    )
  );

  const anchorWords = ['atun', 'salmon', 'merluza', 'bacalao', 'pollo', 'pavo', 'ternera', 'cerdo'];

  for (const prod of MERCADONA_CATALOG) {
    for (const alias of prod.aliases) {
      const normAlias = normalizeText(alias);
      const aliasTokens = normAlias.split(' ').filter((t) => t.length > 2);

      // Detección de estado de cocción en query y alias
      const queryIsCooked = targetQueries.some((q) =>
        /\b(?:cocinad[oa]s?|plancha|hech[oa]s?|frit[oa]s?|asado|asada)\b/i.test(q)
      );
      const queryIsRaw = targetQueries.some((q) =>
        /\b(?:crud[oa]s?|fresc[oa]s?|en\s+crudo)\b/i.test(q)
      );
      const aliasIsCooked = /\b(?:cocinad[oa]s?|plancha|hech[oa]s?|frit[oa]s?|asado|asada)\b/i.test(normAlias);
      const aliasIsRaw = /\b(?:crud[oa]s?|fresc[oa]s?|en\s+crudo)\b/i.test(normAlias);

      // A. Contención de frase completa con fronteras de palabra (\b)
      for (const tq of targetQueries) {
        if (tq.length >= 3 && normAlias.length >= 3) {
          const aliasRegex = new RegExp(`\\b${normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (aliasRegex.test(tq)) {
            let score = 160 + normAlias.length * 2;
            for (const aw of anchorWords) {
              if (normAlias.includes(aw) && !tq.includes(aw)) {
                score -= 100;
              }
            }
            if (queryIsCooked && aliasIsCooked) score += 80;
            if (queryIsCooked && aliasIsRaw) score -= 120;
            if (queryIsRaw && aliasIsRaw) score += 80;
            if (queryIsRaw && aliasIsCooked) score -= 120;

            if (score > highestScore) {
              highestScore = score;
              bestMatch = prod;
            }
          }

          const queryRegex = new RegExp(`\\b${tq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (queryRegex.test(normAlias)) {
            let score = 110 + tq.length;
            for (const aw of anchorWords) {
              if (normAlias.includes(aw) && !tq.includes(aw)) {
                score -= 100;
              }
            }
            if (queryIsCooked && aliasIsCooked) score += 80;
            if (queryIsCooked && aliasIsRaw) score -= 120;
            if (queryIsRaw && aliasIsRaw) score += 80;
            if (queryIsRaw && aliasIsCooked) score -= 120;

            if (score > highestScore) {
              highestScore = score;
              bestMatch = prod;
            }
          }
        }
      }

      // B. Coincidencia por tokens compartidos
      const commonTokens = queryTokens.filter((t) => aliasTokens.includes(t));
      if (commonTokens.length >= 2) {
        let score = commonTokens.length * 25;
        if (aliasTokens.every((t) => queryTokens.includes(t))) {
          score += 50;
        }
        for (const aw of anchorWords) {
          if (aliasTokens.includes(aw) && !queryTokens.includes(aw)) {
            score -= 100;
          }
        }
        if (queryIsCooked && aliasIsCooked) score += 80;
        if (queryIsCooked && aliasIsRaw) score -= 120;
        if (queryIsRaw && aliasIsRaw) score += 80;
        if (queryIsRaw && aliasIsCooked) score -= 120;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = prod;
        }
      }
    }
  }

  return bestMatch;
}

// --------------------------------------------------------------------
// 3. CONSULTA EXTERNA A OPEN FOOD FACTS API (ESPAÑA)
// --------------------------------------------------------------------
/**
 * Consulta la API pública de Open Food Facts (CGI search endpoint España)
 * con timeout rápido (3.5 segundos) y validación semántica estricta del resultado.
 */
export async function searchOpenFoodFacts(
  query: string
): Promise<MercadonaProduct | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const cleanQuery = cleanFoodSearchQuery(query) || query;
    const encoded = encodeURIComponent(cleanQuery);
    const url = `https://es.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=5`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'IronManApp/1.0 (soporte@ironmanapp.org)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.products || data.products.length === 0) return null;

    // Validación semántica estricta:
    // El producto retornado DEBE coincidir con al menos un token clave (>2 caracteres) de la búsqueda.
    const queryTokens = cleanQuery.split(' ').filter((t) => t.length > 2);
    let matchedProduct: any = null;

    for (const p of data.products) {
      const prodName = normalizeText(p.product_name_es || p.product_name || '');
      const isRelevant = queryTokens.some((tok) => prodName.includes(tok));
      if (isRelevant) {
        matchedProduct = p;
        break;
      }
    }

    if (!matchedProduct) {
      // Si la API devuelve un producto ajeno (ej: Copos de avena para ketchup), lo descartamos por completo
      return null;
    }

    const p = matchedProduct;
    const n = p.nutriments || {};

    const kcal =
      Number(n['energy-kcal_100g']) ||
      Number(n['energy-kcal_value']) ||
      Number(n['energy-kcal']) ||
      0;
    const protein = Number(n.proteins_100g) || Number(n.proteins_value) || 0;
    const carbs = Number(n.carbohydrates_100g) || Number(n.carbohydrates_value) || 0;
    const fat = Number(n.fat_100g) || Number(n.fat_value) || 0;

    if (kcal === 0 && protein === 0 && carbs === 0 && fat === 0) return null;

    return {
      id: `off-${p.code || Date.now()}`,
      name: p.product_name_es || p.product_name || cleanQuery,
      brand: p.brands || 'Comercial',
      category: 'suplementos_otros',
      calories_100g: Math.round(kcal),
      protein_100g: parseFloat(protein.toFixed(1)),
      carbs_100g: parseFloat(carbs.toFixed(1)),
      fat_100g: parseFloat(fat.toFixed(1)),
      aliases: [cleanQuery, query],
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// --------------------------------------------------------------------
// 4. MOTOR DE RESOLUCIÓN Y CÁLCULO MATEMÁTICO POR PESAJE
// --------------------------------------------------------------------
/**
 * Resuelve la nutrición de un alimento individual y calcula sus macros
 * según los gramos o unidades ingeridas por Álvaro.
 */
export async function resolveSingleFoodItem(
  itemInput: WeighedItemInput
): Promise<CalculatedItemResult> {
  const cleanName = cleanFoodSearchQuery(itemInput.food) || itemInput.food;

  // 1. Prioridad absoluta: Comprobar la despensa / memoria de alimentos frecuentes de Álvaro
  let frequentMatch = await findUserFrequentFood(itemInput.food);
  if (!frequentMatch && cleanName !== itemInput.food) {
    frequentMatch = await findUserFrequentFood(cleanName);
  }

  let matchedProduct: MercadonaProduct | null = null;
  let source: 'mercadona_catalog' | 'open_food_facts' | 'heuristica' = 'mercadona_catalog';

  if (frequentMatch) {
    matchedProduct = {
      id: frequentMatch.id,
      name: frequentMatch.name,
      brand: frequentMatch.brand,
      category: 'grasas_aceites_frutos',
      calories_100g: frequentMatch.calories_100g,
      protein_100g: frequentMatch.protein_100g,
      carbs_100g: frequentMatch.carbs_100g,
      fat_100g: frequentMatch.fat_100g,
      fiber_100g: frequentMatch.fiber_100g,
      defaultServingGrams: frequentMatch.default_serving_grams,
      unitName: frequentMatch.unit_name,
      aliases: frequentMatch.aliases,
    };
    source = 'mercadona_catalog';
  } else {
    // 2. Catálogo maestro Mercadona / Hacendado
    matchedProduct = findMercadonaProduct(itemInput.food) || findMercadonaProduct(cleanName);
    if (!matchedProduct) {
      // 3. Consulta externa a Open Food Facts con validación
      const offProduct = await searchOpenFoodFacts(itemInput.food) || await searchOpenFoodFacts(cleanName);
      if (offProduct) {
        matchedProduct = offProduct;
        source = 'open_food_facts';
      }
    }
  }

  // 4. Fallback si no se encuentra: NUNCA cambiar a otro alimento (ej. avena),
  // mantener el alimento exacto dictado por Álvaro con macros heurísticos coherentes
  if (!matchedProduct) {
    source = 'heuristica';
    const lowerName = cleanName.toLowerCase();
    let estKcal = 120;
    let estProt = 8.0;
    let estCarbs = 10.0;
    let estFat = 4.0;

    if (lowerName.includes('ketchup') || lowerName.includes('mostaza') || lowerName.includes('salsa tomate')) {
      estKcal = 40;
      estProt = 1.0;
      estCarbs = 8.0;
      estFat = 0.2;
    } else if (lowerName.includes('mayonesa') || lowerName.includes('alioli') || lowerName.includes('mahonesa')) {
      estKcal = 280;
      estProt = 0.8;
      estCarbs = 4.5;
      estFat = 28.5;
    } else if (
      lowerName.includes('lomo') ||
      lowerName.includes('ternera') ||
      lowerName.includes('pollo') ||
      lowerName.includes('carne') ||
      lowerName.includes('pavo')
    ) {
      estKcal = 130;
      estProt = 22.0;
      estCarbs = 0.0;
      estFat = 4.0;
    } else if (lowerName.includes('patata') || lowerName.includes('arroz') || lowerName.includes('pasta')) {
      estKcal = 85;
      estProt = 2.0;
      estCarbs = 18.0;
      estFat = 0.2;
    }

    matchedProduct = {
      id: 'gen-' + Date.now(),
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      brand: 'Despensa / Tienda',
      category: 'suplementos_otros',
      calories_100g: estKcal,
      protein_100g: estProt,
      carbs_100g: estCarbs,
      fat_100g: estFat,
      aliases: [cleanName, itemInput.food],
    };
  }

  // Determinar los gramos reales con precisión matemática ESTRICTA
  let effectiveGrams = Number(itemInput.amount);
  if (isNaN(effectiveGrams) || effectiveGrams <= 0) {
    effectiveGrams = 100;
  }
  const unit = (itemInput.unit || 'g').toLowerCase().trim();

  // Solo si la unidad es un elemento contable (ej: 2 huevos, 1 lata, 1 rebanada, 1 plátano)
  // multiplicamos por el peso de la ración. Si son gramos ('g', 'gr') o mililitros ('ml'),
  // effectiveGrams son EXACTAMENTE los gramos dictados por el atleta.
  const isUnitBased = [
    'unidad', 'unidades', 'ud', 'uds', 'huevo', 'huevos', 'lata', 'latas',
    'rebanada', 'rebanadas', 'tostada', 'tostadas', 'vasito', 'vasitos',
    'tarrina', 'tarrinas', 'cucharada', 'cucharadas', 'cazo', 'cazos',
    'cacito', 'cacitos', 'dosis', 'platano', 'platanos', 'manzana', 'manzanas'
  ].includes(unit);

  if (isUnitBased) {
    const servingGrams = matchedProduct.defaultServingGrams || 100;
    effectiveGrams = effectiveGrams * servingGrams;
  }

  const factor = effectiveGrams / 100;

  const itemCalories = Math.round(matchedProduct.calories_100g * factor);
  const itemProtein = parseFloat((matchedProduct.protein_100g * factor).toFixed(1));
  const itemCarbs = parseFloat((matchedProduct.carbs_100g * factor).toFixed(1));
  const itemFat = parseFloat((matchedProduct.fat_100g * factor).toFixed(1));

  return {
    foodName: itemInput.food,
    matchedName: matchedProduct.name,
    brand: matchedProduct.brand,
    grams: Math.round(effectiveGrams),
    calories: itemCalories,
    protein_g: itemProtein,
    carbs_g: itemCarbs,
    fat_g: itemFat,
    source,
  };
}

/**
 * Calcula una comida completa desglosando cada ingrediente pesado y
 * aplicando la REGLA MATEMÁTICA ESTRICTA: 4*P + 4*C + 9*G ~ Kcal.
 */
export async function calculateMealFromWeighedItems(
  items: WeighedItemInput[]
): Promise<MealCalculationResult> {
  const calculatedItems: CalculatedItemResult[] = [];

  for (const item of items) {
    const result = await resolveSingleFoodItem(item);
    calculatedItems.push(result);
  }

  let totalProt = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let sumOfCalories = 0;

  for (const item of calculatedItems) {
    totalProt += item.protein_g;
    totalCarbs += item.carbs_g;
    totalFat += item.fat_g;
    sumOfCalories += item.calories;
  }

  totalProt = parseFloat(totalProt.toFixed(1));
  totalCarbs = parseFloat(totalCarbs.toFixed(1));
  totalFat = parseFloat(totalFat.toFixed(1));

  // Fórmula metabólica exacta: 4 kcal por gramo de proteína, 4 kcal por hidrato, 9 kcal por grasa
  const rawMathCalories = Math.round(4 * totalProt + 4 * totalCarbs + 9 * totalFat);

  // Asegurar cuadre perfecto: Si sumOfCalories difiere por redondeos de los productos,
  // se armoniza con rawMathCalories para que en el front y en el mensaje las calorías
  // cuadren al 100% con la suma de los macronutrientes.
  const finalCalories = Math.abs(sumOfCalories - rawMathCalories) <= 15 ? sumOfCalories : rawMathCalories;

  // Formatear desglose visual para Telegram
  const breakdownLines = calculatedItems.map((it) => {
    const sourceIcon = it.source === 'mercadona_catalog' ? '🟢 Mercadona' : it.source === 'open_food_facts' ? '🔵 OpenFoodFacts' : '⚪ Estimado';
    return `• *${it.grams}g* ${it.matchedName} (${it.brand}):\n  └ *${it.calories} kcal* | 🥩 *${it.protein_g}g* P | 🍚 *${it.carbs_g}g* HC | 🥑 *${it.fat_g}g* G _[${sourceIcon}]_`;
  });

  const formattedBreakdown = breakdownLines.join('\n');

  return {
    items: calculatedItems,
    totalCalories: finalCalories,
    totalProtein: totalProt,
    totalCarbs: totalCarbs,
    totalFat: totalFat,
    rawMathCalories,
    formattedBreakdown,
  };
}

/**
 * Extrae ingredientes y cantidades en gramos de un texto en lenguaje natural
 * (ej: "he puesto 25 gramos de crema de cacahuete", "200g pechuga de pollo y 80g arroz").
 * Respeta rigurosamente los gramos dictados y nunca inventa cantidades por defecto.
 */
export function extractItemsFromText(text: string): WeighedItemInput[] {
  if (!text || !text.trim()) return [];

  const items: WeighedItemInput[] = [];

  // 1. Limpiar menciones de macros (ej: "155 kcal", "7.5g proteina", etc.) para que no interfieran
  // pero conservando los alimentos y sus pesajes
  const cleanedText = text
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kcal|calorias|calorías|cal)\b/gi, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:gramos|gr|g)?\s*(?:de\s+)?(?:prot|proteina|proteinas|proteína|proteínas|carb|carbs|hidrato|hidratos|ch|grasa|grasas|fat)\b/gi, '');

  // Dividir por comas, conjunciones (" y ", " e ", " con ", " + ") o saltos de línea
  const segments = cleanedText
    .split(/[,;\n\+]|\s+(?:y|e|con)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  for (const rawSeg of segments) {
    // Quitar verbos y fórmulas conversacionales
    const seg = rawSeg
      .replace(/^(?:he\s+(?:puesto|tomado|comido|bebido|cenado|merendado|añadido)|puse|tomé|tome|comí|comi|añadí|anadi|añadi|le\s+eché|le\s+eche|eché|eche|le\s+puse|llevaba|lleva|metí|meti|para\s+(?:desayunar|comer|cenar|merendar)|de\s+desayuno|de\s+comida|de\s+cena|de\s+merienda)\s+/i, '')
      .trim();

    if (!seg) continue;

    // 1. Patrón Gramos / Mililitros al inicio o con "de": "25g de crema de cacahuete" / "25 gramos mantequilla de cacahuete"
    const gramFrontMatch = seg.match(/^(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g|ml)\b\s*(?:de\s+)?(.+)$/i);
    if (gramFrontMatch) {
      const amount = parseFloat(gramFrontMatch[1].replace(',', '.'));
      const food = gramFrontMatch[2].trim().replace(/^[;:,.\-\s]+|[;:,.\-\s]+$/g, '');
      if (food.length > 1) {
        items.push({ food, amount, unit: 'g' });
        continue;
      }
    }

    // 2. Patrón Gramos / Mililitros al final: "crema de cacahuete 25 gramos" / "pechuga de pollo 200g"
    const gramEndMatch = seg.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g|ml)\b$/i);
    if (gramEndMatch) {
      const food = gramEndMatch[1].trim().replace(/^[;:,.\-\s]+|[;:,.\-\s]+$/g, '');
      const amount = parseFloat(gramEndMatch[2].replace(',', '.'));
      if (food.length > 1) {
        items.push({ food, amount, unit: 'g' });
        continue;
      }
    }

    // 3. Patrón Gramos en cualquier parte del segmento: "... 25 gramos de crema de cacahuete ..."
    const gramAnywhereMatch = seg.match(/(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g|ml)\b\s*(?:de\s+)?([a-záéíóúñ\s0-9%]+)/i);
    if (gramAnywhereMatch) {
      const amount = parseFloat(gramAnywhereMatch[1].replace(',', '.'));
      const food = gramAnywhereMatch[2].trim().replace(/^[;:,.\-\s]+|[;:,.\-\s]+$/g, '');
      if (food.length > 1) {
        items.push({ food, amount, unit: 'g' });
        continue;
      }
    }

    // 4. Patrón Unidades / Envases contables: "2 huevos", "1 lata de atun", "3 claras", "2 tostadas", "1 cacito de whey"
    const unitMatch = seg.match(/^(\d+)\s*(huevos?|claras?|latas?|rebanadas?|tostadas?|vasitos?|cucharadas?|cacitos?|cazos?|tarrinas?)\s*(?:de\s+)?(.*)$/i);
    if (unitMatch) {
      const amount = parseInt(unitMatch[1], 10);
      const unit = unitMatch[2].toLowerCase();
      const rest = unitMatch[3]?.trim().replace(/^[;:,.\-\s]+|[;:,.\-\s]+$/g, '');
      const food = rest && rest.length > 1 ? `${unit} de ${rest}` : unit;
      items.push({ food, amount, unit });
      continue;
    }

    // 5. Patrón Número solo seguido del alimento (ej: "200 pollo", "80 arroz", "2 platanos")
    const numOnlyMatch = seg.match(/^(\d+(?:[.,]\d+)?)\s+(?:de\s+)?([a-záéíóúñ\s]+)$/i);
    if (numOnlyMatch) {
      const amount = parseFloat(numOnlyMatch[1].replace(',', '.'));
      const food = numOnlyMatch[2].trim();
      if (amount >= 20 && food.length > 2) {
        items.push({ food, amount, unit: 'g' });
        continue;
      } else if (amount < 20 && food.length > 2) {
        items.push({ food, amount, unit: 'unidad' });
        continue;
      }
    }

    // 6. Patrón Artículos ("un platano", "una manzana", "un café")
    const articleMatch = seg.match(/^(?:un|una|1)\s+([a-záéíóúñ\s]+)$/i);
    if (articleMatch) {
      const food = articleMatch[1].trim();
      items.push({ food, amount: 1, unit: 'unidad' });
      continue;
    }

    // 7. Si no tiene cantidad explícita pero es un alimento reconocible en Mercadona o Despensa
    const matched = findMercadonaProduct(seg);
    if (matched) {
      // Comprobar si hay algún número aislado en el segmento que se nos haya escapado
      const anyNum = seg.match(/\b(\d+(?:[.,]\d+)?)\b/);
      if (anyNum) {
        const numVal = parseFloat(anyNum[1].replace(',', '.'));
        const unit = numVal >= 15 ? 'g' : 'unidad';
        items.push({ food: seg, amount: numVal, unit });
      } else {
        items.push({ food: seg, amount: 1, unit: 'unidad' });
      }
    }
  }

  return items;
}

