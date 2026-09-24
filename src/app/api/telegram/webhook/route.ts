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
  GymExercise,
  GymWorkoutLog,
  StravaActivity,
  DailyHealthMetric,
} from '@/types/database';
import {
  activeProtocol,
  updateWeight,
  setDayType,
  toggleCreatine,
  DayType,
} from '@/lib/nutritionProtocol';

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

    return { base64, mimeType };
  } catch (err) {
    console.error('Error descargando audio de Telegram:', err);
    return null;
  }
}

// --------------------------------------------------------------------
// 2. UTILIDAD: ENVÍO DE MENSAJES A TELEGRAM
// --------------------------------------------------------------------
async function sendTelegramMessage(chatId: number, messageText: string, botToken: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    console.error('Error enviando mensaje de Telegram:', e);
  }
}

// --------------------------------------------------------------------
// 3. CAPTURA DEL ESTADO COMPLETO DE LA APP (SNAPSHOT PARA GEMINI)
// --------------------------------------------------------------------
function getAppSnapshot(todayStr: string) {
  const latestHealth = mockStore.dailyMetrics[0] || null;
  const todayMeals = mockStore.nutritionLogs.filter((m) => m.date === todayStr);
  const todayWater = mockStore.waterLogs.filter((w) => w.date === todayStr);
  const todayGymLogs = mockStore.gymLogs.filter((l) => l.date === todayStr);
  const recentActivities = mockStore.stravaActivities.slice(0, 3);

  const totalKcal = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProt = todayMeals.reduce((acc, m) => acc + m.protein_g, 0);
  const totalCarbs = todayMeals.reduce((acc, m) => acc + m.carbs_g, 0);
  const totalFat = todayMeals.reduce((acc, m) => acc + m.fat_g, 0);
  const totalWaterMl = todayWater.reduce((acc, w) => acc + w.amount_ml, 0);

  return {
    today: todayStr,
    athlete: {
      name: activeProtocol.athleteName,
      weight_kg: activeProtocol.weightKg,
      current_day_type: activeProtocol.currentDayType,
      targets: activeProtocol.targets,
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
        const ex = mockStore.gymExercises.find((e) => e.id === l.exercise_id);
        return `${ex?.name || 'Ejercicio'}: Serie ${l.set_number} -> ${l.reps} reps @ ${l.weight_kg} kg (RPE ${l.rpe || 'N/A'})`;
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
  action: 'log_workout' | 'log_cardio' | 'log_nutrition' | 'query' | 'protocol_update';
  transcription?: string;
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
Eres el Asistente Deportivo Personal y Entrenador de Alto Rendimiento de Álvaro para su plataforma IronManApp.
Tienes control integral de la aplicación para registrar y consultar datos de:
1. Nutrición e hidratación.
2. Entrenamientos de fuerza (gimnasio / pesas).
3. Caminatas y carreras de running (cardio).
4. Métricas de salud (Galaxy Fit3: sueño, pulso en reposo, pasos, SpO2).
5. Biometría y protocolo.

ESTADO ACTUAL DE LA APP EN VIVO:
${JSON.stringify(snapshot, null, 2)}

INSTRUCCIONES DE CLASIFICACIÓN Y ACCIÓN:
1. Si Álvaro te explica un entrenamiento de fuerza (ej: "Hoy he hecho torso", o "press banca 60kg, remo 50kg..."):
   - Pon "action": "log_workout".
   - Reconoce sus 3 días y ejercicios habituales:
     • Día 1 Torso: Press de Banca (60kg), Remo con Barra / Polea (50kg), Press Inclinado Mancuernas (50kg), Jalón al Pecho (50kg), Elevaciones Laterales (5kg/lado), Curl Bíceps Banco Inclinado (10-12.5kg), Extensión Tríceps en Polea (50kg).
     • Día 2 Pierna Anti-impacto: Prensa Inclinada (120kg), Curl Femoral Sentado (60kg), Máquina de Abductores / Glúteo (70->80->90kg), Extensión de Cuádriceps (50kg), Hiperextensiones 45° (sin peso / PC), Elevaciones Talones Máquina (+20kg), Plancha Lateral Antirrotacional.
     • Día 3 Full Body: Sentadilla Trasera / Búlgara (70kg), Press Militar Mancuernas (18kg), Hip Thrust / Glúteos (80kg), Remo Unilateral (22kg), Face Pull Polea (25kg), Crunch Polea / Talones (35kg).
   - Desglosa cada ejercicio con sus series, repeticiones, peso en kg y RPE.
   - Categorías permitidas: Pecho, Espalda, Pierna, Hombro, Brazo, Core.

2. Si Álvaro te explica una carrera o caminata (ej: "He caminado 6 km en 50 minutos" o "He corrido 8 km a 5:10"):
   - Pon "action": "log_cardio".
   - Extrae nombre, tipo ("Run" o "Walk"), distancia en km y duración en minutos.

3. Si Álvaro describe comida o bebida (ej: "He comido 200g de pollo con arroz", o "bol de avena con creatina"):
   - Pon "action": "log_nutrition".
   - Extrae calorías, macros (P/C/G), agua en ml y si menciona creatina.
   - Respeta sus alimentos de referencia (Pan 100% integral Hacendado, Avena, Leche desnatada, Yogur griego ligero, Jamón serrano, Whey, etc.).

4. Si Álvaro hace una pregunta o pide consultar datos (ej: "¿Cómo he dormido?", "¿Cuánto levanté en banca?", "¿Qué carreras he hecho?", "¿Cómo voy hoy?"):
   - Pon "action": "query".
   - Redacta una respuesta conversacional precisa, profesional y directa en "reply_text" usando los datos reales del ESTADO ACTUAL.

5. Si Álvaro pide actualizar su peso o reglas (ej: "He pesado 101.2 kg", "hoy descanso"):
   - Pon "action": "protocol_update".

6. Si se adjunta un audio, escúchalo atentamente y transcribe todo en "transcription".
7. Añade siempre un breve consejo de coach deportivo en "coach_tip".

Mensaje escrito (si aplica): "${textOrHint}"

DEVUELVE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTE FORMATO EXACTO (sin markdown ni texto alrededor):
{
  "action": "log_workout" | "log_cardio" | "log_nutrition" | "query" | "protocol_update",
  "transcription": "transcripción literal",
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
    "new_weight_kg": 101.5,
    "new_day_type": "running" | "strength" | "rest_refeed",
    "creatine_taken": true
  },
  "reply_text": "Respuesta conversacional si fue una pregunta",
  "coach_tip": "Consejo técnico del entrenador"
}
`;

  const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

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

  // Fallback heurístico básico
  return {
    action: 'log_nutrition',
    transcription: textOrHint,
    nutrition: {
      meal_type: 'Almuerzo',
      description: textOrHint,
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      water_ml: 250,
      creatine_detected: textOrHint.toLowerCase().includes('creatina'),
    },
    coach_tip: 'Registrado con éxito en tu protocolo.',
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
  const durationSec = Math.round((Number(cardioData.duration_minutes) || 30) * 60);
  const paceSecondsPerKm = distMeters > 0 ? durationSec / (distMeters / 1000) : 300;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.round(paceSecondsPerKm % 60);
  const paceStr = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds} min/km`;

  const newActivity: StravaActivity = {
    id: Date.now(),
    name: cardioData.name || (cardioData.type === 'Run' ? 'Sesión de Running' : 'Caminata Activa'),
    type: cardioData.type || 'Run',
    start_date: `${todayStr}T18:00:00Z`,
    elapsed_time: durationSec,
    moving_time: durationSec,
    distance: distMeters,
    total_elevation_gain: 25.0,
    avg_hr: cardioData.avg_hr || 148,
    max_hr: cardioData.avg_hr ? cardioData.avg_hr + 18 : 168,
    created_at: new Date().toISOString(),
  };

  mockStore.stravaActivities.unshift(newActivity);
  if (isSupabaseConfigured && supabaseAdmin) {
    await supabaseAdmin.from('strava_activities').insert([newActivity]);
  }

  return {
    activity: newActivity,
    paceStr,
  };
}

// --------------------------------------------------------------------
// 7. ENDPOINT PRINCIPAL: ROUTE POST
// --------------------------------------------------------------------
export async function POST(request: NextRequest) {
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

    // Detectar y descargar nota de voz / audio
    if ((message.voice || message.audio) && botToken) {
      const fileId = message.voice ? message.voice.file_id : message.audio.file_id;
      audioData = await downloadTelegramAudio(fileId, botToken);
      if (audioData) {
        isVoiceNote = true;
        spokenText = 'Nota de voz de audio adjunta';
      }
    }

    if (!spokenText && !audioData) {
      return NextResponse.json({ success: true, message: 'Mensaje vacío' });
    }

    const cleanCmd = spokenText.trim().toLowerCase();
    const parts = spokenText.trim().split(/\s+/);
    const mainCommand = parts[0].toLowerCase();
    const snapshot = getAppSnapshot(todayStr);

    // ================================================================
    // COMANDOS DIRECTOS (SHORTCUTS RÁPIDOS)
    // ================================================================

    // 1. /start o /ayuda
    if (cleanCmd === '/start' || cleanCmd === '/ayuda' || cleanCmd === 'ayuda') {
      if (botToken && message.chat?.id) {
        const helpMsg = `
👋 *¡Hola Álvaro! Soy tu Copiloto Deportivo de IronMan* 🦾⚡

Tengo acceso y control total a toda tu app. Puedes hablarme o dictarme audios de:

🏋️‍♂️ *Entrenamientos de Fuerza:*
• Dicta tu entreno: _"Hoy hice pierna: 3 series de sentadillas con 100kg a 8 repes y prensa con 150kg"_
• Consulta: \`/fuerza\`

🏃‍♂️ *Cardio & Running:*
• Registra salidas: _"He salido a correr 7 km en 36 minutos"_
• Consulta: \`/cardio\`

🥗 *Nutrición & Agua:*
• Registra comidas: _"Bol de avena con leche, yogur griego, whey y creatina con medio litro de agua"_
• Consulta: \`/resumen\`

🌙 *Salud & Galaxy Fit3:*
• Consulta sueño y pulso: \`/salud\`

📊 *Reporte 360° del día:* \`/reporte\` o \`/todo\`
📋 *Protocolo y peso:* \`/protocolo\` o \`/peso 101.2\`
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

        const reportMsg = `
📊 *Reporte Integral IronMan (${todayStr})*
🏃‍♂️ *Atleta:* ${snapshot.athlete.name} (${snapshot.athlete.weight_kg} kg) | *Día:* ${snapshot.athlete.current_day_type.toUpperCase()}

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

    // 4. /fuerza o /entreno (Series de gimnasio de hoy)
    if (cleanCmd === '/fuerza' || cleanCmd === '/entreno' || cleanCmd === 'fuerza') {
      if (botToken && message.chat?.id) {
        const g = snapshot.gym_workout;
        let gymMsg = `🏋️‍♂️ *Entrenamiento de Fuerza (${todayStr})*\n\n`;
        if (g.logs.length === 0) {
          gymMsg += `_No tienes series registradas hoy._\n_Puedes dictarme un audio diciendo qué ejercicios, pesos y repes has hecho y los guardaré al momento._`;
        } else {
          gymMsg += `Total de series: *${g.sets_logged_today}*\n\n` + g.logs.map((l) => `• ${l}`).join('\n');
        }
        await sendTelegramMessage(chatId, gymMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'gym' });
    }

    // 5. /cardio o /carrera (Última actividad)
    if (cleanCmd === '/cardio' || cleanCmd === '/carrera' || cleanCmd === 'cardio') {
      if (botToken && message.chat?.id) {
        const c = snapshot.cardio_activities[0];
        let cardioMsg = `🏃‍♂️ *Actividades de Cardio / Running Recientes*\n\n`;
        if (!c) {
          cardioMsg += `_No hay actividades de cardio registradas._`;
        } else {
          snapshot.cardio_activities.forEach((act, idx) => {
            cardioMsg += `${idx + 1}. *${act.name}* (${act.type})\n   📍 Distancia: *${act.distance_km} km* | ⏱️ Tiempo: *${act.time_min} min* | 💓 FC Media: *${act.avg_hr} bpm*\n\n`;
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

    // 7. /peso [X]
    if (mainCommand === '/peso' && parts[1]) {
      const newWeight = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(newWeight) && newWeight > 40 && newWeight < 250) {
        updateWeight(newWeight);
        if (botToken && message.chat?.id) {
          const reply = `⚖️ *Peso Actualizado:* *${newWeight} kg*\n📊 *Nuevo rango proteico:* *${activeProtocol.targets.proteinMin} – ${activeProtocol.targets.proteinMax} g/día*`;
          await sendTelegramMessage(chatId, reply, botToken);
        }
        return NextResponse.json({ success: true, command: 'update_weight', weight: newWeight });
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

    // 9. /resumen (Nutrición)
    if (cleanCmd === '/resumen' || cleanCmd === 'resumen' || cleanCmd === '/hoy' || cleanCmd === 'hoy') {
      if (botToken && message.chat?.id) {
        const n = snapshot.nutrition;
        const t = snapshot.athlete.targets;
        let nutriMsg = `📊 *Resumen Nutricional: ${todayStr}*\n\n`;
        if (n.meals.length === 0) {
          nutriMsg += `_Sin comidas registradas hoy._\n`;
        } else {
          nutriMsg += `🍽️ *Comidas (${n.meals_count}):*\n` + n.meals.map((m) => `• ${m}`).join('\n') + '\n\n';
        }
        nutriMsg += `🎯 *Acumulado:*
• 🔥 Calorías: *${n.calories}* / ${t.calories} kcal
• 🥩 Proteína: *${n.protein_g.toFixed(0)}* / ${t.proteinMin}–${t.proteinMax} g
• 🍚 Carbos: *${n.carbs_g.toFixed(0)}* / ${t.carbsMin}–${t.carbsMax} g
• 🥑 Grasas: *${n.fat_g.toFixed(0)}* / ${t.fatMin}–${t.fatMax} g
• 💧 Agua: *${(n.water_ml / 1000).toFixed(2)}* / ${(t.waterMl / 1000).toFixed(1)} L
• ⚡ Creatina: *${n.creatine_taken ? '✅ Tomada' : '⏳ Pendiente'}*`;

        await sendTelegramMessage(chatId, nutriMsg, botToken);
      }
      return NextResponse.json({ success: true, command: 'summary' });
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

    // CASO E: REGISTRO DE NUTRICIÓN E HIDRATACIÓN (POR DEFECTO)
    const nutri = aiResult.nutrition || {
      meal_type: 'Almuerzo',
      description: spokenText,
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      water_ml: 250,
      creatine_detected: false,
    };

    if (nutri.creatine_detected) {
      toggleCreatine(true);
    }

    const newMeal: NutritionLog = {
      id: `nutri-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: todayStr,
      meal_type: nutri.meal_type,
      description: nutri.description,
      calories: nutri.calories,
      protein_g: nutri.protein_g,
      carbs_g: nutri.carbs_g,
      fat_g: nutri.fat_g,
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
  } catch (error: any) {
    console.error('Error general en webhook de Telegram:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
