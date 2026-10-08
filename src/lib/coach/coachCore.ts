// ====================================================================
// COACH CORE SERVICE (CENTRALIZADO & MULTIMODAL)
// Motor unificado de Inteligencia Artificial, Fisioterapia y Nutrición
// Compartido por la App Web (Chat/Voz) y el Bot de Telegram
// ====================================================================

import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import {
  NutritionLog,
  WaterLog,
  WeightLog,
  GymExercise,
  GymWorkoutLog,
  CardioActivity,
  DailyHealthMetric,
} from '@/types/database';
import {
  activeProtocol,
  updateWeight,
  setDayType,
  toggleCreatine,
} from '@/lib/nutritionProtocol';
import {
  getTodayRoutine,
  WEEKLY_ROUTINE,
  getHalfMarathonCountdown,
  getCurrentWeekNumber,
  formatDailyScheduleMarkdown,
  formatWeeklyScheduleMarkdown,
  formatKneeRehabMarkdown,
  formatMenuMarkdown,
  formatSupplementsMarkdown,
} from '@/lib/weeklyRoutine';
import {
  calculateMealFromWeighedItems,
  extractItemsFromText,
  findMercadonaProduct,
  WeighedItemInput,
} from '@/lib/mercadonaNutrition';
import {
  getUserFrequentFoods,
  findUserFrequentFood,
  memorizeUserFood,
  extractExplicitMacrosFromText,
  parseMultipleDishesWithExactMacros,
} from '@/lib/frequentFoodsManager';
import {
  swapScheduleDays,
  setDayRoutineOverride,
  resetDayRoutineOverride,
  getWeekSchedule,
} from '@/lib/scheduleManager';
import { DiscomfortManager, DiscomfortLevel, DiscomfortReport } from '@/lib/discomfortManager';
import { TYPICAL_DAY_PRESETS, applyTypicalDayBatch } from '@/lib/nutrition/presetsManager';

// --------------------------------------------------------------------
// TIPOS DEL MOTOR DEL COACH
// --------------------------------------------------------------------

export interface UniversalAssistantResponse {
  action:
    | 'log_workout'
    | 'log_cardio'
    | 'log_nutrition'
    | 'log_multiple_dishes'
    | 'log_water'
    | 'log_weight'
    | 'protocol_update'
    | 'query'
    | 'schedule_swap'
    | 'schedule_reassign'
    | 'gym_exercise_modification'
    | 'recalculate_today_nutrition'
    | 'adjust_value'
    | 'set_value'
    | 'save_food_preference'
    | 'discomfort_report'
    | 'log_typical_day'
    | 'audio_unclear'
    | 'unknown';
  transcription?: string;
  workout?: any;
  cardio?: any;
  nutrition?: any;
  multiple_dishes?: any;
  water_ml?: number;
  weight_log?: any;
  protocol_update?: any;
  schedule_swap?: any;
  schedule_reassign?: any;
  gym_exercise_modification?: any;
  adjust?: any;
  set_value?: any;
  save_food_preference?: any;
  discomfort_report?: any;
  reply_text?: string;
  coach_tip?: string;
}

export interface CoachTurnResult {
  success: boolean;
  transcription?: string;
  isVoice: boolean;
  action: string;
  replyText: string;
  coachTip?: string;
  breakdownText?: string;
  dataSummary?: any;
  todayTotals: {
    calories: number;
    caloriesRemaining: number;
    caloriesTarget: number;
    protein_g: number;
    proteinTarget_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
    waterTarget_ml: number;
  };
  effectiveRoutine?: any;
}

// --------------------------------------------------------------------
// UTILIDADES BÁSICAS
// --------------------------------------------------------------------

export function getSpainTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

function parseRelativeDate(inputDateStr: string, referenceDateStr: string): string {
  if (!inputDateStr) return referenceDateStr;
  const clean = inputDateStr.trim().toLowerCase();
  const ref = new Date(referenceDateStr + 'T12:00:00Z');

  if (clean === 'hoy' || clean === 'today') return referenceDateStr;
  if (clean === 'ayer' || clean === 'yesterday') {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  }
  if (clean === 'mañana' || clean === 'tomorrow') {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Días de la semana
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado'];
  const targetDayIdx = dayNames.findIndex(n => clean.includes(n));
  if (targetDayIdx !== -1) {
    const targetIsoDay = targetDayIdx === 0 ? 0 : (targetDayIdx <= 2 ? targetDayIdx : (targetDayIdx === 4 ? 3 : (targetDayIdx === 5 ? 4 : (targetDayIdx === 6 ? 5 : 6))));
    const currentDay = ref.getUTCDay();
    let diff = targetIsoDay - currentDay;
    const targetDate = new Date(ref);
    targetDate.setUTCDate(targetDate.getUTCDate() + diff);
    return targetDate.toISOString().split('T')[0];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return referenceDateStr;
}

// --------------------------------------------------------------------
// TRANSCRIPCIÓN MULTIMODAL DE AUDIO CON GEMINI
// --------------------------------------------------------------------

export async function transcribeAudioWithGemini(
  audioData: { base64: string; mimeType: string },
  apiKey: string
): Promise<string | null> {
  if (!apiKey || !audioData.base64) return null;

  // Normalizar mimeType para compatibilidad estricta con Google Gemini API
  let rawMime = (audioData.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (rawMime === 'audio/x-m4a' || rawMime === 'audio/m4a') {
    rawMime = 'audio/mp4';
  }

  // Modelos oficiales de ultra-baja latencia y fidelidad auditiva
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe con fidelidad absoluta lo que se habla en este audio en español. Si solo hay silencio, ruido de fondo o no hay voz inteligible, devuelve exactamente cadena vacía sin inventar nada ni poner puntos.' },
                {
                  inline_data: {
                    mime_type: rawMime,
                    data: audioData.base64,
                  },
                },
              ],
            }],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.audioTranscription?.text ||
          data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          const cleanText = text.trim();
          // Si el texto es solo un punto o signos de puntuación sin palabras inteligibles, ignorar
          if (/^[\s.,;:\-_!?]+$/.test(cleanText)) {
            return null;
          }
          return cleanText;
        }
      }
    } catch (err) {
      console.warn(`Aviso de latencia/fallo transcribiendo audio con ${model}:`, err);
    }
  }

  return null;
}

// --------------------------------------------------------------------
// CONSULTA DE TOTALES Y SNAPSHOT DEL DÍA
// --------------------------------------------------------------------

export async function getTodayNutritionTotals(todayStr: string): Promise<{
  meals: NutritionLog[];
  waterLogs: WaterLog[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWaterMl: number;
}> {
  let meals: NutritionLog[] = [];
  let waterLogs: WaterLog[] = [];

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const [mealsRes, waterRes] = await Promise.all([
        supabaseAdmin
          .from('nutrition_logs')
          .select('*')
          .eq('date', todayStr)
          .neq('meal_type', 'PESO_CORPORAL'),
        supabaseAdmin
          .from('water_logs')
          .select('*')
          .eq('date', todayStr),
      ]);

      if (mealsRes.data && Array.isArray(mealsRes.data)) {
        meals = mealsRes.data as NutritionLog[];
      }
      if (waterRes.data && Array.isArray(waterRes.data)) {
        waterLogs = waterRes.data as WaterLog[];
      }
    } catch (err) {
      console.warn('Aviso obteniendo totales de nutrición en Supabase:', err);
    }
  }

  if (meals.length === 0) {
    meals = mockStore.nutritionLogs.filter((m) => m.date === todayStr && m.meal_type !== 'PESO_CORPORAL');
  } else {
    for (const m of meals) {
      if (!mockStore.nutritionLogs.some((existing) => existing.id === m.id)) {
        mockStore.nutritionLogs.push(m);
      }
    }
  }

  if (waterLogs.length === 0) {
    waterLogs = mockStore.waterLogs.filter((w) => w.date === todayStr);
  } else {
    for (const w of waterLogs) {
      if (!mockStore.waterLogs.some((existing) => existing.id === w.id)) {
        mockStore.waterLogs.push(w);
      }
    }
  }

  const totalKcal = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const totalProtein = Math.round(meals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((sum, m) => sum + (Number(m.carbs_g) || 0), 0) * 10) / 10;
  const totalFat = Math.round(meals.reduce((sum, m) => sum + (Number(m.fat_g) || 0), 0) * 10) / 10;
  const totalWaterMl = waterLogs.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);

  return { meals, waterLogs, totalKcal, totalProtein, totalCarbs, totalFat, totalWaterMl };
}

export async function getAppSnapshot(todayStr: string) {
  let latestWeight = 101.0;
  let stepsToday = 0;
  let sleepScore: number | null = null;
  let restingHr: number | null = null;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const [weightRes, healthRes] = await Promise.all([
        supabaseAdmin.from('weight_logs').select('weight_kg').order('date', { ascending: false }).limit(1),
        supabaseAdmin.from('daily_health_metrics').select('*').eq('date', todayStr).maybeSingle(),
      ]);
      if (weightRes.data && weightRes.data.length > 0) {
        latestWeight = weightRes.data[0].weight_kg;
      }
      if (healthRes.data) {
        stepsToday = healthRes.data.total_steps || 0;
        sleepScore = healthRes.data.sleep_score;
        restingHr = healthRes.data.resting_hr;
      }
    } catch (e) {
      console.warn('Error leyendo snapshot de Supabase:', e);
    }
  }

  if (latestWeight === 101.0 && mockStore.weightLogs.length > 0) {
    latestWeight = mockStore.weightLogs[0].weight_kg;
  }
  if (stepsToday === 0 && mockStore.dailyMetrics.length > 0) {
    const todayHealth = mockStore.dailyMetrics.find(h => h.date === todayStr);
    if (todayHealth) {
      stepsToday = todayHealth.total_steps;
      sleepScore = todayHealth.sleep_score;
      restingHr = todayHealth.resting_hr;
    }
  }

  const { totalKcal, totalProtein, totalCarbs, totalFat, totalWaterMl } = await getTodayNutritionTotals(todayStr);
  const currentWeekNumber = getCurrentWeekNumber(todayStr);
  const countdown = getHalfMarathonCountdown(todayStr);
  const todayRoutine = getTodayRoutine(todayStr);

  return {
    today: todayStr,
    current_week_number: currentWeekNumber,
    countdown,
    weight_kg: latestWeight,
    steps_today: stepsToday,
    sleep_score: sleepScore,
    resting_hr: restingHr,
    today_routine: todayRoutine,
    nutrition_consumed: {
      calories: totalKcal,
      protein_g: totalProtein,
      carbs_g: totalCarbs,
      fat_g: totalFat,
      water_ml: totalWaterMl,
    },
    targets: {
      calories: activeProtocol.targets.calories,
      protein_g: activeProtocol.targets.proteinMax,
      water_ml: activeProtocol.targets.waterMl || 3000,
    },
    active_discomfort: mockStore.activeDiscomfort || null,
  };
}

// --------------------------------------------------------------------
// ATAJO DETERMINISTA DE 0 MS (BYPASS DE IA)
// --------------------------------------------------------------------

/**
 * Resuelve registros directos de nutrición pesada, agua o peso en < 2 ms
 * sin realizar llamadas de red a Gemini.
 */
export async function tryDeterministicBypass(
  text: string,
  todayStr: string
): Promise<UniversalAssistantResponse | null> {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Si contiene interrogación o términos de consulta o duda clínica, derivar a la IA
  if (
    clean.includes('?') ||
    clean.includes('¿') ||
    /\b(que|qué|como|cómo|por\s*que|por\s*qué|cuanto|cuánto|cuando|cuándo|cual|cuál|puedo|debo|recomiendas|consejo)\b/i.test(lower)
  ) {
    return null;
  }

  // Triage determinista de reporte directo de molestia (sin dudas clínicas)
  if (/\b(nivel|molestia|dolor|lesion|lesión|pinchazo|rigidez)\b/i.test(lower)) {
    const triagedDiscomfort = DiscomfortManager.triageMessage(clean);
    if (triagedDiscomfort) {
      const strategy = DiscomfortManager.evaluate(triagedDiscomfort);
      return {
        action: 'discomfort_report',
        discomfort_report: { ...triagedDiscomfort, strategy },
        reply_text: `🛡️ **Molestia Registrada: Nivel ${triagedDiscomfort.level} (${triagedDiscomfort.bodyPartId})**\n\n• **Recomendación:** ${strategy.recommendationsMarkdown}\n\n• **Ajuste:** ${strategy.training.warmupNote || 'Entrenamiento regular con calentamiento'}`,
        coach_tip: 'Graduamos la carga con proporcionalidad para que sigas entrenando con seguridad y sin dramatismo.',
      };
    }
  }

  // Si contiene menciones clínicas no estructuradas sin nivel (ej: dolor difuso), derivar a la IA
  if (/\b(dolor|molestia|rodilla|tendon|tendón)\b/i.test(lower)) {
    return null;
  }

  // 1. Detección rápida de agua
  const isWaterIntent =
    lower.includes('agua') ||
    lower.includes('hidrat') ||
    /\b(?:bebi|tom[eé]|bebo|vaso|botella)\b/i.test(lower);

  const waterQtyMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(l(?:itro)?s?|ml)\b/i);

  if (isWaterIntent && waterQtyMatch && !lower.includes('pechuga') && !lower.includes('arroz') && !lower.includes('huevo') && !lower.includes('prote')) {
    let amount = parseFloat(waterQtyMatch[1].replace(',', '.'));
    const unit = waterQtyMatch[2].toLowerCase();
    if (unit.startsWith('l')) amount = Math.round(amount * 1000);
    if (!isNaN(amount) && amount > 0 && amount <= 5000) {
      return {
        action: 'log_water',
        water_ml: amount,
        reply_text: `Registrados ${amount} ml de agua directamente en tu balance de hidratación.`,
        coach_tip: 'Mantén una ingesta continua para lubricar el cartílago articular y optimizar tu rendimiento.',
      };
    }
  }

  // 2. Detección rápida de peso corporal
  const weightMatch =
    lower.match(/(?:pes[oe]|pesado|b[aá]scula)\s*(?:hoy)?\s*(?:de|en|es)?\s*(\d{2,3}(?:[.,]\d+)?)\s*k?g?/i) ||
    lower.match(/^(\d{2,3}[.,]\d+)\s*k?g?$/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1].replace(',', '.'));
    if (!isNaN(val) && val >= 60 && val <= 160) {
      return {
        action: 'log_weight',
        weight_log: {
          weight_kg: val,
          notes: 'Pesaje directo determinista (0 ms)',
        },
        reply_text: `Peso de ${val} kg guardado correctamente en tu telemetría.`,
        coach_tip: 'Monitorea la media móvil semanal para asegurar el déficit sin pérdida de masa magra.',
      };
    }
  }

  // 2.5. Detección rápida de "Día típico cumplido"
  if (
    lower.includes('dia tipico') ||
    lower.includes('día típico') ||
    lower.includes('dia estandar') ||
    lower.includes('día estándar') ||
    lower.includes('comida estandar') ||
    lower.includes('comida estándar')
  ) {
    return {
      action: 'log_typical_day',
      reply_text: 'Aplicando tu día típico de nutrición (2.400 kcal / 202g Proteína) en un solo toque.',
      coach_tip: 'Deduplicación activa: solo se registran las comidas restantes de hoy sin duplicados.',
    };
  }

  // 3. Detección de bloque múltiple de comidas con macros exactos (salidas de Gemini o listas)
  const multipleDishes = parseMultipleDishesWithExactMacros(clean);
  if (multipleDishes.length >= 2) {
    const totalCal = multipleDishes.reduce((acc, d) => acc + d.calories, 0);
    const totalProt = multipleDishes.reduce((acc, d) => acc + d.protein_g, 0);
    const totalCarb = multipleDishes.reduce((acc, d) => acc + d.carbs_g, 0);
    const totalFat = multipleDishes.reduce((acc, d) => acc + d.fat_g, 0);

    return {
      action: 'log_multiple_dishes',
      multiple_dishes: multipleDishes,
      reply_text: `✅ Registradas ${multipleDishes.length} comidas con tus macros exactos:\n` +
        multipleDishes.map((d) => `• **${d.mealType}**: ${d.description} (${d.calories} kcal | ${d.protein_g}g P | ${d.carbs_g}g HC | ${d.fat_g}g G)`).join('\n') +
        `\n\n**Total acumulado:** ${totalCal} kcal | ${Number(totalProt.toFixed(1))}g P | ${Number(totalCarb.toFixed(1))}g HC | ${Number(totalFat.toFixed(1))}g G.`,
      coach_tip: 'Tus macros dictados se han guardado con 100% de fidelidad sin modificaciones.',
    };
  }

  // 4. Detección rápida de comidas pesadas o macros explícitos
  const items = extractItemsFromText(clean);
  const explicitMacros = extractExplicitMacrosFromText(clean);

  let hasKnownFoods = false;
  if (items.length > 0) {
    for (const item of items) {
      if (findMercadonaProduct(item.food)) {
        hasKnownFoods = true;
        break;
      }
      const freq = await findUserFrequentFood(item.food);
      if (freq) {
        hasKnownFoods = true;
        break;
      }
    }
  }

  if (hasKnownFoods || (explicitMacros.hasExplicitMacros && (explicitMacros.calories || explicitMacros.protein_g))) {
    const calc = await calculateMealFromWeighedItems(items);
    let finalCal = calc.totalCalories;
    let finalP = calc.totalProtein;
    let finalC = calc.totalCarbs;
    let finalF = calc.totalFat;

    if (explicitMacros.hasExplicitMacros) {
      if (explicitMacros.calories !== undefined) finalCal = explicitMacros.calories;
      if (explicitMacros.protein_g !== undefined) finalP = explicitMacros.protein_g;
      if (explicitMacros.carbs_g !== undefined) finalC = explicitMacros.carbs_g;
      if (explicitMacros.fat_g !== undefined) finalF = explicitMacros.fat_g;
    }

    const hour = new Date().getHours();
    let mealType = 'Comida';
    if (hour < 12) mealType = 'Desayuno';
    else if (hour < 16) mealType = 'Almuerzo';
    else if (hour < 19) mealType = 'Merienda';
    else mealType = 'Cena';

    const customReply = explicitMacros.hasExplicitMacros
      ? `Plato registrado con tus macros exactos: ${finalCal} kcal | ${finalP}g P | ${finalC}g HC | ${finalF}g G.`
      : `Ingesta calculada al instante (0 ms) con el catálogo oficial de Mercadona.`;

    return {
      action: 'log_nutrition',
      nutrition: {
        meal_type: mealType,
        description: clean,
        items,
        calories: finalCal,
        protein_g: finalP,
        carbs_g: finalC,
        fat_g: finalF,
        water_ml: 0,
        creatine_detected: lower.includes('creatina'),
        user_explicit_macros: explicitMacros.hasExplicitMacros,
      },
      reply_text: customReply,
      coach_tip: explicitMacros.hasExplicitMacros
        ? 'Tus macros se han guardado con fidelidad matemática exacta.'
        : 'Máxima precisión bromatológica para tu déficit de recomposición.',
    };
  }

  return null;
}

// --------------------------------------------------------------------
// PARSER INTELIGENTE CON GEMINI
// --------------------------------------------------------------------

export async function parseWithGemini(
  textOrHint: string,
  apiKey: string,
  snapshot: any,
  audioData?: { base64: string; mimeType: string } | null
): Promise<UniversalAssistantResponse> {
  const lowerHint = (textOrHint || '').toLowerCase();
  const isRecalculateRequest =
    (lowerHint.includes('recalcula') ||
      lowerHint.includes('recalcular') ||
      lowerHint.includes('vuelve a calcular') ||
      lowerHint.includes('volver a calcular') ||
      lowerHint.includes('revisa las comidas') ||
      lowerHint.includes('analiza las comidas') ||
      lowerHint.includes('audita')) &&
    (lowerHint.includes('comida') ||
      lowerHint.includes('macro') ||
      lowerHint.includes('hoy') ||
      lowerHint.includes('audio') ||
      lowerHint.includes('calor'));

  if (isRecalculateRequest) {
    return {
      action: 'recalculate_today_nutrition',
      reply_text: 'Iniciando auditoría y recálculo de las comidas de hoy a partir de tus audios originales...',
      coach_tip: 'Re-evaluando cada ingrediente con el catálogo Mercadona y la base científica BEDCA.',
    };
  }

  const prompt = `
Eres el Head Coach, Biomecánico y Fisioterapeuta Deportivo Personal de Álvaro para IronManApp.
Tu misión es guiarlo hacia su meta de la MEDIA MARATÓN (21,097 KM) el 28 de Febrero de 2027 sin dolor articular y con recomposición corporal exitosa.

PERFIL DEL ATLETA:
• Atleta: Álvaro (101,0 kg exactos | Target: 85 - 88 kg).
• Gasto TDEE: 2.900 - 3.000 kcal. Objetivo déficit: 2.400 kcal/día, 202 g proteína.
• Estado hoy: ${snapshot.today_routine.title} (${snapshot.today_routine.description}). Pasos hoy: ${snapshot.steps_today}.
• Consumido hoy: ${snapshot.nutrition_consumed.calories} / 2.400 kcal (${snapshot.nutrition_consumed.protein_g}g proteína).

REGLAS DE RESOLUCIÓN BROMATOLÓGICA Y NUTRICIONAL ESTRICTAS:
1. NINGUNA CARNE, AVE, PESCADO O MARISCO SIN REBOZAR TIENE CARBOHIDRATOS (carbs = 0g siempre).
2. Contramuslo deshuesado cocinado / pollo cocinado: ~175-180 kcal, ~25g proteína, 0g carbohidratos, ~8g grasa por 100g.
3. Calabacín cocinado / verduras acuosas: ~16-20 kcal, ~1.2g proteína, ~2.5g carbohidratos, ~0.3g grasa por 100g. ¡Jamás inflar a 100+ kcal!
4. Si Álvaro dicta números explícitos de macros (ej: "40g proteína, 250 kcal"), respétalos al 100% y activa "user_explicit_macros": true.
5. Si Álvaro pide RECALCULAR, AUDITAR O VOLVER A CALCULAR LAS COMIDAS DE HOY O SUS MACROS:
   Pon "action": "recalculate_today_nutrition".

INSTRUCCIÓN DE SALIDA:
Analiza el mensaje o audio y responde EXCLUSIVAMENTE un objeto JSON válido con este esquema:
{
  "action": "log_nutrition" | "log_workout" | "log_cardio" | "log_water" | "log_weight" | "schedule_swap" | "schedule_reassign" | "recalculate_today_nutrition" | "query" | "protocol_update",
  "transcription": "Texto transcrito",
  "nutrition": {
    "meal_type": "Desayuno" | "Almuerzo" | "Cena" | "Snack",
    "description": "descripción",
    "items": [
      { "food": "nombre alimento", "amount": 200, "unit": "g", "ai_calories_100g": 18, "ai_protein_100g": 1.2, "ai_carbs_100g": 2.5, "ai_fat_100g": 0.3 }
    ],
    "calories": 250,
    "protein_g": 30,
    "carbs_g": 5,
    "fat_g": 8,
    "water_ml": 0,
    "creatine_detected": false,
    "user_explicit_macros": false
  },
  "workout": {
    "title": "Nombre entrenamiento",
    "exercises": [
      { "name": "Ejercicio", "sets": [{ "set_number": 1, "reps": 10, "weight_kg": 60, "rpe": 8 }] }
    ]
  },
  "cardio": {
    "name": "Carrera o Caminata",
    "type": "Run" | "Walk",
    "distance_km": 5.0,
    "duration_minutes": 35
  },
  "water_ml": 500,
  "weight_log": { "weight_kg": 100.8, "notes": "Pesaje" },
  "schedule_swap": { "date1": "YYYY-MM-DD", "date2": "YYYY-MM-DD", "notes": "Motivo" },
  "schedule_reassign": { "date": "YYYY-MM-DD", "routine_key": "strength_torso", "title": "Nombre", "reason": "Motivo" },
  "reply_text": "Respuesta cercana y profesional del Coach",
  "coach_tip": "Consejo técnico clave"
}
`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const parts: any[] = [{ text: prompt }];
      if (audioData) {
        let rawMime = (audioData.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
        if (rawMime === 'audio/x-m4a' || rawMime === 'audio/m4a') rawMime = 'audio/mp4';
        parts.push({
          inline_data: {
            mime_type: rawMime,
            data: audioData.base64,
          },
        });
      } else if (textOrHint) {
        parts.push({ text: `Mensaje de Álvaro: "${textOrHint}"` });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }
    } catch (err) {
      console.warn(`Aviso de latencia/fallo Gemini ${model}:`, err);
    }
  }

  // Fallback heurístico
  return {
    action: 'query',
    reply_text: `He recibido tu mensaje "${textOrHint}". Todo tu plan sigue activo enfocado a tu déficit y la Media Maratón.`,
    coach_tip: 'Prioriza la constancia y la báscula de cocina en cada comida.',
  };
}

// --------------------------------------------------------------------
// AUDITORÍA Y RECÁLCULO RETROSPECTIVO DE COMIDAS A PARTIR DE AUDIOS
// --------------------------------------------------------------------

export async function recalculateDayNutrition(targetDateStr: string): Promise<{
  success: boolean;
  recalculatedMeals: Array<{
    id: string;
    mealType: string;
    transcription: string;
    before: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    after: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    breakdown: string;
  }>;
  totalBefore: { calories: number; protein: number; carbs: number; fat: number };
  totalAfter: { calories: number; protein: number; carbs: number; fat: number };
  summaryMessage: string;
}> {
  let meals: NutritionLog[] = [];
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const res = await supabaseAdmin
        .from('nutrition_logs')
        .select('*')
        .eq('date', targetDateStr)
        .neq('meal_type', 'PESO_CORPORAL')
        .order('timestamp', { ascending: true });
      if (res.data) meals = res.data as NutritionLog[];
    } catch (e) {
      console.warn('Error leyendo comidas para recálculo en Supabase:', e);
    }
  }

  if (meals.length === 0) {
    meals = mockStore.nutritionLogs.filter(m => m.date === targetDateStr && m.meal_type !== 'PESO_CORPORAL');
  }

  if (meals.length === 0) {
    return {
      success: false,
      recalculatedMeals: [],
      totalBefore: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      totalAfter: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      summaryMessage: `⚠️ No se encontraron comidas registradas para la fecha **${targetDateStr}** para auditar.`,
    };
  }

  let totalBeforeKcal = 0;
  let totalBeforeP = 0;
  let totalBeforeC = 0;
  let totalBeforeF = 0;

  let totalAfterKcal = 0;
  let totalAfterP = 0;
  let totalAfterC = 0;
  let totalAfterF = 0;

  const recalculatedMeals = [];

  for (const meal of meals) {
    const before = {
      calories: Number(meal.calories) || 0,
      protein_g: Number(meal.protein_g) || 0,
      carbs_g: Number(meal.carbs_g) || 0,
      fat_g: Number(meal.fat_g) || 0,
    };
    totalBeforeKcal += before.calories;
    totalBeforeP += before.protein_g;
    totalBeforeC += before.carbs_g;
    totalBeforeF += before.fat_g;

    const sourceText = meal.raw_audio_transcription || meal.description || '';
    const items = extractItemsFromText(sourceText);
    const explicitMacros = extractExplicitMacrosFromText(sourceText);

    let afterCalories = before.calories;
    let afterProtein = before.protein_g;
    let afterCarbs = before.carbs_g;
    let afterFat = before.fat_g;
    let breakdown = '';

    if (items.length > 0) {
      // Prioridad 1: Desglose aditivo determinista de ingredientes pesados
      const calc = await calculateMealFromWeighedItems(items);
      afterCalories = calc.totalCalories;
      afterProtein = calc.totalProtein;
      afterCarbs = calc.totalCarbs;
      afterFat = calc.totalFat;
      breakdown = calc.formattedBreakdown;
    } else if (explicitMacros.hasExplicitMacros) {
      // Prioridad 2: Macros explícitos para un plato único sin desglose de ingredientes
      if (explicitMacros.calories !== undefined) afterCalories = explicitMacros.calories;
      if (explicitMacros.protein_g !== undefined) afterProtein = explicitMacros.protein_g;
      if (explicitMacros.carbs_g !== undefined) afterCarbs = explicitMacros.carbs_g;
      if (explicitMacros.fat_g !== undefined) afterFat = explicitMacros.fat_g;
      breakdown = `🎯 Macros explícitos dictados: ${afterCalories} kcal | ${afterProtein}g P | ${afterCarbs}g HC | ${afterFat}g G`;
    }

    totalAfterKcal += afterCalories;
    totalAfterP += afterProtein;
    totalAfterC += afterCarbs;
    totalAfterF += afterFat;

    // Actualizar en Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('nutrition_logs')
          .update({
            calories: afterCalories,
            protein_g: afterProtein,
            carbs_g: afterCarbs,
            fat_g: afterFat,
          })
          .eq('id', meal.id);
      } catch (err) {
        console.warn('Error actualizando comida recalculada en Supabase:', err);
      }
    }

    // Actualizar en mockStore
    const idx = mockStore.nutritionLogs.findIndex(m => m.id === meal.id);
    if (idx !== -1) {
      mockStore.nutritionLogs[idx].calories = afterCalories;
      mockStore.nutritionLogs[idx].protein_g = afterProtein;
      mockStore.nutritionLogs[idx].carbs_g = afterCarbs;
      mockStore.nutritionLogs[idx].fat_g = afterFat;
    }

    recalculatedMeals.push({
      id: meal.id,
      mealType: meal.meal_type,
      transcription: sourceText,
      before,
      after: {
        calories: afterCalories,
        protein_g: afterProtein,
        carbs_g: afterCarbs,
        fat_g: afterFat,
      },
      breakdown,
    });
  }

  totalBeforeP = Math.round(totalBeforeP * 10) / 10;
  totalBeforeC = Math.round(totalBeforeC * 10) / 10;
  totalBeforeF = Math.round(totalBeforeF * 10) / 10;

  totalAfterP = Math.round(totalAfterP * 10) / 10;
  totalAfterC = Math.round(totalAfterC * 10) / 10;
  totalAfterF = Math.round(totalAfterF * 10) / 10;

  let msg = `🔄 **Auditoría & Recálculo de Comidas de Hoy Completado**\n\n`;
  msg += `He analizado los audios literales transcritos de tus comidas y re-procesado cada alimento con el catálogo Mercadona y la base científica BEDCA:\n\n`;

  for (const m of recalculatedMeals) {
    msg += `🍽️ **${m.mealType}:** _"${m.transcription}"_\n`;
    msg += `• **Anterior:** ${m.before.calories} kcal | ${m.before.protein_g}g P | ${m.before.carbs_g}g HC | ${m.before.fat_g}g G\n`;
    msg += `• **Corregido:** **${m.after.calories} kcal** | 🥩 **${m.after.protein_g}g** P | 🍚 **${m.after.carbs_g}g** HC | 🥑 **${m.after.fat_g}g** G\n`;
    if (m.breakdown) {
      msg += `${m.breakdown}\n`;
    }
    msg += `\n`;
  }

  const calDiff = totalAfterKcal - totalBeforeKcal;
  const pDiff = Math.round((totalAfterP - totalBeforeP) * 10) / 10;
  const diffSignCal = calDiff > 0 ? `+${calDiff}` : `${calDiff}`;
  const diffSignP = pDiff > 0 ? `+${pDiff}` : `${pDiff}`;

  msg += `📊 **Impacto en el Total de Hoy (${targetDateStr}):**\n`;
  msg += `• **Calorías:** ${totalBeforeKcal} ➔ **${totalAfterKcal} kcal** (${diffSignCal} kcal)\n`;
  msg += `• **Proteína:** ${totalBeforeP}g ➔ **${totalAfterP}g** (${diffSignP}g P)\n`;
  msg += `• **Carbohidratos:** ${totalBeforeC}g ➔ **${totalAfterC}g**\n`;
  msg += `• **Grasas:** ${totalBeforeF}g ➔ **${totalAfterF}g**\n\n`;
  msg += `💡 _Tu base de datos y el panel de la app ya reflejan estos valores reales actualizados._`;

  return {
    success: true,
    recalculatedMeals,
    totalBefore: { calories: totalBeforeKcal, protein: totalBeforeP, carbs: totalBeforeC, fat: totalBeforeF },
    totalAfter: { calories: totalAfterKcal, protein: totalAfterP, carbs: totalAfterC, fat: totalAfterF },
    summaryMessage: msg,
  };
}

// --------------------------------------------------------------------
// EJECUCIÓN CENTRALIZADA DE ACCIONES Y MUTACIONES
// --------------------------------------------------------------------

export async function executeCoachTurn({
  text,
  audioBase64,
  mimeType,
}: {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
}): Promise<CoachTurnResult> {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const todayStr = getSpainTodayStr();

  let spokenText = text?.trim() || '';
  let isVoice = false;

  // 1. Si viene audio grabado, transcribir
  if (audioBase64 && mimeType) {
    isVoice = true;
    const transcribed = await transcribeAudioWithGemini({ base64: audioBase64, mimeType }, geminiKey);
    if (transcribed && transcribed.trim() && !/^[\s.,;:\-_!?]+$/.test(transcribed.trim())) {
      spokenText = transcribed.trim();
    } else if (!spokenText) {
      // Audio ininteligible, mudo o con sólo ruidos/puntos
      const totals = await getTodayNutritionTotals(todayStr);
      return {
        success: true,
        transcription: '',
        isVoice: true,
        action: 'audio_unclear',
        replyText: '🎧 No he podido escuchar tu audio con claridad. Por favor, acércate más al micrófono o escribe lo que necesitas en la barra.',
        coachTip: 'En entornos con ruido o en Safari móvil, también puedes escribir directamente o usar el teclado.',
        todayTotals: {
          calories: totals.totalKcal,
          caloriesRemaining: Math.max(0, 2400 - totals.totalKcal),
          caloriesTarget: 2400,
          protein_g: totals.totalProtein,
          proteinTarget_g: 202,
          carbs_g: totals.totalCarbs,
          fat_g: totals.totalFat,
          water_ml: totals.totalWaterMl,
          waterTarget_ml: 3800,
        },
      };
    }
  }

  // 2. Comprobar Atajo Determinista de 0 ms (Bypass de IA)
  const deterministicResult = await tryDeterministicBypass(spokenText, todayStr);
  let aiResult: UniversalAssistantResponse;

  if (deterministicResult) {
    aiResult = deterministicResult;
  } else if (
    spokenText &&
    !spokenText.includes('?') &&
    !spokenText.includes('¿') &&
    !/\b(recomiendas|consejo|puedo|debo)\b/i.test(spokenText) &&
    DiscomfortManager.triageMessage(spokenText)
  ) {
    const report = DiscomfortManager.triageMessage(spokenText)!;
    const strategy = DiscomfortManager.evaluate(report);
    aiResult = {
      action: 'discomfort_report',
      discomfort_report: { ...report, strategy },
      reply_text: `🛡️ **Molestia Registrada: Nivel ${report.level} (${report.bodyPartId})**\n\n• **Recomendación:** ${strategy.recommendationsMarkdown}\n\n• **Ajuste:** ${strategy.training.warmupNote || 'Entrenamiento regular con calentamiento'}`,
      coach_tip: 'Graduamos la carga con proporcionalidad para que sigas entrenando con seguridad y sin dramatismo.',
    };
  } else {
    const snapshot = await getAppSnapshot(todayStr);
    aiResult = await parseWithGemini(
      spokenText,
      geminiKey,
      snapshot,
      audioBase64 && mimeType ? { base64: audioBase64, mimeType } : null
    );
  }

  let replyText = aiResult.reply_text || 'Entendido, Álvaro. Registrado en tu plan.';
  let coachTip = aiResult.coach_tip;
  let breakdownText = '';
  let dataSummary: any = null;

  // 3. Ejecución de la Acción
  switch (aiResult.action) {
    case 'log_multiple_dishes': {
      const dishes = (aiResult as any).multiple_dishes || [];
      const createdMeals: NutritionLog[] = [];

      for (let i = 0; i < dishes.length; i++) {
        const dish = dishes[i];
        const m: NutritionLog = {
          id: `nutri-${Date.now()}-${i}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          date: todayStr,
          meal_type: dish.mealType || 'Almuerzo',
          description: dish.description,
          calories: dish.calories,
          protein_g: dish.protein_g,
          carbs_g: dish.carbs_g,
          fat_g: dish.fat_g,
          raw_audio_transcription: spokenText,
        };
        mockStore.nutritionLogs.unshift(m);
        createdMeals.push(m);
      }

      if (isSupabaseConfigured && supabaseAdmin && createdMeals.length > 0) {
        try {
          await supabaseAdmin.from('nutrition_logs').insert(createdMeals);
        } catch (err) {
          console.warn('Fallo guardando múltiples comidas en Supabase:', err);
        }
      }

      dataSummary = {
        multipleMeals: createdMeals,
        count: createdMeals.length,
      };
      break;
    }

    case 'log_nutrition': {
      if (aiResult.nutrition) {
        const nutri = aiResult.nutrition;
        if (nutri.creatine_detected) toggleCreatine(true);

        const itemsToCalculate: WeighedItemInput[] =
          Array.isArray(nutri.items) && nutri.items.length > 0
            ? nutri.items
            : extractItemsFromText(nutri.description || spokenText);

        const explicitMacros = extractExplicitMacrosFromText(spokenText || nutri.description || '');
        const userHasExactMacros = nutri.user_explicit_macros || explicitMacros.hasExplicitMacros;

        let finalCalories = Number(nutri.calories) || 0;
        let finalProtein = Number(nutri.protein_g) || 0;
        let finalCarbs = Number(nutri.carbs_g) || 0;
        let finalFat = Number(nutri.fat_g) || 0;

        if (userHasExactMacros) {
          // PRIORIDAD 1: Si el atleta proporciona macros explícitos (Kcal, P, C, G),
          // PREVALECEN AL 100% y NUNCA se recalculan con el catálogo ni con estimaciones.
          if (explicitMacros.calories !== undefined) finalCalories = explicitMacros.calories;
          else if (nutri.calories !== undefined) finalCalories = Number(nutri.calories);

          if (explicitMacros.protein_g !== undefined) finalProtein = explicitMacros.protein_g;
          else if (nutri.protein_g !== undefined) finalProtein = Number(nutri.protein_g);

          if (explicitMacros.carbs_g !== undefined) finalCarbs = explicitMacros.carbs_g;
          else if (nutri.carbs_g !== undefined) finalCarbs = Number(nutri.carbs_g);

          if (explicitMacros.fat_g !== undefined) finalFat = explicitMacros.fat_g;
          else if (nutri.fat_g !== undefined) finalFat = Number(nutri.fat_g);

          breakdownText = `Macros exactos registrados: ${finalCalories} kcal | ${finalProtein}g P | ${finalCarbs}g HC | ${finalFat}g G`;
        } else if (itemsToCalculate.length > 0) {
          // Prioridad 2: Desglose aditivo determinista de ingredientes pesados con catálogo
          const calc = await calculateMealFromWeighedItems(itemsToCalculate);
          finalCalories = calc.totalCalories;
          finalProtein = calc.totalProtein;
          finalCarbs = calc.totalCarbs;
          finalFat = calc.totalFat;
          breakdownText = calc.formattedBreakdown;
        }

        const newMeal: NutritionLog = {
          id: `nutri-${Date.now()}`,
          timestamp: new Date().toISOString(),
          date: todayStr,
          meal_type: nutri.meal_type || 'Almuerzo',
          description: nutri.description || spokenText,
          calories: finalCalories,
          protein_g: finalProtein,
          carbs_g: finalCarbs,
          fat_g: finalFat,
          raw_audio_transcription: spokenText,
        };

        mockStore.nutritionLogs.unshift(newMeal);

        let newWater: WaterLog | null = null;
        if (nutri.water_ml > 0) {
          newWater = {
            id: `water-${Date.now()}`,
            timestamp: new Date().toISOString(),
            date: todayStr,
            amount_ml: nutri.water_ml,
          };
          mockStore.waterLogs.unshift(newWater);
        }

        if (isSupabaseConfigured && supabaseAdmin) {
          const writes: Promise<any>[] = [
            Promise.resolve(supabaseAdmin.from('nutrition_logs').insert([newMeal])),
          ];
          if (newWater) {
            writes.push(Promise.resolve(supabaseAdmin.from('water_logs').insert([newWater])));
          }
          try {
            await Promise.all(writes);
          } catch (err) {
            console.warn('Fallo guardando comida en Supabase, fallback a mockStore:', err);
          }
        }

        dataSummary = {
          meal: newMeal,
          breakdown: breakdownText,
        };

        replyText = `✅ **${newMeal.meal_type} Registrado**\n\n• **${finalCalories} kcal** | 🥩 **${finalProtein}g** Proteína | 🍚 **${finalCarbs}g** Carbohidratos | 🥑 **${finalFat}g** Grasa\n\n${breakdownText ? breakdownText + '\n\n' : ''}${replyText}`;
      }
      break;
    }

    case 'log_water': {
      const amount = Number(aiResult.water_ml) || 500;
      const newWater: WaterLog = {
        id: `water-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: todayStr,
        amount_ml: amount,
      };
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from('water_logs').insert([newWater]);
        } catch (err) {
          console.warn('Fallo guardando agua en Supabase, fallback a mockStore:', err);
        }
      }
      mockStore.waterLogs.unshift(newWater);
      dataSummary = { water_ml: amount };
      replyText = `💧 Registrados **+${amount} ml** de hidratación.`;
      break;
    }

    case 'log_weight': {
      const weightVal = Number(aiResult.weight_log?.weight_kg || aiResult.protocol_update?.new_weight_kg);
      if (weightVal && weightVal > 0) {
        updateWeight(weightVal);
        const newWeight: WeightLog = {
          id: `weight-${Date.now()}`,
          date: todayStr,
          timestamp: new Date().toISOString(),
          weight_kg: weightVal,
          notes: aiResult.weight_log?.notes || 'Registrado desde la app',
        };
        if (isSupabaseConfigured && supabaseAdmin) {
          try {
            await supabaseAdmin.from('weight_logs').insert([newWeight]);
          } catch (err) {
            console.warn('Fallo guardando peso en Supabase, fallback a mockStore:', err);
          }
        }
        mockStore.weightLogs.unshift(newWeight);
        dataSummary = { weight_kg: weightVal };
        replyText = `⚖️ Peso registrado en **${weightVal.toFixed(1)} kg**. Déficit calórico recalculado a **2.400 kcal**.`;
      }
      break;
    }

    case 'schedule_swap': {
      if (aiResult.schedule_swap) {
        const d1 = parseRelativeDate(aiResult.schedule_swap.date1, todayStr);
        const d2 = parseRelativeDate(aiResult.schedule_swap.date2, todayStr);
        const swapRes = await swapScheduleDays(d1, d2, aiResult.schedule_swap.notes);
        dataSummary = { swap: swapRes };
        replyText = `🔄 **Entrenamientos intercambiados** entre el **${d1}** y el **${d2}**.\nTu calendario y pasos objetivos se han actualizado automáticamente.`;
      }
      break;
    }

    case 'schedule_reassign': {
      if (aiResult.schedule_reassign) {
        const targetDate = parseRelativeDate(aiResult.schedule_reassign.date, todayStr);
        await setDayRoutineOverride(targetDate, aiResult.schedule_reassign.routine_key, aiResult.schedule_reassign.reason);
        dataSummary = { reassign: targetDate, routine: aiResult.schedule_reassign.routine_key };
        replyText = `⚡ **Sesión adaptada:** Asignada rutina **${aiResult.schedule_reassign.title || aiResult.schedule_reassign.routine_key}** al **${targetDate}**.`;
      }
      break;
    }

    case 'recalculate_today_nutrition': {
      const auditResult = await recalculateDayNutrition(todayStr);
      replyText = auditResult.summaryMessage;
      dataSummary = { audit: auditResult };
      break;
    }

    case 'discomfort_report': {
      const reportData = aiResult.discomfort_report;
      if (reportData) {
        const level = reportData.level || DiscomfortLevel.VERY_LIGHT;
        const bodyPartId = reportData.bodyPartId || 'articular';
        const notes = reportData.notes || spokenText;
        const strategy = reportData.strategy || DiscomfortManager.evaluate({
          id: `disc-${Date.now()}`,
          userId: 'alvaro-main',
          bodyPartId,
          level,
          notes,
          reportedAt: new Date(),
        });

        const newReport: DiscomfortReport = {
          id: `disc-${Date.now()}`,
          userId: 'alvaro-main',
          bodyPartId,
          level,
          notes,
          reportedAt: new Date(),
        };

        if (!mockStore.discomfortReports) {
          mockStore.discomfortReports = [];
        }
        mockStore.discomfortReports.unshift(newReport);
        mockStore.activeDiscomfort = newReport;

        if (isSupabaseConfigured && supabaseAdmin) {
          try {
            await supabaseAdmin.from('discomfort_reports').insert([{
              id: newReport.id,
              user_id: newReport.userId,
              body_part_id: newReport.bodyPartId,
              level: newReport.level,
              notes: newReport.notes,
              reported_at: (newReport.reportedAt || new Date()).toISOString(),
              strategy,
            }]);
          } catch (err) {
            console.warn('Fallo guardando molestia en Supabase, fallback a mockStore:', err);
          }
        }

        // Adaptación automática del calendario para hoy si nivel >= 2
        if (level === DiscomfortLevel.LIGHT) {
          await setDayRoutineOverride(todayStr, 'running_base', { notes: `Adaptado por molestia nivel 2 en ${bodyPartId}: CaCo conservador` });
        } else if (level === DiscomfortLevel.MODERATE) {
          await setDayRoutineOverride(todayStr, 'custom', { notes: `Adaptado por molestia nivel 3 en ${bodyPartId}: Isométricos Wall-sit y prensa` });
        } else if (level === DiscomfortLevel.MODERATE_HIGH) {
          await setDayRoutineOverride(todayStr, 'running_base', { notes: `Adaptado por molestia nivel 4 en ${bodyPartId}: Sin impacto (bici estática / elíptica)` });
        } else if (level >= DiscomfortLevel.HIGH) {
          await setDayRoutineOverride(todayStr, 'rest', { notes: `Reposo articular por molestia nivel ${level} en ${bodyPartId}` });
        }

        dataSummary = {
          report: newReport,
          strategy,
        };
      }
      replyText = aiResult.reply_text || replyText;
      break;
    }

    case 'log_typical_day': {
      const preset = TYPICAL_DAY_PRESETS[0];
      const existingToday = (mockStore.nutritionLogs || []).filter((m) => m.date === todayStr);
      const batchResult = await applyTypicalDayBatch(preset, existingToday, todayStr);

      if (batchResult.insertedMeals.length > 0) {
        mockStore.nutritionLogs.unshift(...batchResult.insertedMeals);
        if (isSupabaseConfigured && supabaseAdmin) {
          try {
            await supabaseAdmin.from('nutrition_logs').insert(batchResult.insertedMeals);
          } catch (err) {
            console.warn('Fallo guardando batch de comidas en Supabase:', err);
          }
        }
      }

      dataSummary = {
        batch: batchResult,
      };

      const skippedNote = batchResult.skippedMeals.length > 0
        ? `\n\n*(Omitidas por registro previo hoy: ${batchResult.skippedMeals.join(', ')})*`
        : '';

      replyText = `⚡ **Día Típico Cumplido Aplicado**\n\n• Insertadas **${batchResult.insertedMeals.length} comidas** del protocolo estándar (2.400 kcal / 202g Proteína).${skippedNote}`;
      break;
    }

    default:
      break;
  }

  // 4. Totales actualizados para refresco visual en tiempo real
  const updatedTotals = await getTodayNutritionTotals(todayStr);
  const targetCalories = activeProtocol.targets.calories || 2400;
  const targetProtein = activeProtocol.targets.proteinMax || 202;
  const remainingKcal = Math.max(0, targetCalories - updatedTotals.totalKcal);
  const todayRoutine = getTodayRoutine(todayStr);

  return {
    success: true,
    transcription: spokenText,
    isVoice,
    action: aiResult.action,
    replyText,
    coachTip,
    breakdownText,
    dataSummary,
    todayTotals: {
      calories: updatedTotals.totalKcal,
      caloriesRemaining: remainingKcal,
      caloriesTarget: targetCalories,
      protein_g: updatedTotals.totalProtein,
      proteinTarget_g: targetProtein,
      carbs_g: updatedTotals.totalCarbs,
      fat_g: updatedTotals.totalFat,
      water_ml: updatedTotals.totalWaterMl,
      waterTarget_ml: activeProtocol.targets.waterMl || 3000,
    },
    effectiveRoutine: todayRoutine,
  };
}
