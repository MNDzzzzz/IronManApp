/**
 * Motor Biomecánico de Carga Articular: ACWR & Knee Joint Strain Index (KJSI)
 * Modelo predictivo para prevención de recaídas en el tendón rotuliano y cintilla iliotibial
 * Calibrado específicamente para la biomecánica de Álvaro (101 kg -> 86 kg, zancada, cadencia).
 */

export interface DailyWorkloadSample {
  date: string;
  runningKm: number;
  gymVolumeKg: number;
  discomfortLevel?: number; // Escala 1 al 6
}

export type ACWRZone = 'UNDERLOAD' | 'OPTIMAL' | 'WARNING' | 'DANGER';

export interface ACWRResult {
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  zone: ACWRZone;
  isCalibrating: boolean;
  sampleCount: number;
}

export interface KJSICalculationParams {
  runningKm: number;
  cadenceSpm?: number;
  athleteWeightKg: number;
  legVolumeKg?: number;
  recentDiscomfortLevel?: number;
}

export interface JointStrainAssessment {
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  acwrZone: ACWRZone;
  kjsi: number; // 0 - 100
  kneeStatus: 'PROTECTED' | 'LOADED' | 'OVERLOADED';
  isCalibrating: boolean;
  clinicalAdvice: string;
  recommendations: string[];
}

// Factor de ponderación de unidad de carga diaria
function computeDayLoad(sample: DailyWorkloadSample): number {
  const kmLoad = sample.runningKm * 20; // 1 km = 20 unidades
  const gymLoad = sample.gymVolumeKg / 50; // 1000 kg = 20 unidades
  const discomfort = sample.discomfortLevel || 1;
  const discomfortMultiplier = 1 + (discomfort - 1) * 0.15;
  return (kmLoad + gymLoad) * discomfortMultiplier;
}

/**
 * Calcula el ratio de carga aguda:crónica (Acute:Chronic Workload Ratio)
 * Carga Aguda = promedio de los últimos 7 días
 * Carga Crónica = promedio de los últimos 28 días
 */
export function calculateACWR(samples: DailyWorkloadSample[]): ACWRResult {
  const sorted = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const sampleCount = sorted.length;
  const isCalibrating = sampleCount < 21;

  if (sampleCount === 0) {
    return {
      acuteLoad: 0,
      chronicLoad: 50,
      acwr: 0,
      zone: 'UNDERLOAD',
      isCalibrating: true,
      sampleCount: 0
    };
  }

  // Últimos 7 días
  const acuteWindow = sorted.slice(-7);
  const acuteSum = acuteWindow.reduce((acc, s) => acc + computeDayLoad(s), 0);
  const acuteLoad = Number((acuteSum / Math.max(1, acuteWindow.length)).toFixed(1));

  // Últimos 28 días (o los disponibles)
  const chronicWindow = sorted.slice(-28);
  const chronicSum = chronicWindow.reduce((acc, s) => acc + computeDayLoad(s), 0);
  let chronicLoad = Number((chronicSum / Math.max(1, chronicWindow.length)).toFixed(1));

  // Suelo basal (floor) para evitar divisiones por cero en semanas iniciales
  if (chronicLoad < 20) {
    chronicLoad = 20;
  }

  const rawAcwr = acuteLoad / chronicLoad;
  const acwr = Number(rawAcwr.toFixed(2));

  let zone: ACWRZone = 'OPTIMAL';
  if (acwr < 0.8) {
    zone = 'UNDERLOAD';
  } else if (acwr > 1.5) {
    zone = 'DANGER';
  } else if (acwr > 1.3) {
    zone = 'WARNING';
  } else {
    zone = 'OPTIMAL';
  }

  return {
    acuteLoad,
    chronicLoad,
    acwr,
    zone,
    isCalibrating,
    sampleCount
  };
}

/**
 * Calcula el Índice de Estrés Fémoro-Rotuliano (Knee Joint Strain Index, KJSI de 0 a 100)
 * Pondera fuerza de impacto reactiva según peso de Álvaro (101 kg vs meta 86 kg) y cadencia
 */
export function calculateKJSI(params: KJSICalculationParams): number {
  const {
    runningKm,
    cadenceSpm = 165,
    athleteWeightKg = 101,
    legVolumeKg = 0,
    recentDiscomfortLevel = 1
  } = params;

  // Impacto por peso: a 101 kg la fuerza sobre la rótula en aterrizaje es ~3.5x el peso corporal
  const weightFactor = athleteWeightKg / 86; // 101/86 = ~1.17

  // Factor de cadencia: <165 aumenta tiempo de frenado excéntrico en el tendón rotuliano (+25%)
  // >=172 aumenta pasos por minuto y reduce pico de impacto (-15%)
  let cadenceFactor = 1.0;
  if (cadenceSpm < 165) {
    cadenceFactor = 1.25;
  } else if (cadenceSpm >= 172) {
    cadenceFactor = 0.85;
  }

  // Impacto de carrera (base 0 - 60 puntos)
  const runningStrain = runningKm * 4.5 * weightFactor * cadenceFactor;

  // Carga de fuerza de pierna (base 0 - 25 puntos)
  const gymStrain = (legVolumeKg / 400);

  // Amplificador por molestias previas (1 al 6)
  const discomfortFactor = 1 + (recentDiscomfortLevel - 1) * 0.2;

  const rawScore = (runningStrain + gymStrain) * discomfortFactor;
  return Math.min(100, Math.max(0, Math.round(rawScore)));
}

/**
 * Realiza la evaluación biomecánica integral combinando ACWR y KJSI
 */
export function assessJointStrain(
  samples: DailyWorkloadSample[],
  athleteWeightKg: number = 101,
  cadenceSpm: number = 165
): JointStrainAssessment {
  const acwrData = calculateACWR(samples);
  const latestSample = samples.length > 0 ? samples[samples.length - 1] : { runningKm: 0, gymVolumeKg: 0, discomfortLevel: 1, date: '' };

  const kjsi = calculateKJSI({
    runningKm: latestSample.runningKm,
    cadenceSpm,
    athleteWeightKg,
    legVolumeKg: latestSample.gymVolumeKg,
    recentDiscomfortLevel: latestSample.discomfortLevel || 1
  });

  let kneeStatus: 'PROTECTED' | 'LOADED' | 'OVERLOADED' = 'PROTECTED';
  if (acwrData.zone === 'DANGER' || kjsi >= 70) {
    kneeStatus = 'OVERLOADED';
  } else if (acwrData.zone === 'WARNING' || kjsi >= 45) {
    kneeStatus = 'LOADED';
  } else {
    kneeStatus = 'PROTECTED';
  }

  let clinicalAdvice = '';
  const recommendations: string[] = [];

  switch (acwrData.zone) {
    case 'OPTIMAL':
      clinicalAdvice = `Carga aguda/crónica en Sweet Spot (${acwrData.acwr}). El tendón rotuliano tolera el estímulo con remodelación colágena positiva.`;
      recommendations.push('Mantener progresión gradual del volumen de carrera (+10% semanal máximo).');
      recommendations.push('Continuar con sentadillas isométricas en pared a 60° previas al rodaje.');
      break;
    case 'WARNING':
      clinicalAdvice = `Sobrecarga leve (${acwrData.acwr}). Se acerca al umbral de estrés reactivo del tendón cuadricipital.`;
      recommendations.push('Reducir carrera continua a método CaCo (4 min trote / 1 min caminata).');
      recommendations.push('Aumentar cadencia a >170 ppm para mitigar la fuerza de reacción del suelo.');
      break;
    case 'DANGER':
      clinicalAdvice = `¡Alerta de Spike de Carga! Ratio en zona crítica (${acwrData.acwr} > 1.5). Riesgo elevado de recaída tendinosa.`;
      recommendations.push('Suspender impacto en asfalto durante 48-72h (reemplazar por elíptica o nado).');
      recommendations.push('Aplicar protocolo RICE y desinflamación activa (flossing / foam roller en cuádriceps).');
      break;
    case 'UNDERLOAD':
      clinicalAdvice = `Infracarga detectada (${acwrData.acwr} < 0.8). Desentrenamiento o descarga excesiva que reduce la capacidad de carga del tendón.`;
      recommendations.push('Reintroducir carga mecánica controlada con ejercicios isométricos pesados.');
      recommendations.push('Programar rodaje suave R1 para reconstruir la tolerancia al impacto.');
      break;
  }

  if (kjsi >= 60) {
    recommendations.push('Monitorear rigidez matutina en el polo superior rotuliano.');
  }

  return {
    acuteLoad: acwrData.acuteLoad,
    chronicLoad: acwrData.chronicLoad,
    acwr: acwrData.acwr,
    acwrZone: acwrData.zone,
    kjsi,
    kneeStatus,
    isCalibrating: acwrData.isCalibrating,
    clinicalAdvice,
    recommendations
  };
}
