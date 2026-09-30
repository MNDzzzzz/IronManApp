// ====================================================================
// ENDPOINT RECEPTOR DE SALUD: SAMSUNG GALAXY FIT3 VIA ANDROID PUENTE
// Especialista: Backend & Integration Engineer (Skill: strava-healthconnect-integrator)
// Recibe métricas de Health Connect (pasos, sueño, SpO2, FC) con autenticación por token
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { BridgeSyncPayload, DailyHealthMetric, HeartRateSample } from '@/types/database';
import { mergeStravaWithFit3HeartRate } from '@/lib/merging/temporalAligner';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de Seguridad con Token Secreto
    const expectedToken = process.env.BRIDGE_API_KEY || 'ironman_secret_fit3_token_2026';
    const clientToken =
      request.headers.get('x-bridge-token') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!clientToken || clientToken !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Token de puente inválido o ausente.' },
        { status: 401 }
      );
    }

    const payload: BridgeSyncPayload = await request.json();
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Procesamiento de Muestras de Frecuencia Cardíaca
    const incomingHrSamples: HeartRateSample[] = (payload.heart_rate_samples || []).map((sample) => ({
      timestamp: sample.timestamp,
      bpm: sample.bpm,
      source: 'galaxy_fit3',
    }));

    // 3. Procesamiento de Métricas Diarias (Sueño, Pasos, SpO2, FC Reposo)
    const incomingMetric: Partial<DailyHealthMetric> = payload.daily_metric || {};
    const metricDate = incomingMetric.date || todayStr;

    // --- MODO SUPABASE (Si está configurado) ---
    if (isSupabaseConfigured && supabaseAdmin) {
      // Inserción / Upsert de métrica diaria
      if (Object.keys(incomingMetric).length > 0) {
        await supabaseAdmin.from('daily_health_metrics').upsert(
          {
            date: metricDate,
            resting_hr: incomingMetric.resting_hr,
            sleep_duration_minutes: incomingMetric.sleep_duration_minutes,
            sleep_score: incomingMetric.sleep_score,
            deep_sleep_minutes: incomingMetric.deep_sleep_minutes,
            rem_sleep_minutes: incomingMetric.rem_sleep_minutes,
            light_sleep_minutes: incomingMetric.light_sleep_minutes,
            awake_minutes: incomingMetric.awake_minutes,
            spo2_avg: incomingMetric.spo2_avg,
            spo2_min: incomingMetric.spo2_min,
            total_steps: incomingMetric.total_steps || 0,
            active_calories: incomingMetric.active_calories || 0,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'date' }
        );
      }

      // Inserción en bloque de muestras de frecuencia cardíaca
      if (incomingHrSamples.length > 0) {
        await supabaseAdmin.from('heart_rate_samples').insert(incomingHrSamples);
      }
    }

    // --- MODO MEMORIA / DEMO LOCAL ---
    if (incomingHrSamples.length > 0) {
      mockStore.hrSamples.push(...incomingHrSamples);
    }

    if (Object.keys(incomingMetric).length > 0) {
      const existingIdx = mockStore.dailyMetrics.findIndex((m) => m.date === metricDate);
      const updatedMetric: DailyHealthMetric = {
        id: existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].id : `metric-${Date.now()}`,
        date: metricDate,
        resting_hr: incomingMetric.resting_hr ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].resting_hr : null),
        sleep_duration_minutes: incomingMetric.sleep_duration_minutes ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].sleep_duration_minutes : null),
        sleep_score: incomingMetric.sleep_score ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].sleep_score : null),
        deep_sleep_minutes: incomingMetric.deep_sleep_minutes ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].deep_sleep_minutes : null),
        rem_sleep_minutes: incomingMetric.rem_sleep_minutes ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].rem_sleep_minutes : null),
        light_sleep_minutes: incomingMetric.light_sleep_minutes ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].light_sleep_minutes : null),
        awake_minutes: incomingMetric.awake_minutes ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].awake_minutes : null),
        spo2_avg: incomingMetric.spo2_avg ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].spo2_avg : null),
        spo2_min: incomingMetric.spo2_min ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].spo2_min : null),
        total_steps: incomingMetric.total_steps ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].total_steps : 0),
        active_calories: incomingMetric.active_calories ?? (existingIdx >= 0 ? mockStore.dailyMetrics[existingIdx].active_calories : 0),
        synced_at: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        mockStore.dailyMetrics[existingIdx] = updatedMetric;
      } else {
        mockStore.dailyMetrics.unshift(updatedMetric);
      }
    }

    // 4. Procesamiento de Sesiones de Entrenamiento / Rodajes (Health Connect)
    const incomingWorkouts = payload.workouts || [];
    for (const w of incomingWorkouts) {
      const actId = w.id || Date.now() + Math.floor(Math.random() * 1000);
      const dist = Number(w.distance) || 4000;
      const elap = Number(w.elapsed_time) || 2100;
      const cadence = Number(w.avg_cadence) || 168;
      const cal = Number(w.calories) || Math.round((dist / 1000) * 85);

      const cardioAct = {
        id: actId,
        name: w.name || `Rodaje Galaxy Fit3 ${(dist / 1000).toFixed(1)} km`,
        type: w.type || 'Run',
        start_date: w.start_date || new Date().toISOString(),
        elapsed_time: elap,
        moving_time: w.moving_time || elap,
        distance: dist,
        total_elevation_gain: Number(w.total_elevation_gain) || 10,
        avg_hr: w.avg_hr || 142,
        max_hr: w.max_hr || 155,
        avg_cadence: cadence,
        calories: cal,
        source: 'galaxy_fit3' as const,
        notes: w.notes || 'Sesión de cardio sincronizada desde Galaxy Fit3.',
        zone_distribution: w.zone_distribution || {
          zone1_minutes: Math.round((elap / 60) * 0.15),
          zone2_minutes: Math.round((elap / 60) * 0.70),
          zone3_minutes: Math.round((elap / 60) * 0.15),
          zone4_minutes: 0,
          zone5_minutes: 0,
        },
      };

      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.from('strava_activities').upsert(
          {
            id: cardioAct.id,
            name: cardioAct.name,
            type: cardioAct.type,
            start_date: cardioAct.start_date,
            elapsed_time: cardioAct.elapsed_time,
            moving_time: cardioAct.moving_time,
            distance: cardioAct.distance,
            total_elevation_gain: cardioAct.total_elevation_gain,
            avg_hr: cardioAct.avg_hr,
            max_hr: cardioAct.max_hr,
            streams_data: {
              avg_cadence: cardioAct.avg_cadence,
              calories: cardioAct.calories,
              source: cardioAct.source,
              notes: cardioAct.notes,
              zone_distribution: cardioAct.zone_distribution,
            },
          },
          { onConflict: 'id' }
        );
      }

      const existIdx = mockStore.stravaActivities.findIndex((a) => a.id === cardioAct.id);
      if (existIdx >= 0) {
        mockStore.stravaActivities[existIdx] = cardioAct;
      } else {
        mockStore.stravaActivities.unshift(cardioAct);
      }
    }

    // 5. Cruce retroactivo automático con actividades pendientes de pulso
    for (const activity of mockStore.stravaActivities) {
      if (!activity.merged_hr_data || activity.merged_hr_data.length === 0 || !activity.avg_hr) {
        if (activity.streams_data && activity.streams_data.length > 0) {
          const merged = mergeStravaWithFit3HeartRate(
            activity.start_date,
            activity.streams_data,
            mockStore.hrSamples
          );
          if (merged.avg_hr > 0) {
            activity.merged_hr_data = merged.merged_streams;
            activity.avg_hr = merged.avg_hr;
            activity.max_hr = merged.max_hr;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización de Galaxy Fit3 completada con éxito.',
      records_received: {
        hr_samples: incomingHrSamples.length,
        has_daily_metric: Object.keys(incomingMetric).length > 0,
        workouts: incomingWorkouts.length,
      },
    });
  } catch (error: any) {
    console.error('Error al procesar sincronización del puente:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
