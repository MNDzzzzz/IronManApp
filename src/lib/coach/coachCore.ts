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
  WeighedItemInput,
} from '@/lib/mercadonaNutrition';
import {
  getUserFrequentFoods,
  findUserFrequentFood,
  memorizeUserFood,
  extractExplicitMacrosFromText,
} from '@/lib/frequentFoodsManager';
import {
  swapScheduleDays,
  setDayRoutineOverride,
  resetDayRoutineOverride,
  getWeekSchedule,
} from '@/lib/scheduleManager';

// --------------------------------------------------------------------
// TIPOS DEL MOTOR DEL COACH
// --------------------------------------------------------------------

export interface UniversalAssistantResponse {
  action:
    | 'log_workout'
    | 'log_cardio'
    | 'log_nutrition'
    | 'log_water'
    | 'log_weight'
    | 'protocol_update'
    | 'query'
    | 'schedule_swap'
    | 'schedule_reassign'
    | 'gym_exercise_modification'
    | 'adjust_value'
    | 'set_value'
    | 'save_food_preference'
    | 'unknown';
  transcription?: string;
  workout?: any;
  cardio?: any;
  nutrition?: any;
  water_ml?: number;
  weight_log?: any;
  protocol_update?: any;
  schedule_swap?: any;
  schedule_reassign?: any;
  gym_exercise_modification?: any;
  adjust?: any;
  set_value?: any;
  save_food_preference?: any;
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
  // 1. Modelo especializado ultrarrápido
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              inline_data: {
                mime_type: audioData.mimeType,
                data: audioData.base64,
              },
            }],
          }],
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.audioTranscription?.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) return text.trim();
    }
  } catch (err) {
    console.warn('Aviso transcribiendo con gemini-3.5-transcribe:', err);
  }

  // 2. Modelos multimodales de respaldo
  const fallbackModels = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.0-flash'];
  for (const model of fallbackModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe este audio palabra por palabra en español sin inventar nada. Devuelve solo la transcripción literal exacta.' },
                {
                  inline_data: {
                    mime_type: audioData.mimeType,
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    } catch (err) {
      console.warn(`Aviso fallback audio ${model}:`, err);
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
  };
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

INSTRUCCIÓN DE SALIDA:
Analiza el mensaje o audio y responde EXCLUSIVAMENTE un objeto JSON válido con este esquema:
{
  "action": "log_nutrition" | "log_workout" | "log_cardio" | "log_water" | "log_weight" | "schedule_swap" | "schedule_reassign" | "query" | "protocol_update",
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

  const models = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const parts: any[] = [{ text: prompt }];
      if (audioData) {
        parts.push({
          inline_data: {
            mime_type: audioData.mimeType,
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
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }
    } catch (err) {
      console.warn(`Aviso Gemini ${model}:`, err);
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
  const geminiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6KDuJBXcLC6s3MNyV0Q2d_nWRoPPvJl-ICpuaXo_Bwuvw';
  const todayStr = getSpainTodayStr();

  let spokenText = text?.trim() || '';
  let isVoice = false;

  // 1. Si viene audio grabado, transcribir
  if (audioBase64 && mimeType) {
    isVoice = true;
    const transcribed = await transcribeAudioWithGemini({ base64: audioBase64, mimeType }, geminiKey);
    if (transcribed && transcribed.trim()) {
      spokenText = transcribed.trim();
    }
  }

  const snapshot = await getAppSnapshot(todayStr);

  // 2. Parsear con Gemini
  const aiResult = await parseWithGemini(
    spokenText,
    geminiKey,
    snapshot,
    audioBase64 && mimeType ? { base64: audioBase64, mimeType } : null
  );

  let replyText = aiResult.reply_text || 'Entendido, Álvaro. Registrado en tu plan.';
  let coachTip = aiResult.coach_tip;
  let breakdownText = '';
  let dataSummary: any = null;

  // 3. Ejecución de la Acción
  switch (aiResult.action) {
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
          if (explicitMacros.calories !== undefined) finalCalories = explicitMacros.calories;
          if (explicitMacros.protein_g !== undefined) finalProtein = explicitMacros.protein_g;
          if (explicitMacros.carbs_g !== undefined) finalCarbs = explicitMacros.carbs_g;
          if (explicitMacros.fat_g !== undefined) finalFat = explicitMacros.fat_g;
          breakdownText = `Macros dictados: ${finalCalories} kcal | ${finalProtein}g P | ${finalCarbs}g HC | ${finalFat}g G`;
        } else if (itemsToCalculate.length > 0) {
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

        if (isSupabaseConfigured && supabaseAdmin) {
          await supabaseAdmin.from('nutrition_logs').insert([newMeal]);
        }
        mockStore.nutritionLogs.unshift(newMeal);

        if (nutri.water_ml > 0) {
          const newWater: WaterLog = {
            id: `water-${Date.now()}`,
            timestamp: new Date().toISOString(),
            date: todayStr,
            amount_ml: nutri.water_ml,
          };
          if (isSupabaseConfigured && supabaseAdmin) {
            await supabaseAdmin.from('water_logs').insert([newWater]);
          }
          mockStore.waterLogs.unshift(newWater);
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
        await supabaseAdmin.from('water_logs').insert([newWater]);
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
          await supabaseAdmin.from('weight_logs').insert([newWeight]);
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
