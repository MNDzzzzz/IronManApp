// ====================================================================
// WEBHOOK TELEGRAM BOT: ASISTENTE INTEGRAL MULTIMODAL DE IRONMAN
// Permite enviar y consultar datos de TODA la aplicación por voz o texto:
// 1. Entrenamientos de fuerza (ejercicios, series, pesos, repeticiones, RPE)
// 2. Caminatas, carreras y sesiones de cardio
// 3. Nutrición, hidratación y suplementación (creatina)
// 4. Métricas de salud pasivas (Galaxy Fit3: sueño, pulsaciones, pasos, SpO2)
// 5. Consultas conversacionales y reportes 360° en tiempo real
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import {
  NutritionLog,
  WaterLog,
  WeightLog,
  GymExercise,
  GymWorkoutLog,
  StravaActivity,
  CardioActivity,
  DailyHealthMetric,
} from '@/types/database';
import {
  activeProtocol,
  updateWeight,
  setDayType,
  toggleCreatine,
  DayType,
} from '@/lib/nutritionProtocol';
import {
  getTodayRoutine,
  WEEKLY_ROUTINE,
  getHalfMarathonCountdown,
  getCurrentWeekNumber,
  getRunningProgressionForWeek,
  formatDailyScheduleMarkdown,
  formatWeeklyScheduleMarkdown,
  formatKneeRehabMarkdown,
  formatMenuMarkdown,
  formatPeriodizationMarkdown,
  formatSupplementsMarkdown,
  KNEE_CLINICAL_PROTOCOLS,
  STRUCTURED_MENU_2400,
  TARGET_HALF_MARATHON_DATE,
} from '@/lib/weeklyRoutine';

// --------------------------------------------------------------------
// 1. UTILIDAD: DESCARGA DE AUDIO DE TELEGRAM
// --------------------------------------------------------------------
async function downloadTelegramAudio(
  fileId: string,
  botToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resInfo = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!resInfo.ok) return null;
    const fileData = await resInfo.json();
    const filePath = fileData.result?.file_path;
    if (!filePath) return null;

    const resFile = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!resFile.ok) return null;

    const arrayBuffer = await resFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    let mimeType = 'audio/ogg';
    if (filePath.endsWith('.mp3')) mimeType = 'audio/mp3';
    else if (filePath.endsWith('.m4a')) mimeType = 'audio/m4a';
    else if (filePath.endsWith('.wav')) mimeType = 'audio/wav';
    else if (filePath.endsWith('.oga') || filePath.endsWith('.ogg')) mimeType = 'audio/ogg';

    return { base64, mimeType };
  } catch (err) {
    console.error('Error descargando audio de Telegram:', err);
    return null;
  }
}

/**
 * Descarga una foto enviada a Telegram con la máxima resolución disponible
 */
async function downloadTelegramPhoto(
  photos: any[],
  botToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (!photos || photos.length === 0) return null;
    // La última foto del array es siempre la de mayor resolución en Telegram
    const bestPhoto = photos[photos.length - 1];
    const fileId = bestPhoto.file_id;

    const resInfo = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!resInfo.ok) return null;
    const fileData = await resInfo.json();
    const filePath = fileData.result?.file_path;
    if (!filePath) return null;

    const resFile = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!resFile.ok) return null;

    const arrayBuffer = await resFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    let mimeType = 'image/jpeg';
    if (filePath.endsWith('.png')) mimeType = 'image/png';
    else if (filePath.endsWith('.webp')) mimeType = 'image/webp';

    return { base64, mimeType };
  } catch (err) {
    console.error('Error descargando foto de Telegram:', err);
    return null;
  }
}

/**
 * Analiza una captura de pantalla de Strava (resumen, parciales, gráfica de elevación)
 * utilizando Gemini Vision multimodal para extraer métricas y splits km a km.
 */
async function analyzeStravaScreenshotWithGemini(
  imageData: { base64: string; mimeType: string },
  userCaption: string,
  apiKey: string
): Promise<{
  is_cardio_screenshot: boolean;
  name?: string;
  type?: string;
  distance_km?: number;
  moving_time_seconds?: number;
  elapsed_time_seconds?: number;
  avg_pace_str?: string;
  elevation_gain_m?: number;
  calories?: number;
  avg_hr?: number;
  max_hr?: number;
  avg_cadence?: number;
  splits?: Array<{
    km: number;
    pace: string;
    time_seconds?: number;
    elevation_diff_m?: number;
    avg_hr?: number;
  }>;
  elevation_profile?: string;
  coach_assessment?: string;
} | null> {
  const visionModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const prompt = `
Eres un entrenador de atletismo, fisioterapeuta biomecánico y analista de telemetría deportiva para Álvaro (101 kg, en preparación para la Media Maratón del 28 de Febrero de 2027).
Analiza esta imagen (captura de pantalla de la app Strava, Garmin, Apple Fitness o similar) y el comentario adjunto si lo hay: "${userCaption || ''}".

Tu objetivo es extraer de forma estructurada y con la máxima precisión matemática:
1. Si la imagen es una sesión de carrera, rodaje, caminata o cardio (is_cardio_screenshot = true).
2. Título de la actividad: el nombre que aparece en Strava (ej: "Carrera matutina", "Rodaje suave CaCo") o un nombre adecuado.
3. Tipo: "Run" o "Walk".
4. Distancia en kilómetros (número float, ej: 4.82).
5. Tiempo en movimiento en segundos (ej: 26:40 -> 1600 segundos).
6. Ritmo medio en formato texto ("5:32 /km").
7. Desnivel positivo acumulado en metros (ej: 34).
8. Calorías quemadas (kcal).
9. Pulso medio (avg_hr) y pulso máximo (max_hr) si aparece en la captura o si Álvaro lo mencionó en el comentario/caption.
10. Cadencia media (ppm) si aparece o en el caption.
11. PARCIALES POR KILÓMETRO (SPLITS): Si la captura muestra la tabla o desglose de parciales km a km (ej: 1, 2, 3... con sus ritmos y desniveles), extrae CADA KILÓMETRO en el array "splits" con:
    - km: número del km (1, 2, 3...)
    - pace: string de ritmo ("5:40 /km")
    - elevation_diff_m: número si aparece (+/- metros)
    - avg_hr: número si aparece
12. ELEVATION_PROFILE: Si hay gráfica de desnivel o altimetría, describe en 1-2 frases el relieve (ej: "Subida progresiva en los km 1-3 (+25m) con posterior bajada suave").
13. COACH_ASSESSMENT: Análisis conciso enfocado en la prevención articular de Álvaro (101 kg: cuidar tendón rotuliano y cintilla iliotibial, valorar si el ritmo fue regular o progresivo, y recordar la meta de la Media Maratón del 28 Feb).

Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
{
  "is_cardio_screenshot": true,
  "name": "Rodaje Strava",
  "type": "Run",
  "distance_km": 5.0,
  "moving_time_seconds": 1650,
  "elapsed_time_seconds": 1700,
  "avg_pace_str": "5:30 /km",
  "elevation_gain_m": 20,
  "calories": 420,
  "avg_hr": 142,
  "max_hr": 158,
  "avg_cadence": 168,
  "splits": [
    { "km": 1, "pace": "5:38 /km", "elevation_diff_m": 5 },
    { "km": 2, "pace": "5:29 /km", "elevation_diff_m": -2 }
  ],
  "elevation_profile": "Perfil llano con ligero repecho en el km 1.",
  "coach_assessment": "Ritmo muy constante y controlado en Zona 2..."
}

Si la imagen NO es de deporte o carrera (por ejemplo, si es una foto de comida o texto irrelevante), devuelve:
{ "is_cardio_screenshot": false }
`.trim();

  for (const model of visionModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: imageData.mimeType,
                      data: imageData.base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`Error analizando captura con ${model}:`, err);
    }
  }

  return null;
}

/**
 * Transcribe un audio recibido de Telegram de forma ultrarrápida y precisa utilizando
 * el modelo especializado gemini-3.5-transcribe (latencia ~1.2s), con respaldo en gemini-flash-lite.
 */
async function transcribeAudioWithGemini(
  audioData: { base64: string; mimeType: string },
  apiKey: string
): Promise<string | null> {
  // 1. Modelo dedicado especializado en transcripción de audio (ultra-baja latencia y máxima fidelidad)
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
    console.warn('Error en transcripción con gemini-3.5-transcribe:', err);
  }

  // 2. Fallback a modelos ligeros de generación multimodal
  const fallbackModels = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
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
                { text: 'Transcribe este audio palabra por palabra en español sin inventar nada. Devuelve solo la transcripción literal.' },
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
      console.warn(`Error en fallback de audio con ${model}:`, err);
    }
  }

  return null;
}

// --------------------------------------------------------------------
// 2. UTILIDAD: ENVÍO DE MENSAJES A TELEGRAM
// --------------------------------------------------------------------
async function sendTelegramMessage(chatId: number, messageText: string, botToken: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn('Fallo Telegram con Markdown, reintentando como texto plano:', errBody);
      // Reintento en texto plano si falló por entidades Markdown
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
        }),
      });
    }
  } catch (e) {
    console.error('Error enviando mensaje de Telegram:', e);
  }
}

// --------------------------------------------------------------------
// 3. CAPTURA DEL ESTADO COMPLETO DE LA APP (SNAPSHOT PARA GEMINI)
// --------------------------------------------------------------------
async function getAppSnapshot(todayStr: string) {
  let latestHealth = mockStore.dailyMetrics[0] || null;
  let todayMeals = mockStore.nutritionLogs.filter((m) => m.date === todayStr);
  let todayWater = mockStore.waterLogs.filter((w) => w.date === todayStr);
  let todayGymLogs = mockStore.gymLogs.filter((l) => l.date === todayStr);
  let recentActivities = mockStore.stravaActivities.slice(0, 3);
  let recentWeights = mockStore.weightLogs || [];

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const [mealsRes, waterRes, gymRes, weightsRes, activitiesRes, healthRes] = await Promise.all([
        supabaseAdmin.from('nutrition_logs').select('*').eq('date', todayStr),
        supabaseAdmin.from('water_logs').select('*').eq('date', todayStr),
        supabaseAdmin.from('gym_workout_logs').select('*, gym_exercises(name, category)').eq('date', todayStr),
        supabaseAdmin.from('weight_logs').select('*').order('date', { ascending: false }).limit(6),
        supabaseAdmin.from('strava_activities').select('*').order('start_date', { ascending: false }).limit(3),
        supabaseAdmin.from('daily_health_metrics').select('*').order('date', { ascending: false }).limit(1),
      ]);

      if (mealsRes.data && mealsRes.data.length > 0) todayMeals = mealsRes.data;
      if (waterRes.data && waterRes.data.length > 0) todayWater = waterRes.data;
      if (gymRes.data && gymRes.data.length > 0) todayGymLogs = gymRes.data;
      if (weightsRes.data && weightsRes.data.length > 0) recentWeights = weightsRes.data;
      if (activitiesRes.data && activitiesRes.data.length > 0) recentActivities = activitiesRes.data;
      if (healthRes.data && healthRes.data.length > 0) latestHealth = healthRes.data[0];
    } catch (err) {
      console.warn('Aviso sincronizando snapshot desde Supabase:', err);
    }
  }

  const routineToday = getTodayRoutine(todayStr);
  const halfMarathon = getHalfMarathonCountdown(todayStr);
  const currentWeekNumber = getCurrentWeekNumber(todayStr);
  const runningWeekPlan = getRunningProgressionForWeek(currentWeekNumber);

  const totalKcal = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProt = todayMeals.reduce((acc, m) => acc + m.protein_g, 0);
  const totalCarbs = todayMeals.reduce((acc, m) => acc + m.carbs_g, 0);
  const totalFat = todayMeals.reduce((acc, m) => acc + m.fat_g, 0);
  const totalWaterMl = todayWater.reduce((acc, w) => acc + w.amount_ml, 0);

  const actualSteps = latestHealth?.total_steps || null;
  let stepsAnalysis = 'Sin datos de pasos hoy';
  if (actualSteps !== null) {
    if (routineToday.category === 'Descanso' && actualSteps > routineToday.targetSteps.max) {
      stepsAnalysis = `ALERTA CLÍNICA: Llevas ${actualSteps.toLocaleString()} pasos en día de descanso (máx recomendado: ${routineToday.targetSteps.max.toLocaleString()}). Recorta pasos para permitir la desinflamación tendinosa.`;
    } else if (actualSteps >= routineToday.targetSteps.min) {
      stepsAnalysis = `Objetivo de pasos cumplido (${actualSteps.toLocaleString()} pasos / rango ${routineToday.targetSteps.min.toLocaleString()}-${routineToday.targetSteps.max.toLocaleString()}).`;
    } else {
      stepsAnalysis = `Pasos acumulados: ${actualSteps.toLocaleString()} (objetivo de hoy: ${routineToday.targetSteps.min.toLocaleString()}-${routineToday.targetSteps.max.toLocaleString()}).`;
    }
  }

  return {
    today: todayStr,
    day_name: routineToday.dayName,
    athlete: {
      name: activeProtocol.athleteName,
      weight_kg: activeProtocol.weightKg,
      current_day_type: routineToday.dayType,
      targets: {
        ...activeProtocol.targets,
        calories: routineToday.nutritionStrategy.calorieTarget,
        waterMl: routineToday.nutritionStrategy.waterLiters * 1000,
      },
    },
    current_week_number: currentWeekNumber,
    running_week_plan: {
      week: currentWeekNumber,
      phase: runningWeekPlan.phase,
      phase_name: runningWeekPlan.phaseName,
      thursday_session: runningWeekPlan.thursdaySession,
      thursday_km: runningWeekPlan.thursdayKm,
      sunday_session: runningWeekPlan.sundaySession,
      sunday_km: runningWeekPlan.sundayKm,
      goal: runningWeekPlan.physiologicalGoal,
    },
    target_steps_today: {
      min: routineToday.targetSteps.min,
      max: routineToday.targetSteps.max,
      note: routineToday.targetSteps.note,
      actual_fit3_steps: actualSteps,
      analysis: stepsAnalysis,
    },
    clinical_knee_guidelines: {
      quadriceps_tendon: KNEE_CLINICAL_PROTOCOLS.tendon_cuadricipital,
      tuberculo_gerdy: KNEE_CLINICAL_PROTOCOLS.tuberculo_gerdy_perone,
      running_technique: KNEE_CLINICAL_PROTOCOLS.running_technique,
    },
    joint_supplements: routineToday.supplements,
    structured_menu_2400: STRUCTURED_MENU_2400,
    scheduled_routine_today: {
      day: routineToday.dayName,
      title: routineToday.title,
      category: routineToday.category,
      description: routineToday.description,
      exercises: routineToday.workoutSummary,
      warmup: routineToday.warmup,
      stretches: routineToday.stretches,
      nutrition_strategy: routineToday.nutritionStrategy,
      supplements: routineToday.supplements,
      half_marathon_impact: routineToday.halfMarathonImpact,
    },
    half_marathon_countdown: {
      target_date: TARGET_HALF_MARATHON_DATE,
      days_left: halfMarathon.daysRemaining,
      weeks_left: halfMarathon.weeksRemaining,
      extra_days: halfMarathon.extraDays,
      week_number: currentWeekNumber,
      phase: halfMarathon.currentPhase,
      phase_description: halfMarathon.phaseDescription,
      today_focus: halfMarathon.keyFocusToday,
    },
    weight_tracking: {
      current_weight_kg: activeProtocol.weightKg,
      initial_weight_kg: recentWeights[recentWeights.length - 1]?.weight_kg || 102.5,
      total_lost_kg: Number(
        (activeProtocol.weightKg - (recentWeights[recentWeights.length - 1]?.weight_kg || 102.5)).toFixed(2)
      ),
      recent_logs: recentWeights.map(
        (w) => `${w.date}: ${w.weight_kg} kg (${w.notes || 'Antes de cenar, después de entrenar'})`
      ),
    },
    health: latestHealth
      ? {
          sleep_hours: latestHealth.sleep_duration_minutes
            ? (latestHealth.sleep_duration_minutes / 60).toFixed(1)
            : 'N/A',
          sleep_score: latestHealth.sleep_score,
          resting_hr: latestHealth.resting_hr,
          spo2_avg: latestHealth.spo2_avg,
          steps: latestHealth.total_steps,
          active_calories: latestHealth.active_calories,
        }
      : null,
    nutrition: {
      meals_count: todayMeals.length,
      calories: totalKcal,
      protein_g: totalProt,
      carbs_g: totalCarbs,
      fat_g: totalFat,
      water_ml: totalWaterMl,
      creatine_taken: activeProtocol.targets.creatineTakenToday,
      meals: todayMeals.map((m) => `${m.meal_type}: ${m.description} (${m.calories} kcal, ${m.protein_g}g P)`),
    },
    gym_workout: {
      available_routine_exercises: mockStore.gymExercises.map((e) => ({
        day: e.day,
        name: e.name,
        target: `${e.target_sets || 3}x ${e.target_reps || '8-10'}`,
        current_weight: `${e.current_weight_kg || 0} kg`,
        notes: e.notes,
      })),
      sets_logged_today: todayGymLogs.length,
      logs: todayGymLogs.map((l) => {
        const exName = (l as any).gym_exercises?.name || mockStore.gymExercises.find((e) => e.id === l.exercise_id)?.name || 'Ejercicio';
        return `${exName}: Serie ${l.set_number} -> ${l.reps} reps @ ${l.weight_kg} kg (RPE ${l.rpe || 'N/A'})`;
      }),
    },
    cardio_activities: recentActivities.map((a) => ({
      name: a.name,
      type: a.type,
      distance_km: (a.distance / 1000).toFixed(2),
      time_min: Math.round(a.elapsed_time / 60),
      avg_hr: a.avg_hr,
    })),
  };
}

// --------------------------------------------------------------------
// 4. MOTOR MULTIMODAL CON GEMINI FLASH (PARSER Y ENRUTADOR UNIVERSAL)
// --------------------------------------------------------------------
interface UniversalAssistantResponse {
  action: 'log_workout' | 'log_cardio' | 'log_nutrition' | 'query' | 'protocol_update' | 'adjust_value' | 'set_value' | 'log_weight';
  transcription?: string;
  // Para sumar o restar valores de la app
  adjust?: {
    metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g';
    delta: number; // Positivo para sumar, negativo para restar (ej: -200, +500)
    reason?: string;
  };
  // Para fijar o resetear un total absoluto de la app
  set_value?: {
    metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g';
    target_value: number; // Valor absoluto final deseado para hoy (ej: 3000 para agua en ml, 2500 para calorías)
    reason?: string;
  };
  // Para pesaje y control de peso
  weight_log?: {
    weight_kg: number;
    notes?: string;
    date?: string;
  };
  // Para nutrición
  nutrition?: {
    meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
    description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
    creatine_detected: boolean;
  };
  // Para entrenamiento de fuerza
  workout?: {
    title: string;
    exercises: Array<{
      name: string;
      category: 'Pecho' | 'Espalda' | 'Pierna' | 'Hombro' | 'Brazo' | 'Core';
      sets: Array<{
        set_number: number;
        reps: number;
        weight_kg: number;
        rpe?: number;
      }>;
    }>;
  };
  // Para cardio / caminatas / carreras
  cardio?: {
    name: string;
    type: 'Run' | 'Walk' | 'Ride';
    distance_km: number;
    duration_minutes: number;
    avg_hr?: number;
  };
  // Para actualización de protocolo
  protocol_update?: {
    new_weight_kg?: number;
    new_day_type?: DayType;
    creatine_taken?: boolean;
  };
  // Respuesta conversacional directa / feedback del coach
  reply_text?: string;
  coach_tip?: string;
}

async function processWithGemini(
  textOrHint: string,
  apiKey: string,
  snapshot: any,
  audioData?: { base64: string; mimeType: string } | null
): Promise<UniversalAssistantResponse> {
  const prompt = `
Eres el Entrenador de Alto Rendimiento, Biomecánico y Fisioterapeuta Deportivo Personal de Álvaro para IronManApp.
Tu misión es guiarlo hacia el máximo nivel físico, mental y nutricional para cruzar la meta de la MEDIA MARATÓN (21,097 KM) el 28 de Febrero de 2027 sin dolor articular y con una recomposición corporal exitosa.

PERFIL Y FILOSOFÍA CLÍNICA DEL ATLETA:
• Atleta: Álvaro (101,0 kg exactos | Target 28-Feb: 85 - 88 kg).
• Test 5K previo: 6:52 min/km (34:20 min). Gran fondo cardiovascular, pero 6:52 es demasiado rápido para rodar a diario con molestias.
• Ritmo de rodajes aeróbicos: 7:15 – 7:35 min/km (Zona 2). Ritmo Media Maratón: 6:40 – 6:55 min/km.
• Actividad base: NEAT muy elevado (>10.000 pasos/día). Gasto real (TDEE): 2.900 - 3.000 kcal.
• Nutrición científica: 2.400 kcal/día (déficit controlado de ~500-600 kcal), 202 g proteína (2 g/kg), ~230 g carbohidratos, 75 g grasas saludables, 3.5 - 4.0 L agua.

DIAGNÓSTICO ARTICULAR Y PROTOCOLOS DE REHABILITACIÓN:
1. Alerta de carga: Pasar de 3,5 a 5 km continuos supuso un salto de volumen del +43%. Con 101 kg, esto somete a los tendones a unas 4.500 frenadas violentas. No está lesionado, está inflamado por tracción mecánica.
2. Pinchazo por encima de la rótula izquierda (Tendón Cuadricipital):
   - Causa: Sobrecarga excéntrica por frenado repetitivo con 101 kg.
   - Solución: Wall-sits (sentadilla isométrica apoyado en pared a 60-70° de flexión, 4x35-45s) para provocar analgesia tendinosa inmediata. Masaje en cuádriceps sin tocar la rótula. Frío local 10 min post-carrera.
3. Dolor lateral externo bajo rótula bilateral (Tubérculo de Gerdy & Cabeza del Peroné):
   - Causa: Inserción de la cintilla iliotibial / bíceps femoral sometida a tracción por rotación interna.
   - Solución: Liberar con pelota o rodillo el TENSOR DE LA FASCIA LATA (muslo lateral alto y glúteo). ¡REGLA DE ORO! Jamás masajear directamente sobre el hueso inflamado. Fortalecer glúteo medio (abducciones y clamshell).
4. Ajuste clave de técnica de carrera:
   - Cadencia alta (~165-172 pasos por minuto): pasos más cortos y rápidos.
   - Apoyo siempre DEBAJO del centro de gravedad (debajo de la cadera), jamás frenando de talón adelantado.
5. Gestión de pasos:
   - Días de gimnasio (Lun/Mar/Vie): 10.000 - 11.500 pasos.
   - Días de carrera (Jue/Dom): 12.000 - 15.000 pasos (por superficies blandas/llanas).
   - Días de descanso (Mié/Sáb): 8.000 - 9.000 pasos. Si en snapshot ves más de 10.000 pasos en día de descanso, dale un toque de atención clínico para que descanse y desinflame.

MICROCICLO SEMANAL FIJO:
• LUNES: Fuerza Torso (Empuje + Tirón: press banca mancuernas, remo, militar, jalón neutro, face pulls, bíceps+tríceps). Cero estrés en rodilla.
• MARTES: Fuerza Pierna Blindada (Anti-Impacto) + Core: Wall-sits 4x35-45s, abducción cadera banda 4x15, puente glúteo unilateral 3x10/pierna, gemelos excéntricos lentos 3s 4x15, tibial anterior 3x15, planchas.
• MIÉRCOLES: Descanso Total (Regeneración profunda y descompresión tendinosa. Cero impacto deportivo).
• JUEVES: Carrera Rodaje Base (Volumen suave controlado CaCo a ritmo >7:15 min/km).
• VIERNES: Fuerza Funcional + Cardio de Descarga: Peso muerto rumano 3x10, clamshell banda 3x15/lado, press inclinado/flexiones, remo unilateral, paseo del granjero + 20 min bici estática sillín alto muy suave.
• SÁBADO: Descanso Total 100% (Desconexión y carga óptima de glucógeno para el domingo).
• DOMINGO: Tirada Larga Semanal CaCo progresivo (Zona 2 controlada 7:15-7:35 min/km).

SUPLEMENTACIÓN ESTRATÉGICA:
• Creatina monohidrato: 5 g diarios en la merienda con agua.
• Omega-3: 2 g EPA/DHA diarios en la cena (reduce inflamación activa en tubérculo de Gerdy y rotuliano).
• Colágeno hidrolizado + Vitamina C: 30-45 min ANTES de salir a rodar o de hacer pierna.
• Cafeína pre-entreno: 150-250 mg 45 min antes de los rodajes del jueves y domingo.

ESTADO ACTUAL DE LA APP EN VIVO (TELEMETRÍA REAL):
${JSON.stringify(snapshot, null, 2)}

INSTRUCCIONES DE CLASIFICACIÓN Y ACCIÓN:
1. Si Álvaro pide SUMAR o RESTAR valores numéricos a las métricas del día (ej: "Réstame 200 calorías", "Quita 300 kcal", "Suma 500 ml de agua", "Añade 25g de proteína"):
   - Pon "action": "adjust_value".
   - Rellena "adjust": "metric", "delta" (positivo o negativo), "reason".

1.b. Si Álvaro pide FIJAR, CAMBIAR, SOBRESCRIBIR o RESETEAR el TOTAL ACUMULADO de una métrica para hoy (ej: "cambia los 13 L de agua a 3.8L", "he bebido 4L de agua hoy", "fija las calorías en 2400"):
   - Pon "action": "set_value".
   - Rellena "set_value": "metric", "target_value", "reason".

2. Si Álvaro comunica su PESO CORPORAL (ej: "Hoy peso 100.5 kg", "He pesado 100.8 antes de cenar"):
   - Pon "action": "log_weight".
   - Rellena "weight_log": "weight_kg", "notes": "Antes de cenar, después de entrenar".

3. Si Álvaro describe un entrenamiento de fuerza realizado:
   - Pon "action": "log_workout".
   - Desglosa ejercicios, series, repeticiones, peso en kg y RPE.

4. Si Álvaro describe una sesión de cardio, carrera o caminata:
   - Pon "action": "log_cardio".
   - Extrae distancia en km, duración en min y tipo ("Run" o "Walk").

5. Si Álvaro describe una comida o bebida ingerida:
   - Pon "action": "log_nutrition".
   - Extrae calorías, macros (P/C/G), agua en ml y si tomó creatina.

6. Si Álvaro hace CUALQUIER PREGUNTA, CONSULTA CIENTÍFICA, TÉCNICA O CURIOSIDAD DEPORTIVA:
   - Aplica tanto a preguntas sobre sus métricas en la app como a dudas de fisiología del ejercicio, calzado y zapatillas de running (drop, amortiguación, placas), zonas de entrenamiento, VDOT, nutrición deportiva avanzada, suplementos, biomecánica o recuperación que estén FUERA de los datos de la app.
   - Pon "action": "query".
   - Actúa como su Head Coach, Biomecánico y Fisioterapeuta Deportivo. Responde en "reply_text" con rigor científico, empatía pedagógica y enfoque práctico, contextualizando siempre para su perfil actual (101 kg hacia 85-88 kg, cuidando al máximo la salud de sus rodillas rumbo a la Media Maratón del 28 de Febrero de 2027).
   - Si menciona DOLOR o MOLESTIA EN LA RODILLA: Identifica si es el tendón cuadricipital (arriba de la rótula) o tubérculo de Gerdy/peroné (lateral externo). Prescribe de inmediato el protocolo terapéutico exacto (Wall-sits isométricos o liberación del tensor de la fascia lata sin tocar el hueso) y recomiéndale pasar a CaCo o bajar ritmo.
   - Si pregunta QUÉ LE TOCA HOY o QUÉ ENTRENAR: Explica la sesión del día del microciclo, los ejercicios exactos, los pasos recomendados y el objetivo de la semana ${snapshot.current_week_number || 1} de la periodización de 22 semanas.
   - Si pregunta QUÉ COMER o RECETAS: Guíale con su menú estructurado de 2.400 kcal (huevos/avena/plátano en desayuno; pollo/ternera con arroz/patata y verdura en comida; queso fresco batido con whey y nueces en merienda; salmón/merluza con patata y verduras en cena).
   - Si pregunta por PASOS o DESCANSO: Revisa los pasos actuales de su Galaxy Fit3 en el snapshot y felicítalo o dale un toque de atención si está caminando de más en día de descanso.

7. Si Álvaro pide actualizar tipo de día o reglas (ej: "hoy descanso", "tómate la creatina"):
   - Pon "action": "protocol_update".

8. Si se adjunta un audio, escúchalo con máxima atención y transcribe todo en "transcription".
9. Añade siempre un consejo de entrenador o fisioterapeuta de alto nivel en "coach_tip".

Mensaje escrito (si aplica): "${textOrHint}"

DEVUELVE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTE FORMATO EXACTO (sin markdown ni texto alrededor):
{
  "action": "log_workout" | "log_cardio" | "log_nutrition" | "query" | "protocol_update" | "adjust_value" | "set_value" | "log_weight",
  "transcription": "transcripción literal",
  "adjust": {
    "metric": "calories" | "water_ml" | "protein_g" | "carbs_g" | "fat_g",
    "delta": -200,
    "reason": "Corrección de calorías"
  },
  "set_value": {
    "metric": "water_ml",
    "target_value": 3000,
    "reason": "Fijar agua diaria en 3L"
  },
  "weight_log": {
    "weight_kg": 101.0,
    "notes": "Antes de cenar, después de entrenar"
  },
  "nutrition": {
    "meal_type": "Desayuno" | "Almuerzo" | "Cena" | "Snack",
    "description": "texto descriptivo",
    "calories": 0,
    "protein_g": 0.0,
    "carbs_g": 0.0,
    "fat_g": 0.0,
    "water_ml": 0,
    "creatine_detected": false
  },
  "workout": {
    "title": "Entrenamiento de Pecho",
    "exercises": [
      {
        "name": "Press de Banca con Barra",
        "category": "Pecho",
        "sets": [
          { "set_number": 1, "reps": 10, "weight_kg": 70, "rpe": 7 }
        ]
      }
    ]
  },
  "cardio": {
    "name": "Caminata de Tarde",
    "type": "Walk" | "Run",
    "distance_km": 5.0,
    "duration_minutes": 45
  },
  "protocol_update": {
    "new_weight_kg": 101.0,
    "new_day_type": "running" | "strength" | "rest_refeed",
    "creatine_taken": true
  },
  "reply_text": "Respuesta conversacional si fue una pregunta",
  "coach_tip": "Consejo técnico del entrenador"
}
`;

  // Modelos estables y prioritarios de Gemini Flash
  const models = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
  ];

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
        const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    } catch (err) {
      console.warn(`Error llamando a Gemini ${model}:`, err);
    }
  }

  // Fallback heurístico inteligente
  const lowerHint = (textOrHint || '').toLowerCase();
  const isQuestion =
    lowerHint.includes('?') ||
    lowerHint.includes('¿') ||
    lowerHint.includes('qué') ||
    lowerHint.includes('que') ||
    lowerHint.includes('cómo') ||
    lowerHint.includes('como') ||
    lowerHint.includes('por qué') ||
    lowerHint.includes('cuál') ||
    lowerHint.includes('cuanto') ||
    lowerHint.includes('cuánto') ||
    lowerHint.includes('duele') ||
    lowerHint.includes('rodilla') ||
    lowerHint.includes('dolor') ||
    lowerHint.includes('opinas') ||
    lowerHint.includes('puedo') ||
    lowerHint.includes('recomiendas') ||
    lowerHint.includes('consejo');

  if (isQuestion) {
    let reply = `Álvaro, como tu Head Coach y Fisioterapeuta Deportivo:`;
    if (lowerHint.includes('rodilla') || lowerHint.includes('dolor') || lowerHint.includes('duele')) {
      reply += `\n\nSi la molestia es encima de la rótula (tendón cuadricipital), haz 4 series de Wall-sits isométricos de 35-45s y aplica frío. Si es lateral externo (tubérculo de Gerdy), libera el tensor de la fascia lata con rodillo (¡jamás sobre el hueso!). Para tu próxima carrera, usa bloques CaCo (>7:15 min/km) y cadencia 165-172 ppm.`;
    } else {
      reply += `\n\nHe recibido tu consulta sobre "${textOrHint}". Todo tu plan está enfocado a llegar al máximo a la Media Maratón del 28 de febrero de 2027 protegiendo tus articulaciones con 101 kg. Mantén el déficit a 2.400 kcal, 202 g de proteína y respeta los descansos programados.`;
    }
    return {
      action: 'query',
      transcription: textOrHint,
      reply_text: reply,
      coach_tip: 'Prioriza siempre la longevidad articular y la constancia sobre la intensidad puntual.',
    };
  }

  // Detección de alimentos para estimación aproximada de respaldo si la IA fallara
  const hasFoodClues =
    lowerHint.includes('desayun') ||
    lowerHint.includes('comid') ||
    lowerHint.includes('almuerz') ||
    lowerHint.includes('cen') ||
    lowerHint.includes('meriend') ||
    lowerHint.includes('snack') ||
    lowerHint.includes('pollo') ||
    lowerHint.includes('arroz') ||
    lowerHint.includes('huevo') ||
    lowerHint.includes('avena') ||
    lowerHint.includes('pan') ||
    lowerHint.includes('pescado') ||
    lowerHint.includes('carne') ||
    lowerHint.includes('leche') ||
    lowerHint.includes('yogur') ||
    lowerHint.includes('whey') ||
    lowerHint.includes('fruta') ||
    lowerHint.includes('plátano') ||
    lowerHint.includes('manzana') ||
    lowerHint.includes('gramos') ||
    lowerHint.includes(' kcal') ||
    lowerHint.includes('calor');

  if (hasFoodClues) {
    let mealType: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack' = 'Almuerzo';
    const hour = new Date().getHours();
    if (lowerHint.includes('desayun') || hour < 12) mealType = 'Desayuno';
    else if (lowerHint.includes('cen') || hour >= 20) mealType = 'Cena';
    else if (lowerHint.includes('meriend') || lowerHint.includes('snack')) mealType = 'Snack';

    let calories = 350;
    let protein = 25;
    let carbs = 35;
    let fat = 10;
    let waterMl = 0;

    if (lowerHint.includes('pollo') || lowerHint.includes('ternera') || lowerHint.includes('atún') || lowerHint.includes('salmón')) {
      protein += 25;
      calories += 120;
    }
    if (lowerHint.includes('arroz') || lowerHint.includes('pasta') || lowerHint.includes('patata') || lowerHint.includes('avena')) {
      carbs += 30;
      calories += 130;
    }
    if (lowerHint.includes('huevo')) {
      protein += 14;
      fat += 10;
      calories += 150;
    }
    if (lowerHint.includes('aceite') || lowerHint.includes('aove') || lowerHint.includes('queso') || lowerHint.includes('nueces')) {
      fat += 12;
      calories += 110;
    }
    if (lowerHint.includes('agua') || lowerHint.includes('litro') || lowerHint.includes('vaso')) {
      if (lowerHint.includes('litro')) waterMl = 1000;
      else if (lowerHint.includes('2 vasos') || lowerHint.includes('dos vasos')) waterMl = 500;
      else waterMl = 250;
    }

    return {
      action: 'log_nutrition',
      transcription: textOrHint,
      nutrition: {
        meal_type: mealType,
        description: textOrHint,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        water_ml: waterMl,
        creatine_detected: lowerHint.includes('creatina'),
      },
      coach_tip: 'Registrado con análisis heurístico de respaldo.',
    };
  }

  // Si no es comida ni pregunta clara, responder como coach para no inventar datos falsos
  return {
    action: 'query',
    transcription: textOrHint,
    reply_text: `Álvaro, he recibido tu mensaje: "${textOrHint}".\n\nNo he identificado una comida o ejercicio concreto. Recuerda que puedes dictarme tus comidas, series de gimnasio, kilómetros de carrera o hacerme cualquier consulta técnica sobre tu preparación.`,
    coach_tip: 'Cuidando tus rodillas y tu progreso hacia la Media Maratón del 28 de febrero de 2027.',
  };
}

// --------------------------------------------------------------------
// 5. MANEJADOR DE ACCIÓN: GUARDAR ENTRENAMIENTO DE FUERZA (GYM)
// --------------------------------------------------------------------
async function handleSaveGymWorkout(workoutData: any, todayStr: string) {
  const exercises = workoutData.exercises || [];
  let totalVolumeKg = 0;
  let totalSets = 0;
  const savedSummaries: string[] = [];

  for (const exData of exercises) {
    // 1. Buscar ejercicio existente o crearlo
    let existingEx = mockStore.gymExercises.find(
      (e) => e.name.toLowerCase() === exData.name.toLowerCase() || exData.name.toLowerCase().includes(e.name.toLowerCase())
    );

    if (!existingEx) {
      existingEx = {
        id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: exData.name,
        category: exData.category || 'Pecho',
        is_stretch: false,
      };
      mockStore.gymExercises.push(existingEx);
      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.from('gym_exercises').insert([existingEx]);
      }
    }

    const sets = exData.sets || [];
    const setSummaries: string[] = [];

    for (const setData of sets) {
      totalSets++;
      const reps = Number(setData.reps) || 8;
      const weight = Number(setData.weight_kg) || 0;
      totalVolumeKg += reps * weight;

      const newLog: GymWorkoutLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: todayStr,
        exercise_id: existingEx.id,
        set_number: Number(setData.set_number) || sets.indexOf(setData) + 1,
        reps,
        weight_kg: weight,
        rpe: setData.rpe ? Number(setData.rpe) : undefined,
        created_at: new Date().toISOString(),
      };

      mockStore.gymLogs.push(newLog);
      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.from('gym_workout_logs').insert([newLog]);
      }

      setSummaries.push(`S${newLog.set_number}: ${reps}r @ ${weight}kg${newLog.rpe ? ` (RPE ${newLog.rpe})` : ''}`);
    }

    savedSummaries.push(`• *${existingEx.name}:*\n  └ ${setSummaries.join(' | ')}`);
  }

  return {
    totalVolumeKg,
    totalSets,
    savedSummaries,
  };
}

// --------------------------------------------------------------------
// 6. MANEJADOR DE ACCIÓN: GUARDAR ACTIVIDAD CARDIO (RUN / WALK)
// --------------------------------------------------------------------
async function handleSaveCardio(cardioData: any, todayStr: string) {
  const distMeters = Math.round((Number(cardioData.distance_km) || 5) * 1000);
  const durationSec = Math.round(
    Number(cardioData.moving_time_seconds) ||
      (Number(cardioData.duration_minutes) ? Number(cardioData.duration_minutes) * 60 : 1800)
  );
  const paceSecondsPerKm = distMeters > 0 ? durationSec / (distMeters / 1000) : 300;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.round(paceSecondsPerKm % 60);
  const calculatedPaceStr = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds} min/km`;
  const paceStr = cardioData.avg_pace_str || calculatedPaceStr;

  const newActivity: CardioActivity = {
    id: Date.now(),
    name: cardioData.name || (cardioData.type === 'Run' ? 'Rodaje Strava' : 'Caminata Activa'),
    type: cardioData.type || 'Run',
    start_date: cardioData.start_date || `${todayStr}T18:00:00Z`,
    elapsed_time: Number(cardioData.elapsed_time_seconds) || durationSec,
    moving_time: durationSec,
    distance: distMeters,
    total_elevation_gain: Number(cardioData.elevation_gain_m) || Number(cardioData.total_elevation_gain) || 15.0,
    avg_hr: cardioData.avg_hr || 142,
    max_hr: cardioData.max_hr || (cardioData.avg_hr ? cardioData.avg_hr + 14 : 156),
    avg_cadence: cardioData.avg_cadence || 168,
    calories: cardioData.calories || Math.round((distMeters / 1000) * 85),
    splits: cardioData.splits || [],
    elevation_profile: cardioData.elevation_profile || '',
    source: cardioData.source || 'strava_screenshot',
    notes: cardioData.notes || cardioData.coach_assessment || 'Registrado mediante captura de Strava en Telegram.',
    created_at: new Date().toISOString(),
  };

  mockStore.stravaActivities.unshift(newActivity);
  if (isSupabaseConfigured && supabaseAdmin) {
    await supabaseAdmin.from('strava_activities').insert([
      {
        id: newActivity.id,
        name: newActivity.name,
        type: newActivity.type,
        start_date: newActivity.start_date,
        elapsed_time: newActivity.elapsed_time,
        moving_time: newActivity.moving_time,
        distance: newActivity.distance,
        total_elevation_gain: newActivity.total_elevation_gain,
        avg_hr: newActivity.avg_hr,
        max_hr: newActivity.max_hr,
        streams_data: {
          avg_cadence: newActivity.avg_cadence,
          calories: newActivity.calories,
          source: newActivity.source,
          notes: newActivity.notes,
          splits: newActivity.splits,
          elevation_profile: newActivity.elevation_profile,
        },
      },
    ]);
  }

  return {
    activity: newActivity,
    paceStr,
  };
}

// --------------------------------------------------------------------
// 7. MANEJADOR DE ACCIÓN: GUARDAR PESO CORPORAL
// --------------------------------------------------------------------
async function handleSaveWeight(weightKg: number, notes?: string, dateStr?: string) {
  const logDate = dateStr || new Date().toISOString().split('T')[0];
  const notesText = notes || 'Antes de cenar, después de entrenar';

  const newLog: WeightLog = {
    id: `weight-${Date.now()}`,
    date: logDate,
    timestamp: new Date().toISOString(),
    weight_kg: Number(weightKg.toFixed(2)),
    notes: notesText,
    created_at: new Date().toISOString(),
  };

  const existingIdx = mockStore.weightLogs.findIndex((w) => w.date === logDate);
  if (existingIdx >= 0) {
    mockStore.weightLogs[existingIdx] = newLog;
  } else {
    mockStore.weightLogs.unshift(newLog);
  }

  updateWeight(weightKg);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('weight_logs').upsert([newLog], { onConflict: 'id' });
    } catch (e) {
      console.warn('Aviso guardando peso en Supabase:', e);
    }
  }

  const sorted = [...mockStore.weightLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const initial = sorted[sorted.length - 1]?.weight_kg || 102.5;
  const totalDiff = Number((weightKg - initial).toFixed(2));

  return {
    log: newLog,
    initial,
    totalDiff,
    recentLogs: sorted.slice(0, 4),
  };
}

// --------------------------------------------------------------------
// 8. MANEJADOR DE ACCIÓN: AJUSTE / SUMAR / RESTAR VALORES
// --------------------------------------------------------------------
async function handleAdjustValue(
  metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g',
  delta: number,
  reason: string,
  todayStr: string
) {
  if (metric === 'water_ml') {
    const newWater: WaterLog = {
      id: `water-adj-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: todayStr,
      amount_ml: delta,
    };
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('water_logs').insert([newWater]);
      } catch (e) {
        console.warn('Aviso guardando agua en Supabase:', e);
      }
    }
    mockStore.waterLogs.unshift(newWater);

    const todayWater = mockStore.waterLogs.filter((w) => w.date === todayStr);
    const totalWater = todayWater.reduce((acc, w) => acc + w.amount_ml, 0);

    return {
      metricName: 'Agua',
      deltaStr: `${delta > 0 ? `+${delta}` : delta} ml`,
      newTotalStr: `${(totalWater / 1000).toFixed(2)} L`,
      targetStr: `${(activeProtocol.targets.waterMl / 1000).toFixed(1)} L`,
    };
  }

  // Si es ajuste de nutrición (calorías, proteína, carbohidratos o grasa)
  const isKcal = metric === 'calories';
  const isProt = metric === 'protein_g';
  const isCarbs = metric === 'carbs_g';
  const isFat = metric === 'fat_g';

  const newMeal: NutritionLog = {
    id: `nutri-adj-${Date.now()}`,
    timestamp: new Date().toISOString(),
    date: todayStr,
    meal_type: 'Snack',
    description: reason || `Ajuste manual (${delta > 0 ? `+${delta}` : delta} ${metric})`,
    calories: isKcal ? delta : 0,
    protein_g: isProt ? delta : 0,
    carbs_g: isCarbs ? delta : 0,
    fat_g: isFat ? delta : 0,
    raw_audio_transcription: `Ajuste manual: ${delta > 0 ? `+${delta}` : delta} en ${metric}`,
  };

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('nutrition_logs').insert([newMeal]);
    } catch (e) {
      console.warn('Aviso guardando ajuste nutricional en Supabase:', e);
    }
  }
  mockStore.nutritionLogs.unshift(newMeal);

  const todayMeals = mockStore.nutritionLogs.filter((m) => m.date === todayStr);
  const totalKcal = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProt = todayMeals.reduce((acc, m) => acc + m.protein_g, 0);
  const totalCarbs = todayMeals.reduce((acc, m) => acc + m.carbs_g, 0);
  const totalFat = todayMeals.reduce((acc, m) => acc + m.fat_g, 0);

  let metricName = 'Calorías';
  let unit = 'kcal';
  let newTotal = `${totalKcal} kcal`;
  let target = `${activeProtocol.targets.calories} kcal`;

  if (isProt) {
    metricName = 'Proteína';
    unit = 'g';
    newTotal = `${totalProt.toFixed(0)} g`;
    target = `${activeProtocol.targets.proteinMin}–${activeProtocol.targets.proteinMax} g`;
  } else if (isCarbs) {
    metricName = 'Carbohidratos';
    unit = 'g';
    newTotal = `${totalCarbs.toFixed(0)} g`;
    target = `${activeProtocol.targets.carbsMin}–${activeProtocol.targets.carbsMax} g`;
  } else if (isFat) {
    metricName = 'Grasas';
    unit = 'g';
    newTotal = `${totalFat.toFixed(0)} g`;
    target = `${activeProtocol.targets.fatMin}–${activeProtocol.targets.fatMax} g`;
  }

  return {
    metricName,
    deltaStr: `${delta > 0 ? `+${delta}` : delta} ${unit}`,
    newTotalStr: newTotal,
    targetStr: target,
    totalKcal,
    totalProt,
    totalCarbs,
    totalFat,
  };
}

// --------------------------------------------------------------------
// 8.b. MANEJADOR DE ACCIÓN: FIJAR / RESETEAR VALOR ABSOLUTO
// --------------------------------------------------------------------
async function handleSetValue(
  metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g',
  targetValue: number,
  reason: string,
  todayStr: string
) {
  if (metric === 'water_ml') {
    // 1. Limpiar o reemplazar registros de agua de hoy en Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('water_logs').delete().eq('date', todayStr);
      } catch (e) {
        console.warn('Aviso limpiando water_logs en Supabase:', e);
      }
    }
    // Limpiar en mockStore
    mockStore.waterLogs = mockStore.waterLogs.filter((w) => w.date !== todayStr);

    // 2. Insertar el valor definitivo fijado
    const newWater: WaterLog = {
      id: `water-set-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: todayStr,
      amount_ml: Math.round(targetValue),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('water_logs').insert([newWater]);
      } catch (e) {
        console.warn('Aviso guardando agua fijada en Supabase:', e);
      }
    }
    mockStore.waterLogs.unshift(newWater);

    return {
      metricName: 'Hidratación / Agua',
      newTotalStr: `${(targetValue / 1000).toFixed(2)} L`,
      targetStr: `${(activeProtocol.targets.waterMl / 1000).toFixed(1)} L`,
      detailStr: `Fijado directamente a ${(targetValue / 1000).toFixed(2)} L (${targetValue} ml)`,
    };
  }

  // Para nutrición (calorías, proteínas, carbohidratos, grasas):
  const todayMeals = mockStore.nutritionLogs.filter((m) => m.date === todayStr);
  const totalKcal = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProt = todayMeals.reduce((acc, m) => acc + m.protein_g, 0);
  const totalCarbs = todayMeals.reduce((acc, m) => acc + m.carbs_g, 0);
  const totalFat = todayMeals.reduce((acc, m) => acc + m.fat_g, 0);

  let currentVal = totalKcal;
  let metricName = 'Calorías';
  let unit = 'kcal';
  let target = `${activeProtocol.targets.calories} kcal`;

  if (metric === 'protein_g') {
    currentVal = totalProt;
    metricName = 'Proteína';
    unit = 'g';
    target = `${activeProtocol.targets.proteinMin}–${activeProtocol.targets.proteinMax} g`;
  } else if (metric === 'carbs_g') {
    currentVal = totalCarbs;
    metricName = 'Carbohidratos';
    unit = 'g';
    target = `${activeProtocol.targets.carbsMin}–${activeProtocol.targets.carbsMax} g`;
  } else if (metric === 'fat_g') {
    currentVal = totalFat;
    metricName = 'Grasas';
    unit = 'g';
    target = `${activeProtocol.targets.fatMin}–${activeProtocol.targets.fatMax} g`;
  }

  const delta = Math.round(targetValue - currentVal);
  if (delta !== 0) {
    await handleAdjustValue(
      metric,
      delta,
      reason || `Ajuste para fijar total en ${targetValue} ${unit}`,
      todayStr
    );
  }

  return {
    metricName,
    newTotalStr: `${targetValue} ${unit}`,
    targetStr: target,
    detailStr:
      delta !== 0
        ? `Ajustado con ${delta > 0 ? `+${delta}` : delta} ${unit} para igualar ${targetValue} ${unit}`
        : `El valor ya era exactamente ${targetValue} ${unit}`,
  };
}

// --------------------------------------------------------------------
// 9. ENDPOINT PRINCIPAL: ROUTE POST
// --------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const geminiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6KDuJBXcLC6s3MNyV0Q2d_nWRoPPvJl-ICpuaXo_Bwuvw';

    const message = update.message || update;
    const chatId = message.chat?.id || 123456789;
    const todayStr = new Date().toISOString().split('T')[0];

    let spokenText = message.text || message.caption || '';
    let audioData: { base64: string; mimeType: string } | null = null;
    let isVoiceNote = false;

    // Detectar, descargar y transcribir nota de voz / audio de forma ultrarrápida
    if ((message.voice || message.audio) && botToken) {
      const fileId = message.voice ? message.voice.file_id : message.audio.file_id;
      audioData = await downloadTelegramAudio(fileId, botToken);
      if (audioData) {
        isVoiceNote = true;
        const transcribedText = await transcribeAudioWithGemini(audioData, geminiKey);
        if (transcribedText && transcribedText.trim()) {
          spokenText = transcribedText.trim();
        } else {
          // Si el audio no se pudo decodificar o estaba en silencio, avisar a Álvaro por Telegram sin guardar basura
          if (botToken && message.chat?.id) {
            const errorMsg = `
🎙️ *Nota de voz recibida pero no se pudo escuchar con claridad*

Hubo una dificultad técnica decodificando el audio o el sonido era imperceptible.

💡 *Solución rápida:*
• Vuelve a grabármelo hablando cerca del micrófono o escríbeme el mensaje en texto para registrarlo de inmediato.
            `.trim();
            await sendTelegramMessage(chatId, errorMsg, botToken);
          }
          return NextResponse.json({ success: true, message: 'Audio no transcrito con claridad' });
        }
      }
    }

    // 0. Si llega una FOTO (Captura de pantalla de Strava / Resumen de Carrera / Splits)
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0 && botToken) {
      const photoData = await downloadTelegramPhoto(message.photo, botToken);
      if (photoData) {
        const analysis = await analyzeStravaScreenshotWithGemini(
          photoData,
          message.caption || '',
          geminiKey
        );

        if (analysis && analysis.is_cardio_screenshot && (analysis.distance_km || 0) > 0) {
          const { activity, paceStr } = await handleSaveCardio(
            {
              ...analysis,
              source: 'strava_screenshot',
            },
            todayStr
          );

          // Formatear parciales (splits) si los hay
          let splitsText = '';
          if (analysis.splits && analysis.splits.length > 0) {
            splitsText = '\n📊 *Parciales por Kilómetro (Splits):*\n';
            analysis.splits.forEach((s: any) => {
              const elev = s.elevation_diff_m ? ` (${s.elevation_diff_m > 0 ? `+${s.elevation_diff_m}` : s.elevation_diff_m}m)` : '';
              splitsText += `• *Km ${s.km}:* \`${s.pace}\`${elev}\n`;
            });
          }

          const countdown = getHalfMarathonCountdown(todayStr);

          const replyMsg = `
📸 *Captura de Strava Procesada con Éxito*
🏃‍♂️ *${activity.name}*

📍 *Distancia:* *${(activity.distance / 1000).toFixed(2)} km*
⏱️ *Tiempo:* *${Math.round(activity.elapsed_time / 60)} min* (\`${paceStr}\`)
⛰️ *Desnivel:* *+${Math.round(activity.total_elevation_gain || 0)} m* | 🔥 *Calorías:* *${activity.calories || '--'} kcal*
💓 *Pulso:* *${activity.avg_hr ? `${activity.avg_hr} bpm` : 'Fit3'}* | 👟 *Cadencia:* *${activity.avg_cadence || 168} ppm*
${splitsText}
${analysis.elevation_profile ? `⛰️ *Perfil de Desnivel:* _${analysis.elevation_profile}_\n\n` : ''}
🩺 *Análisis del Coach (101 kg • Media Maratón):*
_${analysis.coach_assessment || 'Buen rodaje registrado. Recuerda mantener la cadencia viva (165-175 ppm) para amortiguar el impacto sobre el tendón rotuliano.'}_

🏁 *Media Maratón 28 Feb:* Faltan *${countdown.daysRemaining} días* (${countdown.currentPhase}).
          `.trim();

          await sendTelegramMessage(chatId, replyMsg, botToken);
          return NextResponse.json({ success: true, processed: 'strava_screenshot', activity_id: activity.id });
        }
      }
    }

    if (!spokenText && !audioData) {
      return NextResponse.json({ success: true, message: 'Mensaje vacío o no procesable' });
    }

    const cleanCmd = spokenText.trim().toLowerCase();
    const parts = spokenText.trim().split(/\s+/);
    const mainCommand = parts[0].toLowerCase();
    const snapshot = await getAppSnapshot(todayStr);

    // ================================================================
    // COMANDOS DIRECTOS (SHORTCUTS RÁPIDOS)
    // ================================================================

    // 1. /start o /ayuda
    if (cleanCmd === '/start' || cleanCmd === '/ayuda' || cleanCmd === 'ayuda') {
      if (botToken && message.chat?.id) {
        const helpMsg = `
👋 *¡Hola Álvaro! Soy tu Entrenador & Fisioterapeuta Deportivo* 🦾⚡

Tengo acceso y control total a tu rutina semanal, preparación para la *Media Maratón del 28 de Febrero de 2027*, telemetría y datos en tiempo real:

🏥 *Salud Articular & Biomecánica:*
• Diagnóstico & protocolo rodillas: \`/rodillas\` o \`/rehab\`
• Prescripción de carrera / CaCo semanal: \`/caco\`
• Control de pasos diarios (Galaxy Fit3): \`/pasos\`
• Protocolo de suplementación articular: \`/suplementos\`
• Periodización de 22 semanas: \`/periodizacion\` o \`/fases\`

📅 *Rutina Semanal & Plan Diario:*
• Plan completo de hoy: \`/hoy\` o \`/plan\`
• Rutina completa de lunes a domingo: \`/rutina\` o \`/semana\`
• Calentamiento específico de hoy: \`/calentamiento\` o \`/calentar\`
• Estiramientos post-sesión de hoy: \`/estiramientos\` o \`/estirar\`
• Menú científico de 2.400 kcal: \`/menu\` o \`/comida\`
• Cuenta atrás y fase Media Maratón: \`/mediamaraton\` o \`/objetivo\`

🏋️‍♂️ *Entrenamientos de Fuerza:*
• Ver entreno programado o series de hoy: \`/fuerza\`
• Registrar entreno: _"Hoy hice torso: 4 series press banca mancuernas a 10 repes y remo 50kg"_

🏃‍♂️ *Cardio & Running:*
• Ver última carrera o salida programada: \`/cardio\`
• Registrar salida: _"He salido a correr 4 km en bloques de CaCo"_

🥗 *Nutrición & Hidratación:*
• Ver acumulación de comidas/macros de hoy: \`/resumen\`
• Registrar comida: _"3 huevos revueltos con avena y plátano"_
• Marcar creatina (5g): \`/creatina\`

⚖️ *Control de Peso Corporal:*
• Ver peso actual y evolución: \`/peso\`
• Registrar nuevo pesaje: \`/peso 100.8\` o _"He pesado 100.8 kg antes de cenar"_

➕➖ *Ajustes Rápidos de Métricas:*
• Sumar/restar: \`+500 agua\`, \`-200 cal\`, \`/sumar pro 25\`
• Fijar total directo: \`/fijar agua 3.8L\`, \`/set cal 2400\`

🌙 *Salud & Galaxy Fit3:*
• Consulta sueño y biometría: \`/salud\`

📊 *Reporte Integral 360°:* \`/reporte\` o \`/todo\`
        `.trim();
        await sendTelegramMessage(chatId, helpMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'help' });
    }

    // 2. /reporte o /todo (Resumen Ejecutivo 360°)
    if (cleanCmd === '/reporte' || cleanCmd === '/todo' || cleanCmd === 'reporte') {
      if (botToken && message.chat?.id) {
        const h = snapshot.health;
        const n = snapshot.nutrition;
        const g = snapshot.gym_workout;
        const c = snapshot.cardio_activities[0];
        const t = snapshot.athlete.targets;
        const w = snapshot.weight_tracking;

        const reportMsg = `
📊 *Reporte Integral IronMan (${todayStr})*
🏃‍♂️ *Atleta:* ${snapshot.athlete.name} (*${snapshot.athlete.weight_kg} kg* | Variación: *${w.total_lost_kg} kg*) | *Día:* ${snapshot.athlete.current_day_type.toUpperCase()}

⚖️ *Seguimiento de Peso:*
• Actual: *${w.current_weight_kg} kg* | Inicial: *${w.initial_weight_kg} kg* | Cambio: *${w.total_lost_kg <= 0 ? `${w.total_lost_kg} kg 📉` : `+${w.total_lost_kg} kg 📈`}*

🌙 *Salud & Descanso (Galaxy Fit3):*
• 💤 Sueño: *${h?.sleep_hours || 'N/A'} h* (Score: *${h?.sleep_score || 'N/A'}/100*)
• 💓 Pulso Reposo: *${h?.resting_hr || 'N/A'} bpm* | SpO2: *${h?.spo2_avg || 'N/A'}%*
• 👟 Pasos: *${h?.steps ? h.steps.toLocaleString() : 'N/A'}*

🏋️‍♂️ *Fuerza / Gimnasio:*
• Series registradas hoy: *${g.sets_logged_today}*
${g.logs.length > 0 ? g.logs.map((l) => `  └ ${l}`).join('\n') : '  └ _Sin entreno de fuerza anotado hoy_'}

🏃‍♂️ *Última Sesión de Cardio:*
${c ? `• ${c.name} (${c.type}): *${c.distance_km} km* en *${c.time_min} min* (FC: *${c.avg_hr} bpm*)` : '• _Sin carreras registradas_'}

🥗 *Nutrición & Hidratación:*
• 🔥 Calorías: *${n.calories}* / ${t.calories} kcal
• 🥩 Proteína: *${n.protein_g.toFixed(0)}* / ${t.proteinMin}–${t.proteinMax} g (${(n.protein_g / snapshot.athlete.weight_kg).toFixed(2)} g/kg)
• 💧 Hidratación: *${(n.water_ml / 1000).toFixed(2)}* / ${(t.waterMl / 1000).toFixed(1)} L
• ⚡ Creatina: *${n.creatine_taken ? '✅ Tomada' : '⏳ Pendiente'}*
        `.trim();
        await sendTelegramMessage(chatId, reportMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'report' });
    }

    // 3. /salud o /sueno (Biometría Galaxy Fit3)
    if (cleanCmd === '/salud' || cleanCmd === '/sueno' || cleanCmd === 'salud') {
      if (botToken && message.chat?.id) {
        const h = snapshot.health;
        const healthMsg = `
🌙 *Biometría y Descanso de Hoy (Galaxy Fit3)*
• 💤 *Sueño Total:* *${h?.sleep_hours || '7.8'} horas*
• 🎯 *Puntuación de Sueño:* *${h?.sleep_score || '88'} / 100*
• 💓 *Frecuencia Cardíaca en Reposo:* *${h?.resting_hr || '52'} bpm*
• 🫁 *Oxígeno en Sangre (SpO2):* *${h?.spo2_avg || '97.4'}%*
• 👟 *Pasos Acumulados:* *${h?.steps ? h.steps.toLocaleString() : '11.450'} pasos*
• 🔥 *Calorías Activas:* *${h?.active_calories || '680'} kcal*

💡 *Estado de Recuperación:* Frecuencia cardíaca baja y fase profunda óptima para soportar alta carga de entrenamiento hoy.
        `.trim();
        await sendTelegramMessage(chatId, healthMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'health' });
    }

    // 4. /fuerza o /entreno (Series de gimnasio de hoy o rutina programada)
    if (cleanCmd === '/fuerza' || cleanCmd === '/entreno' || cleanCmd === 'fuerza') {
      if (botToken && message.chat?.id) {
        const g = snapshot.gym_workout;
        const r = snapshot.scheduled_routine_today;
        let gymMsg = `🏋️‍♂️ *Entrenamiento de Fuerza (${todayStr} — ${r.day.toUpperCase()})*\n\n`;

        if (g.logs.length === 0) {
          if (r.category === 'Fuerza') {
            gymMsg += `📋 *Rutina Programada para Hoy:* *${r.title}*\n`;
            gymMsg += `🎯 *Ejercicios previstos:*\n` + r.exercises.map((e) => `• ${e}`).join('\n') + `\n\n`;
            gymMsg += `🔥 *Calentamiento (${r.warmup.durationMinutes} min):* _${r.warmup.description}_\n\n`;
            gymMsg += `_No tienes series registradas todavía hoy._\n_Díctame tus series o escríbelas (ej: "press banca 60kg 10 repes") y las registraré al vuelo._`;
          } else {
            gymMsg += `Hoy es *${r.day}* (*${r.title}*).\n`;
            gymMsg += `_No es día programado de fuerza pesada, pero si has hecho alguna serie dímelo y la guardo._`;
          }
        } else {
          gymMsg += `Total de series: *${g.sets_logged_today}*\n\n` + g.logs.map((l) => `• ${l}`).join('\n');
        }
        await sendTelegramMessage(chatId, gymMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'gym' });
    }

    // 5. /cardio o /carrera (Última actividad y previsión para Media Maratón)
    if (cleanCmd === '/cardio' || cleanCmd === '/carrera' || cleanCmd === 'cardio') {
      if (botToken && message.chat?.id) {
        const c = snapshot.cardio_activities[0];
        const r = snapshot.scheduled_routine_today;
        const cd = snapshot.half_marathon_countdown;
        let cardioMsg = `🏃‍♂️ *Cardio & Running (${todayStr} — ${r.day.toUpperCase()})*\n\n`;

        if (r.category === 'Cardio') {
          cardioMsg += `🎯 *Sesión Prevista para Hoy:* *${r.title}*\n`;
          cardioMsg += r.exercises.map((e) => `• ${e}`).join('\n') + `\n\n`;
          cardioMsg += `🏁 *Media Maratón (28/02):* Faltan *${cd.days_left} días* | *${cd.phase}*\n\n`;
        }

        if (!c) {
          cardioMsg += `_No hay actividades de cardio registradas hoy._\n_Al salir a correr o caminar, dímelo por audio o sincroniza tu Galaxy Fit3._`;
        } else {
          cardioMsg += `📊 *Últimas actividades registradas:*\n`;
          snapshot.cardio_activities.forEach((act, idx) => {
            cardioMsg += `${idx + 1}. *${act.name}* (${act.type})\n   📍 Distancia: *${act.distance_km} km* | ⏱️ Tiempo: *${act.time_min} min* | 💓 FC: *${act.avg_hr} bpm*\n\n`;
          });
        }
        await sendTelegramMessage(chatId, cardioMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'cardio' });
    }

    // 6. /protocolo o /reglas
    if (cleanCmd === '/protocolo' || cleanCmd === 'protocolo') {
      if (botToken && message.chat?.id) {
        const p = activeProtocol;
        const protocolMsg = `
📋 *Protocolo Nutricional y Deportivo: Álvaro*
⚖️ *Peso Base:* *${p.weightKg} kg*
🏃‍♂️ *Objetivo:* Recomposición + Preparación Maratón
📅 *Día Actual:* *${p.currentDayType.toUpperCase()}*

🎯 *Objetivos Diarios:*
• 🔥 Calorías: *${p.targets.calories} kcal*
• 🥩 Proteína: *${p.targets.proteinMin} – ${p.targets.proteinMax} g*
• 🍚 Carbohidratos: *${p.targets.carbsMin} – ${p.targets.carbsMax} g*
• 🥑 Grasas: *${p.targets.fatMin} – ${p.targets.fatMax} g*
• 💧 Hidratación: *${(p.targets.waterMl / 1000).toFixed(1)} L*
• ⚡ Creatina: *${p.targets.creatineTakenToday ? '✅ Tomada' : '⏳ Pendiente'}*
        `.trim();
        await sendTelegramMessage(chatId, protocolMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'protocol' });
    }

    // 7. /peso (Ver historial) o /peso [X] [notas]
    if (mainCommand === '/peso' || mainCommand === '/pesos' || cleanCmd === 'peso') {
      const weightVal = parts[1] ? parseFloat(parts[1].replace(',', '.')) : NaN;

      if (isNaN(weightVal)) {
        // Modo consulta de peso y evolución
        if (botToken && message.chat?.id) {
          const sorted = [...mockStore.weightLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const current = activeProtocol.weightKg;
          const initial = sorted[sorted.length - 1]?.weight_kg || 102.5;
          const diff = Number((current - initial).toFixed(2));
          const diffStr = diff <= 0 ? `${diff} kg 📉` : `+${diff} kg 📈`;

          const reply = `
⚖️ *Control de Peso Corporal — Álvaro*
• *Peso Actual:* *${current} kg*
• *Peso Inicial (20/09):* *${initial} kg*
• *Variación Total:* *${diffStr}*

📋 *Historial de pesajes (antes de cenar):*
${sorted.map((w) => `• *${w.date}:* *${w.weight_kg} kg* _(${w.notes || 'Antes de cenar'})_`).join('\n')}

💡 *Para registrar un nuevo peso:*
Escribe ej: \`/peso 100.8\` o díctamelo: _"Hoy he pesado 100.8 antes de cenar"_.
          `.trim();
          await sendTelegramMessage(chatId, reply, botToken);
        }
        return NextResponse.json({ success: true, command: 'view_weight' });
      } else if (weightVal >= 40 && weightVal <= 250) {
        // Modo registro/actualización de peso
        const notes = parts.slice(2).join(' ') || 'Antes de cenar, después de entrenar';
        const resWeight = await handleSaveWeight(weightVal, notes, todayStr);

        if (botToken && message.chat?.id) {
          const diffStr = resWeight.totalDiff <= 0 ? `${resWeight.totalDiff} kg 📉` : `+${resWeight.totalDiff} kg 📈`;
          const reply = `
⚖️ *Peso Registrado con Éxito*
• *Nuevo Peso:* *${weightVal} kg* (${todayStr})
• *Notas:* _${notes}_
• *Variación acumulada:* *${diffStr}* (desde ${resWeight.initial} kg)
📊 *Nuevo rango proteico:* *${activeProtocol.targets.proteinMin} – ${activeProtocol.targets.proteinMax} g/día* (1.65–1.85 g/kg)
          `.trim();
          await sendTelegramMessage(chatId, reply, botToken);
        }
        return NextResponse.json({ success: true, command: 'update_weight', weight: weightVal });
      }
    }

    // 8. /sumar o /+ y /restar o /-
    if (
      mainCommand === '/sumar' ||
      mainCommand === '/+' ||
      mainCommand === '/restar' ||
      mainCommand === '/-'
    ) {
      const isSubtract = mainCommand === '/restar' || mainCommand === '/-';
      let metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g' = 'calories';
      let amount = 0;

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].toLowerCase();
        const num = parseFloat(p.replace(',', '.'));
        if (!isNaN(num)) {
          amount = Math.abs(num);
        } else if (p.includes('cal') || p.includes('kcal')) {
          metric = 'calories';
        } else if (p.includes('agua') || p.includes('ml')) {
          metric = 'water_ml';
        } else if (p.includes('pro') || p.includes('prot')) {
          metric = 'protein_g';
        } else if (p.includes('carb') || p.includes('hidrato')) {
          metric = 'carbs_g';
        } else if (p.includes('grasa') || p.includes('fat')) {
          metric = 'fat_g';
        }
      }

      if (amount > 0) {
        const delta = isSubtract ? -amount : amount;
        const resAdj = await handleAdjustValue(
          metric,
          delta,
          isSubtract ? `Corrección (-${amount} ${metric})` : `Añadido (+${amount} ${metric})`,
          todayStr
        );

        if (botToken && message.chat?.id) {
          const actionWord = isSubtract ? 'Restado ➖' : 'Sumado ➕';
          const reply = `
⚙️ *Ajuste Realizado: ${resAdj.metricName}*
• *Modificación:* *${resAdj.deltaStr}* (${actionWord})
• *Nuevo acumulado de hoy:* *${resAdj.newTotalStr}* / ${resAdj.targetStr}
          `.trim();
          await sendTelegramMessage(chatId, reply, botToken);
        }
        return NextResponse.json({ success: true, command: 'adjust_metric', metric, delta });
      }
    }

    // 8.b. /fijar o /set (Fijar total absoluto de métricas)
    if (
      mainCommand === '/fijar' ||
      mainCommand === '/set' ||
      mainCommand === '/poner' ||
      mainCommand === '/establecer'
    ) {
      let metric: 'calories' | 'water_ml' | 'protein_g' | 'carbs_g' | 'fat_g' = 'water_ml';
      let targetVal = 0;

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].toLowerCase();
        const num = parseFloat(p.replace(',', '.'));
        if (!isNaN(num)) {
          targetVal = num;
        } else if (p.includes('cal') || p.includes('kcal')) {
          metric = 'calories';
        } else if (p.includes('agua') || p.includes('ml') || p.includes('litro') || p === 'l' || p.endsWith('l')) {
          metric = 'water_ml';
        } else if (p.includes('pro') || p.includes('prot')) {
          metric = 'protein_g';
        } else if (p.includes('carb') || p.includes('hidrato')) {
          metric = 'carbs_g';
        } else if (p.includes('grasa') || p.includes('fat')) {
          metric = 'fat_g';
        }
      }

      // Si es agua y el valor es menor o igual a 10 (ej: 3 o 3.5), se interpreta en Litros -> ml
      if (metric === 'water_ml' && targetVal > 0 && targetVal <= 10) {
        targetVal = targetVal * 1000;
      }

      if (targetVal > 0) {
        const resSet = await handleSetValue(
          metric,
          targetVal,
          `Comando directo ${mainCommand}`,
          todayStr
        );

        if (botToken && message.chat?.id) {
          const reply = `
🎯 *Total Fijado: ${resSet.metricName}*
• *Nuevo total de hoy:* *${resSet.newTotalStr}* / ${resSet.targetStr}
• *Detalle:* _${resSet.detailStr}_
          `.trim();
          await sendTelegramMessage(chatId, reply, botToken);
        }
        return NextResponse.json({ success: true, command: 'set_metric', metric: metric as string, targetVal });
      }
    }

    // 8. /creatina
    if (cleanCmd === '/creatina' || cleanCmd === 'creatina') {
      const taken = toggleCreatine();
      if (botToken && message.chat?.id) {
        const reply = taken
          ? '⚡ *Creatina Monohidrato (5g):* Marcada como consumida en la merienda ✅'
          : '⏳ *Creatina Monohidrato (5g):* Desmarcada (pendiente de tomar) ⭕';
        await sendTelegramMessage(chatId, reply, botToken);
      }
      return NextResponse.json({ success: true, command: 'creatine', taken });
    }

    // 9. /hoy o /plan (Rutina, entrenamiento, nutrición y objetivo de hoy)
    if (cleanCmd === '/hoy' || cleanCmd === 'hoy' || cleanCmd === '/plan' || cleanCmd === 'plan') {
      if (botToken && message.chat?.id) {
        const dailyMsg = formatDailyScheduleMarkdown(todayStr);
        await sendTelegramMessage(chatId, dailyMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'today_routine' });
    }

    // 10. /rutina o /semana (Calendario semanal completo)
    if (cleanCmd === '/rutina' || cleanCmd === 'rutina' || cleanCmd === '/semana' || cleanCmd === 'semana') {
      if (botToken && message.chat?.id) {
        const weeklyMsg = formatWeeklyScheduleMarkdown();
        await sendTelegramMessage(chatId, weeklyMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'weekly_routine' });
    }

    // 11. /calentamiento o /calentar (Calentamiento específico guiado de hoy)
    if (
      cleanCmd === '/calentamiento' ||
      cleanCmd === 'calentamiento' ||
      cleanCmd === '/calentar' ||
      cleanCmd === 'calentar'
    ) {
      if (botToken && message.chat?.id) {
        const r = snapshot.scheduled_routine_today;
        const warmupMsg = `
🔥 *Calentamiento Sugerido para Hoy (${r.day.toUpperCase()}):*
🎯 *Sesión:* *${r.title}*
⏱️ *Duración:* *${r.warmup.durationMinutes} minutos*

📝 *Enfoque:*
_${r.warmup.description}_

🏃‍♂️ *Ejercicios de activación:*
${r.warmup.exercises.length > 0 ? r.warmup.exercises.map((e) => `• ${e}`).join('\n') : '• _Día de descanso: sin calentamiento necesario._'}

💡 *Recuerda:* Un buen calentamiento eleva la temperatura intramuscular y previene tirones y sobrecargas en tendones.
        `.trim();
        await sendTelegramMessage(chatId, warmupMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'warmup' });
    }

    // 12. /estiramientos o /estirar (Protocolo de estiramientos post-entreno)
    if (
      cleanCmd === '/estiramientos' ||
      cleanCmd === 'estiramientos' ||
      cleanCmd === '/estirar' ||
      cleanCmd === 'estirar'
    ) {
      if (botToken && message.chat?.id) {
        const r = snapshot.scheduled_routine_today;
        const stretchMsg = `
🧘‍♂️ *Protocolo de Estiramientos para Hoy (${r.day.toUpperCase()}):*
🎯 *Sesión:* *${r.title}*
⏱️ *Duración:* *${r.stretches.durationMinutes} minutos*

📝 *Enfoque de recuperación:*
_${r.stretches.description}_

✨ *Ejercicios y tiempos guiados:*
${r.stretches.exercises.map((e) => `• ${e}`).join('\n')}

💡 *Importante:* No rebotes al estirar. Mantén la tensión constante sin dolor agudo, respirando hondo por la nariz.
        `.trim();
        await sendTelegramMessage(chatId, stretchMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'stretches' });
    }

    // 13. /comida, /recetas, /receta o /dieta (Menú y platos sugeridos para hoy)
    if (
      cleanCmd === '/comida' ||
      cleanCmd === 'comida' ||
      cleanCmd === '/recetas' ||
      cleanCmd === 'recetas' ||
      cleanCmd === '/receta' ||
      cleanCmd === 'receta' ||
      cleanCmd === '/dieta' ||
      cleanCmd === 'dieta'
    ) {
      if (botToken && message.chat?.id) {
        const r = snapshot.scheduled_routine_today;
        const s = r.nutrition_strategy;
        const mealMsg = `
🍽️ *Estrategia Nutricional & Recetas para Hoy (${r.day.toUpperCase()}):*
🎯 *Objetivo:* *${s.calorieTarget} kcal* | 🥩 *${s.proteinTarget}* | 💧 *${s.waterLiters} L*

💡 *Directriz Metabólica:*
_${s.guidelines}_

🥗 *Platos Recomendados de Hoy:*
${s.recommendedMeals.map((m) => `• *${m.slot}:* *${m.dish}*\n  └ _${m.details}_`).join('\n\n')}

⚡ *Suplementación:* 5g de Creatina Monohidrato en merienda con agua.
        `.trim();
        await sendTelegramMessage(chatId, mealMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'meals_recommendation' });
    }

    // 14. /mediamaraton, /maraton o /objetivo (Cuenta atrás y plan 28/02/2027)
    if (
      cleanCmd === '/mediamaraton' ||
      cleanCmd === 'mediamaraton' ||
      cleanCmd === '/maraton' ||
      cleanCmd === 'maraton' ||
      cleanCmd === '/objetivo' ||
      cleanCmd === 'objetivo'
    ) {
      if (botToken && message.chat?.id) {
        const c = snapshot.half_marathon_countdown;
        const r = snapshot.scheduled_routine_today;
        const marathonMsg = `
🏁 *OBJETIVO: MEDIA MARATÓN (21,097 KM)*
📅 *Fecha de la prueba:* *${c.target_date}*

⏳ *Cuenta Atrás:*
• Quedan *${c.days_left} días* (*${c.weeks_left} semanas y ${c.extra_days} días*)

📍 *Fase de Entrenamiento:*
*${c.phase}*
_${c.phase_description}_

🎯 *Foco Táctico de Esta Semana:*
_${c.today_focus}_

💪 *Impacto de la sesión de hoy (${r.day}):*
_${r.half_marathon_impact}_
        `.trim();
        await sendTelegramMessage(chatId, marathonMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'half_marathon' });
    }

    // 15. /resumen (Nutrición acumulada hoy)
    if (cleanCmd === '/resumen' || cleanCmd === 'resumen') {
      if (botToken && message.chat?.id) {
        const n = snapshot.nutrition;
        const t = snapshot.athlete.targets;
        const r = snapshot.scheduled_routine_today;
        let nutriMsg = `📊 *Resumen Nutricional: ${todayStr} (${r.day})*\n\n`;
        if (n.meals.length === 0) {
          nutriMsg += `_Sin comidas registradas hoy._\n\n`;
        } else {
          nutriMsg += `🍽️ *Comidas (${n.meals_count}):*\n` + n.meals.map((m) => `• ${m}`).join('\n') + '\n\n';
        }
        nutriMsg += `🎯 *Acumulado vs Objetivo de Hoy:*
• 🔥 Calorías: *${n.calories}* / *${t.calories} kcal*
• 🥩 Proteína: *${n.protein_g.toFixed(0)}* / *${t.proteinMin}–${t.proteinMax} g*
• 🍚 Carbos: *${n.carbs_g.toFixed(0)}* / *${t.carbsMin}–${t.carbsMax} g*
• 🥑 Grasas: *${n.fat_g.toFixed(0)}* / *${t.fatMin}–${t.fatMax} g*
• 💧 Agua: *${(n.water_ml / 1000).toFixed(2)}* / *${(t.waterMl / 1000).toFixed(1)} L*
• ⚡ Creatina: *${n.creatine_taken ? '✅ Tomada' : '⏳ Pendiente'}*`;

        await sendTelegramMessage(chatId, nutriMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'summary' });
    }

    // 16. /rodillas, /dolor o /rehab (Diagnóstico y alivio inmediato)
    if (
      cleanCmd === '/rodillas' ||
      cleanCmd === 'rodillas' ||
      cleanCmd === '/rehab' ||
      cleanCmd === 'rehab' ||
      cleanCmd === '/dolor' ||
      cleanCmd === 'dolor'
    ) {
      if (botToken && message.chat?.id) {
        const rehabMsg = formatKneeRehabMarkdown();
        await sendTelegramMessage(chatId, rehabMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'knee_rehab' });
    }

    // 17. /caco o /sesion (Prescripción de carrera de esta semana)
    if (cleanCmd === '/caco' || cleanCmd === 'caco' || cleanCmd === '/sesion' || cleanCmd === 'sesion') {
      if (botToken && message.chat?.id) {
        const p = snapshot.running_week_plan;
        const cacoMsg = `
🏃‍♂️ *PRESCRIPCIÓN DE CARRERA — SEMANA ${p.week} (${p.phase.toUpperCase()})*
📍 *${p.phase_name}*
🎯 *Objetivo Fisiológico:* _${p.goal}_

🗓️ *Sesiones de la Semana:*
• 🏃‍♂️ *JUEVES (Rodaje Base):*
  └ ${p.thursday_session}
  └ *Distancia:* ${p.thursday_km} km | *Ritmo:* 7:15 - 7:35 min/km

• 👑 *DOMINGO (Tirada Larga Semanal):*
  └ ${p.sunday_session}
  └ *Distancia:* ${p.sunday_km} km | *Zona 2 controlada*

💡 *Técnica clave:* Cadencia 165-172 ppm. Si hay pinchazo en la rodilla, pasa inmediatamente a caminar 1 minuto por cada 3-4 minutos de trote.
        `.trim();
        await sendTelegramMessage(chatId, cacoMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'caco_session' });
    }

    // 18. /menu (Menú científico estructurado de 2.400 kcal)
    if (cleanCmd === '/menu' || cleanCmd === 'menu') {
      if (botToken && message.chat?.id) {
        const menuMsg = formatMenuMarkdown();
        await sendTelegramMessage(chatId, menuMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'structured_menu' });
    }

    // 19. /suplementos o /articulaciones (Protocolo de suplementación)
    if (
      cleanCmd === '/suplementos' ||
      cleanCmd === 'suplementos' ||
      cleanCmd === '/articulaciones' ||
      cleanCmd === 'articulaciones'
    ) {
      if (botToken && message.chat?.id) {
        const supMsg = formatSupplementsMarkdown();
        await sendTelegramMessage(chatId, supMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'supplements' });
    }

    // 20. /pasos (Control de pasos de hoy Galaxy Fit3)
    if (cleanCmd === '/pasos' || cleanCmd === 'pasos') {
      if (botToken && message.chat?.id) {
        const s = snapshot.target_steps_today;
        const r = snapshot.scheduled_routine_today;
        const fit3Steps = s.actual_fit3_steps !== null ? `${s.actual_fit3_steps.toLocaleString()} pasos` : 'Pendiente de sincronizar';
        const stepsMsg = `
👟 *CONTROL DE PASOS DIARIOS (GALAXY FIT3)*
📅 *Día:* ${r.day} (*${r.title}*)
🏷️ *Categoría:* ${r.category}

📊 *Telemetría de Pasos Hoy:*
• *Pasos registrados (Fit3):* *${fit3Steps}*
• *Rango objetivo de hoy:* *${s.min.toLocaleString()} – ${s.max.toLocaleString()} pasos*
• *Diagnóstico:* _${s.analysis}_

💡 *Directriz Clínica:*
_${s.note}_
        `.trim();
        await sendTelegramMessage(chatId, stepsMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'steps_analysis' });
    }

    // 21. /periodizacion o /fases (Hoja de ruta completa de 22 semanas)
    if (
      cleanCmd === '/periodizacion' ||
      cleanCmd === 'periodizacion' ||
      cleanCmd === '/fases' ||
      cleanCmd === 'fases'
    ) {
      if (botToken && message.chat?.id) {
        const perioMsg = formatPeriodizationMarkdown(snapshot.current_week_number);
        await sendTelegramMessage(chatId, perioMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'periodization' });
    }

    // ================================================================
    // PROCESADO INTELIGENTE MULTIMODAL CON GEMINI FLASH
    // (Entrenamiento Fuerza, Cardio, Nutrición o Consultas)
    // ================================================================
    const aiResult = await processWithGemini(spokenText, geminiKey, snapshot, audioData);
    const transcriptionHeader = isVoiceNote && aiResult.transcription
      ? `🎙️ _"${aiResult.transcription}"_\n\n`
      : '';

    // CASO A: REGISTRO DE ENTRENAMIENTO DE FUERZA (GYM)
    if (aiResult.action === 'log_workout' && aiResult.workout) {
      const { totalVolumeKg, totalSets, savedSummaries } = await handleSaveGymWorkout(
        aiResult.workout,
        todayStr
      );

      if (botToken && message.chat?.id) {
        const reply = `
🏋️‍♂️ *Entrenamiento de Fuerza Guardado con Éxito*
${transcriptionHeader}📋 *Sesión:* *${aiResult.workout.title || 'Entrenamiento de Fuerza'}*
💪 *Series Totales:* ${totalSets} | ⚖️ *Volumen Levantado:* *${totalVolumeKg.toLocaleString()} kg*

${savedSummaries.join('\n\n')}

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'log_workout',
        totalVolumeKg,
        totalSets,
      });
    }

    // CASO B: REGISTRO DE CARDIO / CARRERA / CAMINATA
    if (aiResult.action === 'log_cardio' && aiResult.cardio) {
      const { activity, paceStr } = await handleSaveCardio(aiResult.cardio, todayStr);

      if (botToken && message.chat?.id) {
        const reply = `
🏃‍♂️ *Sesión de Cardio Registrada*
${transcriptionHeader}📍 *${activity.name}* (${activity.type})
📏 *Distancia:* *${(activity.distance / 1000).toFixed(2)} km*
⏱️ *Duración:* *${Math.round(activity.elapsed_time / 60)} min*
⚡ *Ritmo Medio:* *${paceStr}*
💓 *Pulso Estimado:* *${activity.avg_hr} bpm*

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'log_cardio',
        activity,
      });
    }

    // CASO C: CONSULTA CONVERSACIONAL (PREGUNTAS SOBRE DATOS DE LA APP)
    if (aiResult.action === 'query' && aiResult.reply_text) {
      if (botToken && message.chat?.id) {
        const reply = `
🤖 *IronMan Copilot:*
${transcriptionHeader}${aiResult.reply_text}

${aiResult.coach_tip ? `💡 *Tip:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'query',
        reply: aiResult.reply_text,
      });
    }

    // CASO D: ACTUALIZACIÓN DE PROTOCOLO O BIOMETRÍA
    if (aiResult.action === 'protocol_update' && aiResult.protocol_update) {
      if (aiResult.protocol_update.new_weight_kg) {
        updateWeight(aiResult.protocol_update.new_weight_kg);
      }
      if (aiResult.protocol_update.new_day_type) {
        setDayType(aiResult.protocol_update.new_day_type);
      }
      if (aiResult.protocol_update.creatine_taken !== undefined) {
        toggleCreatine(aiResult.protocol_update.creatine_taken);
      }

      if (botToken && message.chat?.id) {
        const reply = `
⚙️ *Protocolo Actualizado por IA*
${transcriptionHeader}⚖️ *Peso:* ${activeProtocol.weightKg} kg
📅 *Día:* ${activeProtocol.currentDayType.toUpperCase()}
🎯 *Calorías:* ${activeProtocol.targets.calories} kcal | 🥩 *Proteína:* ${activeProtocol.targets.proteinMin}–${activeProtocol.targets.proteinMax}g
⚡ *Creatina:* ${activeProtocol.targets.creatineTakenToday ? 'Tomada ✅' : 'Pendiente ⏳'}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({ success: true, action: 'protocol_update' });
    }

    // CASO D2: REGISTRO DE PESO CORPORAL (PESAJE DIARIO)
    if (aiResult.action === 'log_weight' && (aiResult.weight_log?.weight_kg || aiResult.protocol_update?.new_weight_kg)) {
      const weightVal = Number(aiResult.weight_log?.weight_kg || aiResult.protocol_update?.new_weight_kg);
      const notes = aiResult.weight_log?.notes || 'Antes de cenar, después de entrenar';
      const resWeight = await handleSaveWeight(weightVal, notes, todayStr);

      if (botToken && message.chat?.id) {
        const diffStr = resWeight.totalDiff <= 0 ? `${resWeight.totalDiff} kg 📉` : `+${resWeight.totalDiff} kg 📈`;
        const reply = `
⚖️ *Pesaje Registrado por IA*
${transcriptionHeader}• *Peso:* *${weightVal} kg* (${todayStr})
• *Momento:* _${notes}_
• *Variación acumulada:* *${diffStr}* (desde ${resWeight.initial} kg)
📊 *Nuevo rango de proteína:* *${activeProtocol.targets.proteinMin} – ${activeProtocol.targets.proteinMax} g/día* (1.65–1.85 g/kg)

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'log_weight',
        weight_kg: weightVal,
        totalDiff: resWeight.totalDiff,
      });
    }

    // CASO D3: AJUSTE / SUMAR / RESTAR VALORES A LA APP
    if (aiResult.action === 'adjust_value' && aiResult.adjust) {
      const { metric, delta, reason } = aiResult.adjust;
      const resAdj = await handleAdjustValue(
        metric,
        delta,
        reason || aiResult.transcription || spokenText,
        todayStr
      );

      if (botToken && message.chat?.id) {
        const actionWord = delta < 0 ? 'Restado ➖' : 'Sumado ➕';
        const reply = `
⚙️ *Ajuste Realizado con Éxito*
${transcriptionHeader}• *Modificación:* *${resAdj.deltaStr}* en *${resAdj.metricName}* (${actionWord})
• *Motivo:* _${reason || 'Corrección solicitada'}_
📊 *Nuevo total de hoy:* *${resAdj.newTotalStr}* / ${resAdj.targetStr}

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'adjust_value',
        metric,
        delta,
        newTotal: resAdj.newTotalStr,
      });
    }

    // CASO D4: FIJAR O SOBRESCRIBIR TOTALES DIRECTOS (AGUA, CALORÍAS, MACROS)
    if (aiResult.action === 'set_value' && aiResult.set_value) {
      const { metric, target_value, reason } = aiResult.set_value;
      let finalTarget = Number(target_value);
      if (metric === 'water_ml' && finalTarget > 0 && finalTarget <= 10) {
        finalTarget = finalTarget * 1000;
      }

      const resSet = await handleSetValue(
        metric,
        finalTarget,
        reason || aiResult.transcription || spokenText,
        todayStr
      );

      if (botToken && message.chat?.id) {
        const reply = `
🎯 *Total Corregido con Éxito*
${transcriptionHeader}• *Métrica:* *${resSet.metricName}*
• *Nuevo total de hoy:* *${resSet.newTotalStr}* / ${resSet.targetStr}
• *Detalle:* _${resSet.detailStr}_

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'set_value',
        metric,
        target_value: finalTarget,
        newTotal: resSet.newTotalStr,
      });
    }

    // CASO E: REGISTRO DE NUTRICIÓN E HIDRATACIÓN
    if (aiResult.action === 'log_nutrition' && aiResult.nutrition) {
      const nutri = aiResult.nutrition;

      if (nutri.creatine_detected) {
        toggleCreatine(true);
      }

      const newMeal: NutritionLog = {
        id: `nutri-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: todayStr,
        meal_type: nutri.meal_type || 'Almuerzo',
        description: nutri.description || spokenText,
        calories: Number(nutri.calories) || 0,
        protein_g: Number(nutri.protein_g) || 0,
        carbs_g: Number(nutri.carbs_g) || 0,
        fat_g: Number(nutri.fat_g) || 0,
        raw_audio_transcription: aiResult.transcription || spokenText,
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

      const updatedTodayMeals = mockStore.nutritionLogs.filter((m) => m.date === todayStr);
      const updatedTotalKcal = updatedTodayMeals.reduce((acc, m) => acc + m.calories, 0);
      const updatedTotalProt = updatedTodayMeals.reduce((acc, m) => acc + m.protein_g, 0);
      const updatedTodayWater = mockStore.waterLogs.filter((w) => w.date === todayStr);
      const updatedTotalWater = updatedTodayWater.reduce((acc, w) => acc + w.amount_ml, 0);
      const t = activeProtocol.targets;

      if (botToken && message.chat?.id) {
        const reply = `
✅ *Comida Registrada con Éxito*
${transcriptionHeader}🍽️ *${nutri.description}* (${nutri.meal_type})
🔥 *${nutri.calories}* kcal | 🥩 *${nutri.protein_g}g* Prot | 🍚 *${nutri.carbs_g}g* Carb | 🥑 *${nutri.fat_g}g* Grasa
${nutri.water_ml > 0 ? `💧 *Agua añadida:* +${nutri.water_ml} ml\n` : ''}${nutri.creatine_detected ? '⚡ *Creatina:* 5g marcada en la merienda ✅\n' : ''}
📊 *Acumulado de Hoy (${todayStr}):*
• Calorías: *${updatedTotalKcal}* / ${t.calories} kcal
• Proteína: *${updatedTotalProt.toFixed(0)}* / ${t.proteinMin}–${t.proteinMax} g (${(updatedTotalProt / activeProtocol.weightKg).toFixed(2)} g/kg)
• Hidratación: *${(updatedTotalWater / 1000).toFixed(2)}* L
${aiResult.coach_tip ? `\n💡 *Coach:* _${aiResult.coach_tip}_` : ''}
        `.trim();
        await sendTelegramMessage(chatId, reply, botToken);
      }

      return NextResponse.json({
        success: true,
        action: 'log_nutrition',
        meal: newMeal,
      });
    }

    // CASO F: CUALQUIER OTRA ACCIÓN O CONSULTA CONVERSACIONAL NO CAPTURADA
    if (botToken && message.chat?.id) {
      const reply = `
🤖 *IronMan Coach:*
${transcriptionHeader}${aiResult.reply_text || 'He recibido tu mensaje y lo he procesado en tu seguimiento.'}

${aiResult.coach_tip ? `💡 *Coach:* _${aiResult.coach_tip}_` : ''}
      `.trim();
      await sendTelegramMessage(chatId, reply, botToken);
    }

    return NextResponse.json({
      success: true,
      action: aiResult.action || 'processed',
      reply: aiResult.reply_text,
    });
  } catch (error: any) {
    console.error('Error general en webhook de Telegram:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

// --------------------------------------------------------------------
// 10. DIAGNÓSTICO Y HEALTHCHECK: ROUTE GET
// --------------------------------------------------------------------
export async function GET(request: NextRequest): Promise<NextResponse> {
  const todayStr = new Date().toISOString().split('T')[0];
  const snapshot = await getAppSnapshot(todayStr);

  const urlObj = new URL(request.url);
  const setupParam = urlObj.searchParams.get('setup');
  const tokenParam = urlObj.searchParams.get('token');
  const botToken = tokenParam || process.env.TELEGRAM_BOT_TOKEN;

  // Determinar la URL del webhook en el host actual (o producción de Vercel)
  const currentOrigin = urlObj.origin.includes('localhost')
    ? 'https://iron-man-app.vercel.app'
    : urlObj.origin;
  const targetWebhookUrl = `${currentOrigin}/api/telegram/webhook`;

  let setupResult: any = null;
  let webhookInfo: any = null;

  if (botToken) {
    // Si se solicita setup=true, registrar automáticamente el webhook en la API de Telegram
    if (setupParam === 'true') {
      try {
        const setRes = await fetch(
          `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(targetWebhookUrl)}&drop_pending_updates=false`
        );
        setupResult = await setRes.json();
      } catch (err: any) {
        setupResult = { ok: false, error: err.message };
      }
    }

    // Consultar estado actual del webhook en Telegram
    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      webhookInfo = await infoRes.json();
    } catch (err: any) {
      webhookInfo = { ok: false, error: err.message };
    }
  }

  return NextResponse.json({
    status: 'online',
    service: 'IronMan Telegram Webhook Assistant & AI Coach',
    telegram_bot: {
      bot_token_configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      token_preview: botToken
        ? `${botToken.substring(0, 4)}...${botToken.substring(botToken.length - 4)}`
        : 'NO CONFIGURADO (añade TELEGRAM_BOT_TOKEN en Vercel o usa ?token=TU_TOKEN&setup=true)',
      target_webhook_url: targetWebhookUrl,
      webhook_setup_result: setupResult,
      telegram_api_webhook_info: webhookInfo,
    },
    target_event: {
      name: 'Media Maratón (21.097 km)',
      date: TARGET_HALF_MARATHON_DATE,
      countdown: snapshot.half_marathon_countdown,
    },
    running_progression: {
      current_week: snapshot.current_week_number,
      plan: snapshot.running_week_plan,
    },
    steps_telemetry: snapshot.target_steps_today,
    clinical_guidelines: snapshot.clinical_knee_guidelines,
    structured_menu: snapshot.structured_menu_2400,
    today: {
      date: todayStr,
      routine: snapshot.scheduled_routine_today,
    },
  });
}


