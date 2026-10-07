// ====================================================================
// GESTOR DE MEMORIA DE ALIMENTOS FRECUENTES Y BÁSCULA (ÁLVARO / MERCADONA)
// Especialista: Nutrición Deportiva y Precisión de Pesaje
// ====================================================================

import { UserFrequentFood } from '@/types/database';
import { isSupabaseConfigured, supabaseAdmin } from './supabase';
import { mockStore } from './mockStore';

// --------------------------------------------------------------------
// 1. PRODUCTOS BÁSICOS PRECARGADOS (DESPENSA MERCADONA DE ÁLVARO)
// --------------------------------------------------------------------
export const DEFAULT_FREQUENT_FOODS: UserFrequentFood[] = [
  {
    id: 'fav-crema-cacahuete-100',
    name: 'Crema de Cacahuete 100% Hacendado',
    brand: 'Hacendado',
    category: 'grasas_saludables',
    calories_100g: 618,
    protein_100g: 30.0,
    carbs_100g: 7.0,
    fat_100g: 50.0,
    default_serving_grams: 15,
    unit_name: 'cucharada',
    aliases: [
      'crema de cacahuete',
      'crema cacahuete',
      'mantequilla de cacahuete',
      'mantequilla cacahuete',
      'cacahuete',
      'mi crema de cacahuete',
      'peanut butter',
    ],
    times_used: 10,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-pechuga-pollo',
    name: 'Pechuga de Pollo Limpia Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 106,
    protein_100g: 22.2,
    carbs_100g: 0.0,
    fat_100g: 1.2,
    aliases: ['pollo crudo', 'pechuga de pollo cruda', 'pechuga cruda'],
    times_used: 15,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-pechuga-pollo-cocinada',
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
      'pollo hecho',
      'pechuga hecha',
    ],
    times_used: 20,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-pechuga-pavo',
    name: 'Pechuga de Pavo Filetes Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 105,
    protein_100g: 24.0,
    carbs_100g: 0.0,
    fat_100g: 1.0,
    aliases: ['pavo', 'pechuga de pavo', 'filetes de pavo', 'pechuga pavo'],
    times_used: 12,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-pavo-lonchas-92',
    name: 'Pechuga de Pavo 92% Lonchas Hacendado',
    brand: 'Hacendado',
    category: 'embutidos_magros',
    calories_100g: 86,
    protein_100g: 18.0,
    carbs_100g: 1.0,
    fat_100g: 1.0,
    default_serving_grams: 25,
    unit_name: 'loncha',
    aliases: ['fiambre pavo', 'pavo lonchas', 'jamon pavo', 'pechuga de pavo 92%', 'lonchas pavo'],
    times_used: 8,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-huevos-l',
    name: 'Huevos Clase L Hacendado',
    brand: 'Hacendado',
    category: 'huevos',
    calories_100g: 143,
    protein_100g: 12.5,
    carbs_100g: 0.7,
    fat_100g: 10.0,
    default_serving_grams: 65, // ~65g por huevo L entero
    unit_name: 'huevo',
    aliases: ['huevo', 'huevos', 'huevos revueltos', 'huevo a la plancha', 'huevos enteros'],
    times_used: 20,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-claras-pasteurizadas',
    name: 'Claras de Huevo Pasteurizadas Hacendado',
    brand: 'Hacendado',
    category: 'huevos',
    calories_100g: 50,
    protein_100g: 11.0,
    carbs_100g: 0.5,
    fat_100g: 0.2,
    default_serving_grams: 35, // ~35g por clara
    unit_name: 'clara',
    aliases: ['claras', 'clara de huevo', 'claras de huevo', 'bote de claras'],
    times_used: 14,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-tortilla-francesa',
    name: 'Tortilla Francesa / Tortilla de Huevo Plancha',
    brand: 'Hacendado / Casera',
    category: 'huevos',
    calories_100g: 154,
    protein_100g: 11.5,
    carbs_100g: 0.6,
    fat_100g: 11.8,
    default_serving_grams: 100,
    unit_name: 'unidad',
    aliases: [
      'tortilla',
      'tortilla francesa',
      'tortilla de huevo',
      'tortilla de huevos',
      'tortilla simple',
      'tortilla de huevo simple',
    ],
    times_used: 20,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-queso-semicurado-tierno',
    name: 'Queso Semicurado / Tierno / Rallado Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteicos',
    calories_100g: 345,
    protein_100g: 24.5,
    carbs_100g: 1.5,
    fat_100g: 27.0,
    default_serving_grams: 30,
    unit_name: 'loncha',
    aliases: [
      'queso',
      'queso rallado',
      'queso semicurado',
      'queso tierno',
      'queso en lonchas',
      'loncha de queso',
      'lonchas de queso',
      'un poco de queso',
      'queso normal',
    ],
    times_used: 15,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-higos-frescos',
    name: 'Higos Frescos Hacendado / Frutería',
    brand: 'Hacendado / Frutería',
    category: 'frutas',
    calories_100g: 74,
    protein_100g: 0.8,
    carbs_100g: 16.0,
    fat_100g: 0.3,
    default_serving_grams: 35,
    unit_name: 'unidad',
    aliases: [
      'higo',
      'higos',
      'higos frescos',
      'higo fresco',
      'breva',
      'brevas',
      'higos maduros',
    ],
    times_used: 10,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-copos-avena',
    name: 'Copos de Avena Hacendado',
    brand: 'Hacendado',
    category: 'cereales',
    calories_100g: 375,
    protein_100g: 13.5,
    carbs_100g: 58.7,
    fat_100g: 7.0,
    default_serving_grams: 50,
    aliases: ['avena', 'copos de avena', 'harina de avena', 'porridge'],
    times_used: 16,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-queso-batido-0',
    name: 'Queso Fresco Batido 0% Hacendado',
    brand: 'Hacendado',
    category: 'lacteos_proteicos',
    calories_100g: 46,
    protein_100g: 8.5,
    carbs_100g: 3.5,
    fat_100g: 0.1,
    default_serving_grams: 250,
    unit_name: 'tarrina',
    aliases: ['queso batido', 'queso fresco batido', 'queso 0%', 'queso fresco batido 0%'],
    times_used: 15,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-proteina-whey',
    name: 'Proteína Whey en Polvo',
    brand: 'Suplemento Deportivo',
    category: 'suplementos',
    calories_100g: 380,
    protein_100g: 78.0,
    carbs_100g: 4.0,
    fat_100g: 4.5,
    default_serving_grams: 30, // 1 cacito habitual
    unit_name: 'cacito',
    aliases: ['whey', 'proteina whey', 'proteina en polvo', 'batido de proteinas', 'cazo de proteina', 'cacito de whey', 'proteina'],
    times_used: 18,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-arroz-basmati',
    name: 'Arroz Basmati Hacendado',
    brand: 'Hacendado',
    category: 'cereales',
    calories_100g: 350,
    protein_100g: 8.5,
    carbs_100g: 77.0,
    fat_100g: 1.0,
    default_serving_grams: 80,
    aliases: ['arroz basmati', 'arroz', 'arroz cocido', 'arroz blanco'],
    times_used: 14,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-atun-natural',
    name: 'Atún Claro al Natural Hacendado',
    brand: 'Hacendado',
    category: 'pescados',
    calories_100g: 81,
    protein_100g: 18.5,
    carbs_100g: 0.0,
    fat_100g: 0.8,
    default_serving_grams: 52, // 1 lata escurrida
    unit_name: 'lata',
    aliases: ['atun', 'atun al natural', 'lata de atun', 'lata de atun al natural', 'atún'],
    times_used: 10,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-aove',
    name: 'Aceite de Oliva Virgen Extra Hacendado',
    brand: 'Hacendado',
    category: 'grasas_saludables',
    calories_100g: 824,
    protein_100g: 0.0,
    carbs_100g: 0.0,
    fat_100g: 91.6,
    default_serving_grams: 10,
    unit_name: 'cucharada',
    aliases: [
      'aceite de oliva',
      'aceite de oliva virgen extra',
      'aceite virgen extra',
      'aove',
      'aceite',
      'cucharada de aceite',
      'aceite oliva',
      'aceite de oliva virgen',
    ],
    times_used: 25,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-contramuslo-cocinado',
    name: 'Contramuslo de Pollo Deshuesado Cocinado / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 178,
    protein_100g: 25.0,
    carbs_100g: 0.0,
    fat_100g: 8.8,
    default_serving_grams: 150,
    unit_name: 'unidad',
    aliases: [
      'contramuslo',
      'contramuslos',
      'contramuslo deshuesado',
      'contramuslos deshuesados',
      'contramuslo cocinado',
      'contramuslos cocinados',
      'contramuslo deshuesado cocinado',
      'contramuslos deshuesados cocinados',
      'contramuslo a la plancha',
      'contramuslos a la plancha',
      'contramuslo de pollo cocinado',
      'contramuslos de pollo cocinados',
      'contramuslo pollo cocinado',
      'contramuslos pollo cocinados',
      'contramuslo hecho',
      'contramuslos hechos',
      'contramuslo al horno',
      'contramuslos al horno',
      'contramuslo de pollo',
      'contramuslos de pollo',
      'contramuslo pollo',
      'contramuslos pollo',
    ],
    times_used: 25,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-calabacin-cocinado',
    name: 'Calabacín Cocinado / Plancha / Hervido',
    brand: 'Hacendado / Verdulería',
    category: 'verduras',
    calories_100g: 18,
    protein_100g: 1.2,
    carbs_100g: 2.7,
    fat_100g: 0.4,
    default_serving_grams: 200,
    unit_name: 'racion',
    aliases: [
      'calabacin cocinado',
      'calabacin a la plancha',
      'calabacin hervido',
      'calabacin salteado',
      'calabacines cocinados',
      'calabacin hecho',
      'calabacin al vapor',
      'calabacin frito',
      'calabacin plancha',
      'calabacin',
      'calabacines',
    ],
    times_used: 25,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-mozzarella-fresca',
    name: 'Queso Mozzarella Fresco Galbani / Hacendado',
    brand: 'Hacendado / Galbani',
    category: 'lacteos_proteicos',
    calories_100g: 245,
    protein_100g: 17.5,
    carbs_100g: 1.5,
    fat_100g: 18.5,
    default_serving_grams: 125,
    unit_name: 'bola',
    aliases: [
      'mozzarella',
      'mozzarela',
      'queso mozzarella',
      'mozzarella fresca',
      'mozzarella galbani',
      'galbani mozzarella',
      'bola mozzarella',
      'bola de mozzarella',
      'mozzarella en bola',
      'mozzarella de vaca',
    ],
    times_used: 25,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-lomo-cocinado',
    name: 'Cinta de Lomo de Cerdo Cocinada / Plancha Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 167,
    protein_100g: 29.3,
    carbs_100g: 0.0,
    fat_100g: 5.3,
    default_serving_grams: 120,
    unit_name: 'filete',
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
    times_used: 20,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-lomo-fresco',
    name: 'Cinta de Lomo Fresca de Cerdo (Crudo) Hacendado',
    brand: 'Hacendado',
    category: 'carnes_aves',
    calories_100g: 125,
    protein_100g: 22.0,
    carbs_100g: 0.0,
    fat_100g: 4.0,
    default_serving_grams: 150,
    unit_name: 'filete',
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
    times_used: 10,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-lomo-embuchado',
    name: 'Lomo Embuchado Duroc Hacendado',
    brand: 'Hacendado',
    category: 'embutidos_magros',
    calories_100g: 198,
    protein_100g: 38.0,
    carbs_100g: 0.8,
    fat_100g: 4.8,
    default_serving_grams: 30,
    unit_name: 'racion',
    aliases: [
      'lomo embuchado',
      'cinta de lomo embuchada',
      'lomo curado',
      'lomo duroc',
      'lomo embuchado duroc',
      'embutido de lomo',
    ],
    times_used: 10,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-patata-cocida',
    name: 'Patata Fresca / Cocida / Asada Hacendado',
    brand: 'Hacendado',
    category: 'tuberculos',
    calories_100g: 77,
    protein_100g: 2.0,
    carbs_100g: 17.5,
    fat_100g: 0.1,
    default_serving_grams: 200,
    unit_name: 'patata',
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
    times_used: 16,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-ketchup-zero',
    name: 'Ketchup Zero Sin Azúcares Hacendado',
    brand: 'Hacendado',
    category: 'salsas',
    calories_100g: 41,
    protein_100g: 1.2,
    carbs_100g: 7.2,
    fat_100g: 0.2,
    default_serving_grams: 15,
    unit_name: 'cucharada',
    aliases: [
      'ketchup',
      'ketchup cero',
      'ketchup zero',
      'ketchup 0',
      'ketchup sin azucar',
      'ketchup hacendado',
      'ketchup mercadona',
      'ketchup zero hacendado',
      'ketchup cero hacendado',
      'salsa ketchup',
    ],
    times_used: 14,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-mayonesa-ligera',
    name: 'Mayonesa Ligera Hacendado',
    brand: 'Hacendado',
    category: 'salsas',
    calories_100g: 280,
    protein_100g: 0.8,
    carbs_100g: 4.5,
    fat_100g: 28.5,
    default_serving_grams: 15,
    unit_name: 'cucharada',
    aliases: [
      'mayonesa ligera',
      'mayonesa light',
      'mayonesa hacendado',
      'mayonesa mercadona',
      'mahonesa ligera',
      'mahonesa light',
      'mayonesa ligera hacendado',
      'mayonesa light hacendado',
    ],
    times_used: 12,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-pan-integral',
    name: 'Pan 100% Integral Hacendado',
    brand: 'Hacendado',
    category: 'panes',
    calories_100g: 230,
    protein_100g: 9.0,
    carbs_100g: 41.0,
    fat_100g: 2.5,
    default_serving_grams: 30, // 1 rebanada
    unit_name: 'rebanada',
    aliases: ['pan integral', 'pan de molde integral', 'pan 100% integral', 'tostada integral', 'tostadas'],
    times_used: 12,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-platano',
    name: 'Plátano de Canarias',
    brand: 'Hacendado',
    category: 'frutas',
    calories_100g: 89,
    protein_100g: 1.1,
    carbs_100g: 22.8,
    fat_100g: 0.3,
    default_serving_grams: 100,
    unit_name: 'platano',
    aliases: ['platano', 'platanos', 'platano de canarias', 'banana'],
    times_used: 16,
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'fav-nueces',
    name: 'Nueces Peladas Hacendado',
    brand: 'Hacendado',
    category: 'grasas_saludables',
    calories_100g: 654,
    protein_100g: 15.2,
    carbs_100g: 7.0,
    fat_100g: 65.2,
    default_serving_grams: 20,
    aliases: ['nueces', 'nuez', 'nueces peladas'],
    times_used: 9,
    last_used_at: new Date().toISOString(),
  },
];

// --------------------------------------------------------------------
// 2. NORMALIZADOR Y LIMPIADOR DE TEXTO PARA BÚSQUEDAS
// --------------------------------------------------------------------
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpia coletillas habituales de lenguaje conversacional y procedencia de tienda
 * (ej: "del mercadona", "comprada también en el mercadona", "hacendado") para
 * aislar el nombre puro del alimento.
 */
export function cleanFoodSearchQuery(text: string): string {
  let cleaned = normalizeText(text);
  cleaned = cleaned
    .replace(/\b(?:comprad[oa]s?\s+(?:tambien\s+)?(?:en\s+el\s+|en\s+)?mercadona)\b/gi, '')
    .replace(/\b(?:del?\s+mercadona|en\s+el\s+mercadona|en\s+mercadona)\b/gi, '')
    .replace(/\b(?:de\s+hacendado|hacendado)\b/gi, '')
    .replace(/\b(?:del\s+super|en\s+el\s+super)\b/gi, '')
    .replace(/\b(?:marca\s+blanca)\b/gi, '')
    .replace(/^\d+(?:[.,]\d+)?\s*(?:g|gr|gramos|ml)\s*(?:de\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

// --------------------------------------------------------------------
// 3. RECUPERAR ALIMENTOS FRECUENTES (SUPABASE + MEMORIA)
// --------------------------------------------------------------------
export async function getUserFrequentFoods(): Promise<UserFrequentFood[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_frequent_foods')
        .select('*')
        .order('times_used', { ascending: false });

      if (!error && data && data.length > 0) {
        // Actualizar la caché en memoria si la tienda existe
        if (mockStore) {
          (mockStore as any).userFrequentFoods = data;
        }
        return data;
      }
    } catch (e) {
      console.warn('Aviso cargando user_frequent_foods desde Supabase:', e);
    }
  }

  if (mockStore && (mockStore as any).userFrequentFoods && (mockStore as any).userFrequentFoods.length > 0) {
    return (mockStore as any).userFrequentFoods;
  }

  // Fallback con la despensa habitual por defecto
  return [...DEFAULT_FREQUENT_FOODS];
}

// --------------------------------------------------------------------
// 4. BÚSQUEDA PRIORITARIA EN PRODUCTOS FRECUENTES DE ÁLVARO
// --------------------------------------------------------------------
export async function findUserFrequentFood(query: string): Promise<UserFrequentFood | null> {
  const normQuery = normalizeText(query);
  if (!normQuery) return null;
  const cleanedQuery = cleanFoodSearchQuery(query);

  const catalog = await getUserFrequentFoods();

  // 1. Coincidencia exacta de alias o nombre (original o limpio)
  for (const prod of catalog) {
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

  // 2. Coincidencia difusa inteligente con fronteras de palabras y protección contra falsos positivos
  let bestMatch: UserFrequentFood | null = null;
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

  const anchorWords = ['atun', 'salmon', 'merluza', 'bacalao', 'pollo', 'pavo', 'ternera', 'cerdo', 'tortilla'];

  for (const prod of catalog) {
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

      // A. Contención de frase completa con límites de palabra (\b)
      for (const tq of targetQueries) {
        if (tq.length >= 3 && normAlias.length >= 3) {
          const aliasRegex = new RegExp(`\\b${normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (aliasRegex.test(tq)) {
            let score = 150 + normAlias.length * 2;
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
            let score = 100 + tq.length;
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
// 5. MEMORIZAR / GUARDAR UN NUEVO PRODUCTO O ACTUALIZAR EXISTENTE
// --------------------------------------------------------------------
export async function memorizeUserFood(foodData: {
  name: string;
  brand?: string;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g?: number;
  default_serving_grams?: number;
  unit_name?: string;
  aliases?: string[];
}): Promise<UserFrequentFood> {
  const normName = normalizeText(foodData.name);
  const aliasList = Array.from(
    new Set([foodData.name.toLowerCase(), normName, ...(foodData.aliases || [])])
  );

  const existingCatalog = await getUserFrequentFoods();
  const existing = existingCatalog.find(
    (f) =>
      normalizeText(f.name) === normName ||
      f.aliases.some((a) => normalizeText(a) === normName)
  );

  const foodId = existing ? existing.id : `fav-${Date.now()}`;
  const updatedFood: UserFrequentFood = {
    id: foodId,
    name: foodData.name,
    brand: foodData.brand || 'Hacendado',
    category: 'despensa_personal',
    calories_100g: Math.round(foodData.calories_100g),
    protein_100g: parseFloat(foodData.protein_100g.toFixed(1)),
    carbs_100g: parseFloat(foodData.carbs_100g.toFixed(1)),
    fat_100g: parseFloat(foodData.fat_100g.toFixed(1)),
    fiber_100g: foodData.fiber_100g,
    default_serving_grams: foodData.default_serving_grams || 100,
    unit_name: foodData.unit_name || 'g',
    aliases: aliasList,
    times_used: (existing?.times_used || 0) + 1,
    last_used_at: new Date().toISOString(),
    created_at: existing?.created_at || new Date().toISOString(),
  };

  // Guardar en Supabase
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('user_frequent_foods').upsert([updatedFood], { onConflict: 'id' });
    } catch (e) {
      console.warn('Aviso guardando user_frequent_foods en Supabase:', e);
    }
  }

  // Guardar en memoria
  if (mockStore) {
    if (!(mockStore as any).userFrequentFoods) {
      (mockStore as any).userFrequentFoods = [...DEFAULT_FREQUENT_FOODS];
    }
    const idx = (mockStore as any).userFrequentFoods.findIndex((f: UserFrequentFood) => f.id === foodId);
    if (idx >= 0) {
      (mockStore as any).userFrequentFoods[idx] = updatedFood;
    } else {
      (mockStore as any).userFrequentFoods.unshift(updatedFood);
    }
  }

  return updatedFood;
}

// --------------------------------------------------------------------
// 6. DETECTOR DE MACROS EXPLÍCITOS EN EL TEXTO DEL USUARIO
// --------------------------------------------------------------------
export interface ExplicitMacrosResult {
  hasExplicitMacros: boolean;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

/**
 * Detecta si el mensaje dictado por Álvaro contiene números explícitos
 * para las calorías o macronutrientes (ej: "155 kcal, 7.5g proteina, 3g carb, 12g grasa").
 * En este caso, ESTOS NÚMEROS DEBEN PREVALECER AL 100% Y NUNCA SOBRESCRIBIRSE.
 */
export function extractExplicitMacrosFromText(text: string): ExplicitMacrosResult {
  if (!text) return { hasExplicitMacros: false };

  const lower = text.toLowerCase();
  let calories: number | undefined;
  let protein_g: number | undefined;
  let carbs_g: number | undefined;
  let fat_g: number | undefined;
  let matchesCount = 0;

  // Calorías: "155 kcal", "155 calorías", "155 cal", "155 calorias"
  const kcalMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:kcal|calorias|calorías|cal)\b/i);
  if (kcalMatch) {
    calories = Math.round(parseFloat(kcalMatch[1].replace(',', '.')));
    matchesCount++;
  }

  // Proteína: "7.5g proteina", "7.5 g de proteína", "7.5g prot"
  const protMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos)?\s*(?:de\s+)?(?:prot|proteina|proteinas|proteína|proteínas)\b/i);
  if (protMatch) {
    protein_g = parseFloat(parseFloat(protMatch[1].replace(',', '.')).toFixed(1));
    matchesCount++;
  }

  // Carbohidratos / Hidratos: "3g hidratos", "3g carbs", "3g hc"
  const carbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos)?\s*(?:de\s+)?(?:carb|carbs|carbohidrato|carbohidratos|hidrato|hidratos|ch)\b/i);
  if (carbMatch) {
    carbs_g = parseFloat(parseFloat(carbMatch[1].replace(',', '.')).toFixed(1));
    matchesCount++;
  }

  // Grasas: "12g grasa", "12g grasas", "12g fat"
  const fatMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos)?\s*(?:de\s+)?(?:grasa|grasas|fat)\b/i);
  if (fatMatch) {
    fat_g = parseFloat(parseFloat(fatMatch[1].replace(',', '.')).toFixed(1));
    matchesCount++;
  }

  // Si se detectaron al menos 2 macros o calorías + 1 macro, son macros explícitos intencionados por el atleta
  const hasExplicitMacros = matchesCount >= 2 || (calories !== undefined && (protein_g !== undefined || carbs_g !== undefined || fat_g !== undefined));

  return {
    hasExplicitMacros,
    calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}
