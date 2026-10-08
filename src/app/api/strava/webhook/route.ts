// ====================================================================
// WEBHOOK OFICIAL DE STRAVA API V3
// Especialista: Backend & Integration Engineer (Skill: strava-healthconnect-integrator)
// Maneja el handshake GET hub.challenge y los eventos POST de nuevas actividades
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { StravaWebhookEvent, StravaActivity, StreamDataPoint, HeartRateSample } from '@/types/database';
import { mergeStravaWithFit3HeartRate, fuseStravaSplitsWithFit3 } from '@/lib/merging/temporalAligner';

/**
 * 1. HANDSHAKE GET DE STRAVA:
 * Strava llama a este endpoint al configurar la suscripción al webhook.
 * Exige responder con el valor exacto de hub.challenge y código HTTP 200 en < 2 segundos.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.STRAVA_VERIFY_TOKEN || 'ironman_strava_webhook_token_secure';

  if (mode === 'subscribe' && verifyToken === expectedToken) {
    console.log('✅ Handshake de suscripción a Webhook de Strava validado con éxito.');
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  }

  return NextResponse.json(
    { error: 'Token de verificación de Strava inválido.' },
    { status: 403 }
  );
}

/**
 * 2. RECEPCIÓN DE EVENTOS POST DE STRAVA:
 * Notificación cuando se sube o finaliza una actividad desde el iPhone 15 Pro.
 */
export async function POST(request: NextRequest) {
  try {
    const event: StravaWebhookEvent & { simulation_data?: Partial<StravaActivity> } = await request.json();

    console.log(`📥 Evento de Webhook Strava recibido: [${event.aspect_type}] en ${event.object_type} #${event.object_id}`);

    // Solo procesamos creación o actualización de actividades
    if (event.object_type !== 'activity') {
      return NextResponse.json({ acknowledged: true });
    }

    if (event.aspect_type === 'delete') {
      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.from('strava_activities').delete().eq('id', event.object_id);
      }
      mockStore.stravaActivities = mockStore.stravaActivities.filter((a) => a.id !== event.object_id);
      return NextResponse.json({ acknowledged: true, deleted: event.object_id });
    }

    // Datos simulados recibidos en pruebas o llamada a la API de Strava en producción
    let activityData: StravaActivity;

    if (event.simulation_data) {
      activityData = {
        id: event.object_id,
        name: event.simulation_data.name || 'Entrenamiento Strava',
        type: event.simulation_data.type || 'Run',
        start_date: event.simulation_data.start_date || new Date().toISOString(),
        elapsed_time: event.simulation_data.elapsed_time || 1800,
        moving_time: event.simulation_data.moving_time || 1750,
        distance: event.simulation_data.distance || 5000,
        total_elevation_gain: event.simulation_data.total_elevation_gain || 40,
        summary_polyline: event.simulation_data.summary_polyline || '',
        streams_data: event.simulation_data.streams_data || [],
      };
    } else {
      // En producción con token de Strava real:
      // Consultaríamos GET https://www.strava.com/api/v3/activities/{id}
      // y GET https://www.strava.com/api/v3/activities/{id}/streams
      activityData = {
        id: event.object_id,
        name: 'Carrera Registrada en Strava',
        type: 'Run',
        start_date: new Date(event.event_time * 1000).toISOString(),
        elapsed_time: 1800,
        moving_time: 1750,
        distance: 5200,
        total_elevation_gain: 35,
        streams_data: [],
      };
    }

    // 3. RECUPERAR MUESTRAS DE PULSO DE LA GALAXY FIT3 PARA EL CRUCE
    let fit3Samples: HeartRateSample[] = [];

    if (isSupabaseConfigured && supabaseAdmin) {
      const startTime = new Date(activityData.start_date).toISOString();
      const endTime = new Date(
        new Date(activityData.start_date).getTime() + (activityData.elapsed_time + 120) * 1000
      ).toISOString();

      const { data: dbSamples } = await supabaseAdmin
        .from('heart_rate_samples')
        .select('*')
        .gte('timestamp', startTime)
        .lte('timestamp', endTime);

      if (dbSamples && dbSamples.length > 0) {
        fit3Samples = dbSamples;
      }
    }

    // Si no hay en Supabase o estamos en demo local, consultar del mockStore
    if (fit3Samples.length === 0) {
      const startMs = new Date(activityData.start_date).getTime();
      const endMs = startMs + (activityData.elapsed_time + 120) * 1000;
      fit3Samples = mockStore.hrSamples.filter((s) => {
        const t = new Date(s.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    // 4. EJECUTAR EL ALGORITMO DE FUSIÓN DE PULSO Y TRACK GPS
    if (activityData.streams_data && activityData.streams_data.length > 0) {
      const merged = mergeStravaWithFit3HeartRate(
        activityData.start_date,
        activityData.streams_data,
        fit3Samples
      );
      activityData.merged_hr_data = merged.merged_streams;
      activityData.avg_hr = merged.avg_hr;
      activityData.max_hr = merged.max_hr;
    }

    // Fusión biométrica de parciales (splits km 1, km 2...) con la Fit3 o título
    fuseStravaSplitsWithFit3(activityData, fit3Samples, activityData.name);

    // 5. GUARDAR LA ACTIVIDAD FUSIONADA
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('strava_activities').upsert(
        {
          id: activityData.id,
          name: activityData.name,
          type: activityData.type,
          start_date: activityData.start_date,
          elapsed_time: activityData.elapsed_time,
          moving_time: activityData.moving_time,
          distance: activityData.distance,
          total_elevation_gain: activityData.total_elevation_gain,
          summary_polyline: activityData.summary_polyline,
          streams_data: activityData.streams_data,
          merged_hr_data: activityData.merged_hr_data,
          avg_hr: activityData.avg_hr,
          max_hr: activityData.max_hr,
        },
        { onConflict: 'id' }
      );
    }

    // Actualizar también almacén en memoria
    const existIdx = mockStore.stravaActivities.findIndex((a) => a.id === activityData.id);
    if (existIdx >= 0) {
      mockStore.stravaActivities[existIdx] = activityData;
    } else {
      mockStore.stravaActivities.unshift(activityData);
    }

    return NextResponse.json({
      acknowledged: true,
      activity_id: activityData.id,
      merged_samples_count: activityData.merged_hr_data?.length || 0,
      avg_hr: activityData.avg_hr,
    });
  } catch (error: any) {
    console.error('Error al procesar webhook de Strava:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
