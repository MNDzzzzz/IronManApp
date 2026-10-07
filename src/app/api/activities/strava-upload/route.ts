import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { CardioActivity } from '@/types/database';

function getSpainTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { imageBase64, mimeType = 'image/jpeg', caption = '' } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Se requiere la imagen en formato base64' },
        { status: 400 }
      );
    }

    // Validación de tamaño (máx 10MB)
    if (imageBase64.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'La imagen excede el límite permitido de 10MB' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }

    const todayStr = getSpainTodayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(yesterday);

    const prompt = `
Eres un entrenador de atletismo, fisioterapeuta biomecánico y analista de telemetría deportiva para Álvaro (101 kg, en preparación para la Media Maratón del 28 de Febrero de 2027).
Analiza esta imagen (captura de pantalla de la app Strava, Garmin, Apple Fitness o similar) y el comentario adjunto si lo hay: "${caption}".

Tu objetivo es extraer de forma estructurada y con la máxima precisión matemática:
1. Si la imagen es una sesión de carrera, rodaje, caminata o cardio (is_cardio_screenshot = true).
2. Título de la actividad: el nombre que aparece en Strava (ej: "Carrera matutina", "Rodaje suave CaCo") o un nombre adecuado.
3. Tipo: "Run" o "Walk".
4. FECHA DE LA ACTIVIDAD (activity_date): Extrae la fecha exacta en formato 'YYYY-MM-DD' en que se realizó la carrera. Hoy es ${todayStr}. Si dice 'Ayer', calcula ${yesterdayStr}. Si no se ve ninguna fecha, usa '${todayStr}'.
5. Distancia en kilómetros (número float, ej: 5.2).
6. Tiempo en movimiento en segundos (ej: 26:40 -> 1600 segundos).
7. Ritmo medio en formato texto ("5:32 /km").
8. Desnivel positivo acumulado en metros (ej: 34).
9. Calorías quemadas (kcal).
10. Pulso medio (avg_hr) y pulso máximo (max_hr).
11. Cadencia media (ppm).
12. PARCIALES POR KILÓMETRO (SPLITS): Si la captura muestra la tabla km a km:
    - km: número (1, 2, 3...)
    - pace: string de ritmo ("5:40 /km")
    - elevation_diff_m: número (+/- metros)
    - avg_hr: número
13. COACH_ASSESSMENT: Análisis biomecánico enfocado en la prevención articular de Álvaro (101 kg: cuidar tendón rotuliano y cintilla iliotibial, valorar si el ritmo fue regular o progresivo y la meta del 28 de febrero de 2027).

Devuelve ÚNICAMENTE un JSON con este formato:
{
  "is_cardio_screenshot": true,
  "name": "Rodaje Strava",
  "type": "Run",
  "activity_date": "${todayStr}",
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
    { "km": 1, "pace": "5:38 /km", "elevation_diff_m": 5 }
  ],
  "elevation_profile": "Perfil llano",
  "coach_assessment": "Excelente control aeróbico..."
}

Si la imagen NO es de deporte o carrera, devuelve:
{ "is_cardio_screenshot": false }
`;

    const resGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!resGemini.ok) {
      throw new Error(`Fallo en Gemini Vision API: HTTP ${resGemini.status}`);
    }

    const dataGemini = await resGemini.json();
    const rawText = dataGemini.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const analysis = JSON.parse(rawText);

    if (!analysis.is_cardio_screenshot) {
      return NextResponse.json({
        success: false,
        error: 'La imagen no parece ser una captura de entrenamiento de carrera o caminata.',
      }, { status: 422 });
    }

    // Procesar y consolidar la actividad
    const distMeters = Math.round((Number(analysis.distance_km) || 5) * 1000);
    const durationSec = Math.round(Number(analysis.moving_time_seconds) || 1800);
    const targetDate = analysis.activity_date || todayStr;
    const targetStartTime = `${targetDate}T18:00:00Z`;

    const finalActivity: CardioActivity = {
      id: Date.now(),
      name: analysis.name || 'Rodaje Strava',
      type: analysis.type || 'Run',
      start_date: targetStartTime,
      elapsed_time: Number(analysis.elapsed_time_seconds) || durationSec,
      moving_time: durationSec,
      distance: distMeters,
      total_elevation_gain: Number(analysis.elevation_gain_m) || 15,
      avg_hr: Number(analysis.avg_hr) || 142,
      max_hr: Number(analysis.max_hr) || 158,
      avg_cadence: Number(analysis.avg_cadence) || 168,
      calories: Number(analysis.calories) || Math.round((distMeters / 1000) * 85),
      splits: Array.isArray(analysis.splits) ? analysis.splits : [],
      elevation_profile: analysis.elevation_profile || '',
      source: 'web_upload_screenshot',
      notes: analysis.coach_assessment || 'Importado desde la interfaz web de IronManApp.',
      created_at: new Date().toISOString(),
    };

    // Guardar en mockStore
    mockStore.stravaActivities.unshift(finalActivity);

    // Guardar en Supabase si está disponible de forma asíncrona no bloqueante
    if (isSupabaseConfigured && supabaseAdmin) {
      Promise.resolve(
        supabaseAdmin.from('strava_activities').insert([
          {
            name: finalActivity.name,
            type: finalActivity.type,
            start_date: finalActivity.start_date,
            distance: finalActivity.distance,
            moving_time: finalActivity.moving_time,
            elapsed_time: finalActivity.elapsed_time,
            total_elevation_gain: finalActivity.total_elevation_gain,
            avg_hr: finalActivity.avg_hr,
            max_hr: finalActivity.max_hr,
            avg_cadence: finalActivity.avg_cadence,
            calories: finalActivity.calories,
            notes: finalActivity.notes,
            streams_data: {
              splits: finalActivity.splits,
              elevation_profile: finalActivity.elevation_profile,
            },
          },
        ])
      ).catch((err) => {
        console.warn('Aviso guardando actividad Strava en Supabase:', err);
      });
    }

    return NextResponse.json({
      success: true,
      activity: finalActivity,
      analysis: {
        distanceKm: analysis.distance_km,
        movingTimeSec: durationSec,
        paceStr: analysis.avg_pace_str,
        splits: finalActivity.splits,
        coachAssessment: analysis.coach_assessment,
      },
    });
  } catch (err: any) {
    console.error('Error procesando captura de Strava en /api/activities/strava-upload:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error analizando la captura de Strava' },
      { status: 500 }
    );
  }
}
