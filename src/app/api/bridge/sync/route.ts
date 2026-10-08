// ====================================================================
// ENDPOINT RECEPTOR DE SALUD: SAMSUNG GALAXY FIT3 VIA ANDROID PUENTE
// Especialista: Backend & Integration Engineer (Skill: strava-healthconnect-integrator)
// Recibe métricas de Health Connect (pasos, sueño, SpO2, FC) con autenticación por token
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { BridgeSyncPayload, DailyHealthMetric, HeartRateSample, CardioActivity } from '@/types/database';
import { mergeStravaWithFit3HeartRate, fuseStravaSplitsWithFit3 } from '@/lib/merging/temporalAligner';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de Seguridad Estricta con Token Secreto (Sin fallback hardcodeado)
    const expectedToken = process.env.BRIDGE_API_KEY;
    if (!expectedToken) {
      console.error('Alerta de seguridad: BRIDGE_API_KEY no configurado en variables de entorno.');
      return NextResponse.json(
        { success: false, error: 'Servicio no configurado: BRIDGE_API_KEY ausente.' },
        { status: 500 }
      );
    }
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

    // 5. Cruce retroactivo automático con actividades de Strava para enriquecer pulso y splits
    const affectedDates: string[] = [];
    const addDate = (d?: string | null) => {
      if (d && !affectedDates.includes(d)) {
        affectedDates.push(d);
      }
    };

    incomingHrSamples.forEach((sample) => {
      if (sample.timestamp) {
        addDate(sample.timestamp.split('T')[0]);
      }
    });
    if (incomingMetric.date) {
      addDate(incomingMetric.date);
    }
    if (affectedDates.length === 0) {
      addDate(todayStr);
    }

    let retroEnrichedCount = 0;

    // A. Enriquecimiento en memoria (mockStore.stravaActivities)
    for (const activity of mockStore.stravaActivities) {
      const actDate = activity.start_date ? activity.start_date.split('T')[0] : '';
      if (affectedDates.includes(actDate)) {
        // Comprobar si los splits carecen de pulso o si la actividad no tiene pulso
        const splitsNeedHr =
          !activity.splits ||
          activity.splits.length === 0 ||
          activity.splits.some((s) => !s.avg_hr || s.avg_hr === 0);
        const hrNeedsUpdate = !activity.avg_hr || activity.avg_hr === 0 || splitsNeedHr;

        if (hrNeedsUpdate) {
          const daySamples = mockStore.hrSamples.filter(
            (s) => s.timestamp && s.timestamp.startsWith(actDate)
          );
          if (daySamples.length > 0) {
            const fusion = fuseStravaSplitsWithFit3(activity, daySamples, activity.name);
            if (fusion.samples_matched_count > 0 || fusion.avg_hr > 0) {
              activity.avg_hr = fusion.avg_hr;
              activity.max_hr = fusion.max_hr;
              activity.splits = fusion.splits;
              retroEnrichedCount++;
            }
          }
        }

        // Si tiene streams detallados de GPS y falta la serie continua merged_hr_data
        if (
          activity.streams_data &&
          Array.isArray(activity.streams_data) &&
          activity.streams_data.length > 0
        ) {
          if (!activity.merged_hr_data || activity.merged_hr_data.length === 0) {
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
    }

    // B. Enriquecimiento en base de datos Supabase (si está configurada)
    if (isSupabaseConfigured && supabaseAdmin) {
      for (const dateStr of affectedDates) {
        try {
          const dayStart = `${dateStr}T00:00:00.000Z`;
          const dayEnd = `${dateStr}T23:59:59.999Z`;

          const { data: dbActivities } = await supabaseAdmin
            .from('strava_activities')
            .select('*')
            .gte('start_date', dayStart)
            .lte('start_date', dayEnd);

          if (dbActivities && dbActivities.length > 0) {
            const { data: dbHrSamples } = await supabaseAdmin
              .from('heart_rate_samples')
              .select('*')
              .gte('timestamp', dayStart)
              .lte('timestamp', dayEnd)
              .order('timestamp', { ascending: true });

            const samplesForFusion =
              dbHrSamples && dbHrSamples.length > 0
                ? dbHrSamples
                : mockStore.hrSamples.filter((s) => s.timestamp && s.timestamp.startsWith(dateStr));

            if (samplesForFusion.length > 0) {
              for (const dbAct of dbActivities) {
                const currentSplits = dbAct.streams_data?.splits || dbAct.splits || [];
                const splitsNeedHr =
                  !currentSplits ||
                  currentSplits.length === 0 ||
                  currentSplits.some((s: any) => !s.avg_hr || s.avg_hr === 0);
                const needsUpdate = !dbAct.avg_hr || dbAct.avg_hr === 0 || splitsNeedHr;

                if (needsUpdate) {
                  const tempAct: Partial<CardioActivity> = {
                    id: dbAct.id,
                    name: dbAct.name,
                    type: dbAct.type,
                    start_date: dbAct.start_date,
                    distance: dbAct.distance,
                    moving_time: dbAct.moving_time,
                    elapsed_time: dbAct.elapsed_time,
                    splits: currentSplits,
                    avg_hr: dbAct.avg_hr,
                    max_hr: dbAct.max_hr,
                  };

                  const fusion = fuseStravaSplitsWithFit3(tempAct, samplesForFusion, dbAct.name);

                  if (fusion.samples_matched_count > 0 || fusion.avg_hr > 0) {
                    await supabaseAdmin
                      .from('strava_activities')
                      .update({
                        avg_hr: fusion.avg_hr,
                        max_hr: fusion.max_hr,
                        streams_data: {
                          ...(typeof dbAct.streams_data === 'object' ? dbAct.streams_data : {}),
                          splits: fusion.splits,
                          fusion_source: fusion.source_applied,
                          samples_matched: fusion.samples_matched_count,
                          retroactive_synced_at: new Date().toISOString(),
                        },
                      })
                      .eq('id', dbAct.id);

                    // Sincronizar también con mockStore si la actividad está en memoria
                    const mIdx = mockStore.stravaActivities.findIndex(
                      (a) => String(a.id) === String(dbAct.id)
                    );
                    if (mIdx >= 0) {
                      mockStore.stravaActivities[mIdx].avg_hr = fusion.avg_hr;
                      mockStore.stravaActivities[mIdx].max_hr = fusion.max_hr;
                      mockStore.stravaActivities[mIdx].splits = fusion.splits;
                    }
                  }
                }
              }
            }
          }
        } catch (enrichErr) {
          console.warn('Aviso durante enriquecimiento retroactivo en Supabase:', enrichErr);
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
      retroactive_enrichment: {
        dates_checked: affectedDates,
        activities_enriched: retroEnrichedCount,
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
