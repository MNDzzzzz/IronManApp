// ====================================================================
// ALGORITMO DE FUSIÓN Y ALINEACIÓN TEMPORAL DE SERIES DE DATOS
// Especialista: Backend & Integration Engineer (Skill: strava-healthconnect-integrator)
// Fusiona los puntos GPS/ritmo de Strava con el pulso de la Samsung Galaxy Fit3
// ====================================================================

import { StreamDataPoint, HeartRateSample, CardioSplit, CardioActivity } from '@/types/database';

export interface BiometricFusionResult {
  avg_hr: number;
  max_hr: number;
  min_hr?: number;
  splits: CardioSplit[];
  extracted_from_text: number | null;
  samples_matched_count: number;
  source_applied: 'fit3_samples' | 'title_caption_regex' | 'activity_existing' | 'none';
  time_in_zones?: {
    z1_seconds: number;
    z2_seconds: number;
    z3_seconds: number;
    z4_seconds: number;
    z5_seconds: number;
  };
}

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

/**
 * Extrae mediante expresiones regulares cualquier mención explícita de frecuencia cardíaca
 * en títulos de Strava o comentarios/caption del usuario.
 *
 * Ejemplos admitidos:
 * - "Rodaje 5k (142 bpm)", "140 ppm", "138 pulsaciones", "145 lpm", "142 latidos"
 * - "FC: 142", "FC media 142", "Pulso: 140", "HR: 145", "142 pulsaciones/min"
 * - "(142)", "142 de media", etc.
 */
export function extractHeartRateFromText(text?: string | null): number | null {
  if (!text || typeof text !== 'string') return null;

  const patterns = [
    // 1. Mención explícita con unidades biométricas: 142 bpm, 140 ppm, 138 pulsaciones, 145 lpm, 142 latidos
    /(?:^|[^\d])(\d{2,3})\s*(?:bpm|ppm|lpm|pulsaciones(?:\/min)?|latidos(?:\/min)?)(?:[^\d]|$)/i,

    // 2. Prefijos de pulso: FC: 142, FC media 142, Pulso 140, HR 145, Heart rate: 145
    /(?:fc|pulso|heart\s*rate|hr)(?:\s*(?:media|promedio|medio|avg))?\s*[:=~-]?\s*(\d{2,3})(?:[^\d]|$)/i,

    // 3. Sufijos en español: 142 de pulso, 142 de media, 142 pulsaciones
    /(?:^|[^\d])(\d{2,3})\s*(?:de\s+pulso|de\s+media|de\s+fc)(?:[^\d]|$)/i,

    // 4. Paréntesis con número en rango fisiológico: (142 bpm), (142 ppm), (142)
    /[\(\[]\s*(\d{2,3})\s*(?:bpm|ppm|lpm|pulsaciones)?\s*[\)\]]/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      // Rango cardiovascular plausible para un ser humano entrenando (80 a 220 bpm)
      if (!isNaN(val) && val >= 80 && val <= 220) {
        return val;
      }
    }
  }

  return null;
}

/**
 * Convierte un string de ritmo deportivo ("5:38 /km", "05:38", "5'38\"") a segundos por kilómetro
 */
export function parsePaceToSeconds(paceStr?: string | null): number | null {
  if (!paceStr || typeof paceStr !== 'string') return null;
  const match = paceStr.match(/(\d{1,2})[:'’](\d{2})/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  }
  return null;
}

/**
 * Fusiona los parciales por kilómetro (splits) de Strava con la telemetría cardíaca
 * registrada por la Galaxy Fit3 y/o las anotaciones en texto del usuario.
 *
 * @param activityData Datos de la actividad de carrera (Strava o manual)
 * @param fit3Samples Muestras de frecuencia cardíaca de la Galaxy Fit3 (Health Connect)
 * @param userCaptionOrTitle Texto adicional ingresado por el usuario o extraído de la captura
 * @param userMaxHr Frecuencia cardíaca máxima para cálculo de zonas (por defecto 190 bpm)
 */
export function fuseStravaSplitsWithFit3(
  activityData: Partial<CardioActivity>,
  fit3Samples: HeartRateSample[] = [],
  userCaptionOrTitle?: string,
  userMaxHr = 190
): BiometricFusionResult {
  // 1. Detección de texto de pulso en caption o título
  const combinedText = [
    userCaptionOrTitle || '',
    activityData.name || '',
    activityData.notes || '',
  ].join(' ');
  const extractedHr = extractHeartRateFromText(combinedText);

  // 2. Extraer fecha objetivo de la actividad
  const rawDate = activityData.start_date || new Date().toISOString();
  const targetDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

  // 3. Filtrar muestras de la Galaxy Fit3 que coincidan con la fecha de la actividad
  const daySamples = (fit3Samples || []).filter((s) => {
    if (!s || !s.timestamp) return false;
    if (s.timestamp.startsWith(targetDateStr)) return true;
    try {
      const d = new Date(s.timestamp);
      if (isNaN(d.getTime())) return false;
      const utcDate = d.toISOString().split('T')[0];
      if (utcDate === targetDateStr) return true;
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d);
      return localDate === targetDateStr;
    } catch {
      return false;
    }
  });

  // Duración estimada de la actividad en segundos
  const durationSec = Math.max(
    60,
    activityData.moving_time ||
      activityData.elapsed_time ||
      (Array.isArray(activityData.splits) && activityData.splits.length > 0
        ? activityData.splits.length * 330
        : 1800)
  );

  const startMs = !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate).getTime() : NaN;
  const endMs = !isNaN(startMs) ? startMs + durationSec * 1000 : NaN;

  // 4. Localizar la ventana de entrenamiento de las muestras Fit3
  let workoutSamples: HeartRateSample[] = [];

  // Intento A: Alineación exacta por timestamp si start_date no es hora por defecto o coincide
  if (!isNaN(startMs) && !isNaN(endMs)) {
    const windowMatches = daySamples.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= startMs - 120_000 && t <= endMs + 120_000;
    });

    if (windowMatches.length >= 3) {
      workoutSamples = windowMatches;
    }
  }

  // Intento B: Si no hay match temporal exacto, filtrar muestras en rango activo (>= 110 bpm)
  if (workoutSamples.length < 3) {
    const activeSamples = daySamples
      .filter((s) => s.bpm >= 110)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (activeSamples.length > 0) {
      // Agrupar en clusters consecutivos (máximo 10 min de separación entre muestras)
      const clusters: HeartRateSample[][] = [];
      let currentCluster: HeartRateSample[] = [activeSamples[0]];

      for (let i = 1; i < activeSamples.length; i++) {
        const prevT = new Date(activeSamples[i - 1].timestamp).getTime();
        const currT = new Date(activeSamples[i].timestamp).getTime();
        if (currT - prevT <= 600_000) {
          currentCluster.push(activeSamples[i]);
        } else {
          clusters.push(currentCluster);
          currentCluster = [activeSamples[i]];
        }
      }
      clusters.push(currentCluster);

      // Elegir el cluster más representativo según la duración de la sesión
      clusters.sort((a, b) => {
        const durA = Math.abs(
          (new Date(a[a.length - 1].timestamp).getTime() - new Date(a[0].timestamp).getTime()) / 1000 - durationSec
        );
        const durB = Math.abs(
          (new Date(b[b.length - 1].timestamp).getTime() - new Date(b[0].timestamp).getTime()) / 1000 - durationSec
        );
        return durA !== durB ? durA - durB : b.length - a.length;
      });

      workoutSamples = clusters[0];
    }
  }

  // Intento C: Si sigue sin haber muestras >= 110 bpm pero hay muestras moderadas (>= 95 bpm, CaCo suave)
  if (workoutSamples.length === 0 && daySamples.length > 0) {
    const moderate = daySamples
      .filter((s) => s.bpm >= 95)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (moderate.length > 0) {
      workoutSamples = moderate;
    }
  }

  // 5. Determinar FC media y máxima globales
  let finalAvgHr = 0;
  let finalMaxHr = 0;
  let finalMinHr = 0;
  let sourceApplied: 'fit3_samples' | 'title_caption_regex' | 'activity_existing' | 'none' = 'none';

  if (workoutSamples.length > 0) {
    const sum = workoutSamples.reduce((acc, s) => acc + s.bpm, 0);
    finalAvgHr = Math.round(sum / workoutSamples.length);
    finalMaxHr = Math.max(...workoutSamples.map((s) => s.bpm));
    finalMinHr = Math.min(...workoutSamples.map((s) => s.bpm));
    sourceApplied = 'fit3_samples';
  } else if (extractedHr !== null) {
    finalAvgHr = extractedHr;
    finalMaxHr = Math.round(extractedHr * 1.12);
    finalMinHr = Math.round(extractedHr * 0.88);
    sourceApplied = 'title_caption_regex';
  } else if (activityData.avg_hr && activityData.avg_hr > 0) {
    finalAvgHr = Math.round(activityData.avg_hr);
    finalMaxHr = activityData.max_hr ? Math.round(activityData.max_hr) : Math.round(finalAvgHr * 1.12);
    finalMinHr = Math.round(finalAvgHr * 0.88);
    sourceApplied = 'activity_existing';
  } else {
    finalAvgHr = 142; // Fallback fisiológico base para carrera continua
    finalMaxHr = 158;
    finalMinHr = 125;
    sourceApplied = 'none';
  }

  // 6. Preparar lista de splits (km 1, km 2, ...)
  let workingSplits: CardioSplit[] = [];
  if (Array.isArray(activityData.splits) && activityData.splits.length > 0) {
    workingSplits = activityData.splits.map((s) => ({ ...s }));
  } else {
    // Generar splits de 1 km a partir de la distancia
    const distM = activityData.distance || 5000;
    const numKm = Math.max(1, Math.floor(distM / 1000));
    const avgSecPerKm = Math.round(durationSec / numKm);
    const m = Math.floor(avgSecPerKm / 60);
    const s = avgSecPerKm % 60;
    const paceStr = `${m}:${s < 10 ? '0' : ''}${s} /km`;

    for (let k = 1; k <= numKm; k++) {
      workingSplits.push({
        km: k,
        pace: paceStr,
        time_seconds: avgSecPerKm,
        elevation_diff_m: 0,
      });
    }
  }

  // 7. Calcular duración en segundos de cada tramo
  const splitDurations = workingSplits.map((sp) => {
    if (sp.time_seconds && sp.time_seconds > 0) return sp.time_seconds;
    const parsed = parsePaceToSeconds(sp.pace);
    if (parsed && parsed > 0) return parsed;
    return Math.round(durationSec / workingSplits.length);
  });
  const totalSplitsTime = splitDurations.reduce((acc, v) => acc + v, 0) || durationSec;

  // 8. Asignar FC media a cada split
  if (sourceApplied === 'fit3_samples' && workoutSamples.length > 0) {
    const sortedSamples = [...workoutSamples].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const t0 = new Date(sortedSamples[0].timestamp).getTime();
    const tLast = new Date(sortedSamples[sortedSamples.length - 1].timestamp).getTime();
    const spanMs = Math.max(1000, tLast - t0);

    let accumSec = 0;
    for (let i = 0; i < workingSplits.length; i++) {
      const startFrac = accumSec / totalSplitsTime;
      const endFrac = (accumSec + splitDurations[i]) / totalSplitsTime;
      accumSec += splitDurations[i];

      const splitStartMs = t0 + startFrac * spanMs;
      const splitEndMs = t0 + endFrac * spanMs;

      // Buscar muestras comprendidas en la ventana temporal del split
      const samplesInSplit = sortedSamples.filter((s) => {
        const t = new Date(s.timestamp).getTime();
        return t >= splitStartMs && t <= splitEndMs;
      });

      if (samplesInSplit.length > 0) {
        const sum = samplesInSplit.reduce((acc, s) => acc + s.bpm, 0);
        workingSplits[i].avg_hr = Math.round(sum / samplesInSplit.length);
      } else {
        // En caso de intervalo sin muestras, interpolar con la muestra más cercana al centro del split
        const midMs = (splitStartMs + splitEndMs) / 2;
        let closest = sortedSamples[0];
        let minDiff = Math.abs(new Date(sortedSamples[0].timestamp).getTime() - midMs);
        for (let j = 1; j < sortedSamples.length; j++) {
          const diff = Math.abs(new Date(sortedSamples[j].timestamp).getTime() - midMs);
          if (diff < minDiff) {
            minDiff = diff;
            closest = sortedSamples[j];
          }
        }
        workingSplits[i].avg_hr = closest.bpm;
      }
      workingSplits[i].time_seconds = splitDurations[i];
    }
  } else {
    // Si no disponemos de muestras continuas pero conocemos la FC promedio (por regex del título o actividad)
    // Modelamos la FC por tramos considerando deriva cardiovascular progresiva y variaciones de ritmo
    const nSplits = workingSplits.length;
    const avgDuration = totalSplitsTime / (nSplits || 1);

    const rawEstimates: number[] = [];
    for (let i = 0; i < nSplits; i++) {
      // 1. Deriva cardíaca natural en carrera continua (~6 bpm de incremento del km 1 al final)
      const driftEffect = nSplits > 1 ? ((i / (nSplits - 1)) - 0.5) * 6 : 0;

      // 2. Efecto de ritmo: si un km fue más rápido que la media, mayor pulso relativo
      const paceDiffSec = avgDuration - splitDurations[i];
      const paceEffect = Math.max(-5, Math.min(5, paceDiffSec * 0.15));

      rawEstimates.push(finalAvgHr + driftEffect + paceEffect);
    }

    // Normalizar para que la media ponderada de los splits coincida exactamente con finalAvgHr
    const meanRaw = rawEstimates.reduce((acc, v) => acc + v, 0) / (nSplits || 1);
    const adjustment = finalAvgHr - meanRaw;

    for (let i = 0; i < nSplits; i++) {
      const calculatedHr = Math.round(rawEstimates[i] + adjustment);
      // Mantener en rango fisiológico
      workingSplits[i].avg_hr = Math.max(90, Math.min(210, calculatedHr));
      workingSplits[i].time_seconds = splitDurations[i];
    }
  }

  // 9. Cálculo de distribución de zonas cardíacas
  const timeInZones = {
    z1_seconds: 0,
    z2_seconds: 0,
    z3_seconds: 0,
    z4_seconds: 0,
    z5_seconds: 0,
  };

  if (workoutSamples.length > 0) {
    const sampleDelta = Math.max(1, Math.round(durationSec / workoutSamples.length));
    workoutSamples.forEach((s) => {
      const zone = calculateHrZone(s.bpm, userMaxHr);
      if (zone === 'Z1') timeInZones.z1_seconds += sampleDelta;
      else if (zone === 'Z2') timeInZones.z2_seconds += sampleDelta;
      else if (zone === 'Z3') timeInZones.z3_seconds += sampleDelta;
      else if (zone === 'Z4') timeInZones.z4_seconds += sampleDelta;
      else if (zone === 'Z5') timeInZones.z5_seconds += sampleDelta;
    });
  }

  // 10. Mutar el objeto de actividad recibido para consistencia directa
  if (activityData) {
    activityData.avg_hr = finalAvgHr;
    activityData.max_hr = finalMaxHr;
    activityData.splits = workingSplits;
  }

  return {
    avg_hr: finalAvgHr,
    max_hr: finalMaxHr,
    min_hr: finalMinHr,
    splits: workingSplits,
    extracted_from_text: extractedHr,
    samples_matched_count: workoutSamples.length,
    source_applied: sourceApplied,
    time_in_zones: timeInZones,
  };
}
