// ====================================================================
// ALGORITMO DE FUSIÓN Y ALINEACIÓN TEMPORAL DE SERIES DE DATOS
// Especialista: Backend & Integration Engineer (Skill: strava-healthconnect-integrator)
// Fusiona los puntos GPS/ritmo de Strava con el pulso de la Samsung Galaxy Fit3
// ====================================================================

import { StreamDataPoint, HeartRateSample } from '@/types/database';

export interface MergedActivityResult {
  merged_streams: StreamDataPoint[];
  avg_hr: number;
  max_hr: number;
  min_hr: number;
  time_in_zones: {
    z1_seconds: number; // Recuperación (< 60% FC max)
    z2_seconds: number; // Resistencia aeróbica (60-70% FC max)
    z3_seconds: number; // Tempo aeróbico (70-80% FC max)
    z4_seconds: number; // Umbral anaeróbico (80-90% FC max)
    z5_seconds: number; // Esfuerzo máximo (> 90% FC max)
  };
}

/**
 * Determina la zona de frecuencia cardíaca según una FC máxima estimada (por defecto 190 bpm)
 */
export function calculateHrZone(bpm: number, maxHr = 190): 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' {
  const percentage = (bpm / maxHr) * 100;
  if (percentage < 60) return 'Z1';
  if (percentage < 70) return 'Z2';
  if (percentage < 80) return 'Z3';
  if (percentage < 90) return 'Z4';
  return 'Z5';
}

/**
 * Convierte velocidad (m/s) en ritmo deportivo de carrera (minutos y segundos por km)
 */
export function velocityToPaceMinKm(velocityMs: number): number {
  if (!velocityMs || velocityMs <= 0.5) return 0; // Detenido o andando extremadamente despacio
  const paceSecondsPerKm = 1000 / velocityMs;
  return Number((paceSecondsPerKm / 60).toFixed(2));
}

/**
 * Fusiona la serie temporal de Strava con las muestras de pulso de la Galaxy Fit3
 * mediante interpolación temporal y búsqueda del vecino más cercano.
 */
export function mergeStravaWithFit3HeartRate(
  startDateIso: string,
  stravaStreams: StreamDataPoint[],
  fit3Samples: HeartRateSample[],
  userMaxHr = 190
): MergedActivityResult {
  if (!stravaStreams || stravaStreams.length === 0) {
    return {
      merged_streams: [],
      avg_hr: 0,
      max_hr: 0,
      min_hr: 0,
      time_in_zones: { z1_seconds: 0, z2_seconds: 0, z3_seconds: 0, z4_seconds: 0, z5_seconds: 0 },
    };
  }

  const startTimestampMs = new Date(startDateIso).getTime();

  // Ordenar muestras de la Fit3 cronológicamente
  const sortedSamples = [...fit3Samples].map((s) => ({
    timeMs: new Date(s.timestamp).getTime(),
    bpm: s.bpm,
  })).sort((a, b) => a.timeMs - b.timeMs);

  let totalBpm = 0;
  let countBpm = 0;
  let maxBpm = 0;
  let minBpm = 999;

  const timeInZones = {
    z1_seconds: 0,
    z2_seconds: 0,
    z3_seconds: 0,
    z4_seconds: 0,
    z5_seconds: 0,
  };

  const mergedStreams: StreamDataPoint[] = stravaStreams.map((point, index) => {
    // Timestamp absoluto de este punto en el track de Strava
    const currentPointTimeMs = startTimestampMs + (point.time || 0) * 1000;

    let assignedBpm: number | undefined = undefined;

    if (sortedSamples.length > 0) {
      // Búsqueda binaria o búsqueda del punto más cercano en el tiempo
      let closestSample = sortedSamples[0];
      let smallestDiff = Math.abs(sortedSamples[0].timeMs - currentPointTimeMs);

      for (let i = 1; i < sortedSamples.length; i++) {
        const diff = Math.abs(sortedSamples[i].timeMs - currentPointTimeMs);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestSample = sortedSamples[i];
        } else if (sortedSamples[i].timeMs > currentPointTimeMs && diff > smallestDiff) {
          // Ya nos estamos alejando
          break;
        }
      }

      // Tolerancia: si la muestra de la Fit3 está dentro de una ventana razonable (máx 120s)
      if (smallestDiff <= 120 * 1000) {
        assignedBpm = closestSample.bpm;
      }
    }

    // Si no hay pulso real registrado en ese segundo, estimar con el último conocido o promedio
    const finalBpm = assignedBpm || (countBpm > 0 ? Math.round(totalBpm / countBpm) : 145);
    const zone = calculateHrZone(finalBpm, userMaxHr);

    totalBpm += finalBpm;
    countBpm++;
    if (finalBpm > maxBpm) maxBpm = finalBpm;
    if (finalBpm < minBpm) minBpm = finalBpm;

    // Calcular duración de este segmento (habitualmente 1 segundo entre puntos)
    const prevTime = index > 0 ? (stravaStreams[index - 1].time || 0) : 0;
    const deltaSeconds = Math.max(1, (point.time || 0) - prevTime);

    if (zone === 'Z1') timeInZones.z1_seconds += deltaSeconds;
    else if (zone === 'Z2') timeInZones.z2_seconds += deltaSeconds;
    else if (zone === 'Z3') timeInZones.z3_seconds += deltaSeconds;
    else if (zone === 'Z4') timeInZones.z4_seconds += deltaSeconds;
    else if (zone === 'Z5') timeInZones.z5_seconds += deltaSeconds;

    const pace = point.velocity_smooth ? velocityToPaceMinKm(point.velocity_smooth) : undefined;

    return {
      ...point,
      bpm: finalBpm,
      zone,
      pace_min_km: pace,
    };
  });

  const avgBpm = countBpm > 0 ? Math.round(totalBpm / countBpm) : 0;

  return {
    merged_streams: mergedStreams,
    avg_hr: avgBpm,
    max_hr: maxBpm || avgBpm,
    min_hr: minBpm === 999 ? avgBpm : minBpm,
    time_in_zones: timeInZones,
  };
}
