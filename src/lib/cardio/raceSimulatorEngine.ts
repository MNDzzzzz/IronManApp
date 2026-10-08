/**
 * Motor de Simulación y Estrategia de Carrera: Media Maratón (28-Feb-2027)
 * Proyección de tiempo basada en bioenergética de peso corporal,
 * avituallamiento intra-carrera de carbohidratos/geles y estimación de carga rotuliana.
 */

export const RACE_DISTANCE_KM = 21.097;
export const RACE_DATE_TARGET = '2027-02-28';

export interface RaceSimulationParams {
  currentWeightKg: number;
  projectedWeightKg: number;
  basePaceMinKm: number; // Ritmo en min/km (ej: 5.5 = 5:30)
  targetCadenceSpm?: number;
  cacoProtocol?: boolean;
}

export interface GelMilestone {
  km: number;
  title: string;
  carbsG: number;
  hasCaffeine: boolean;
  timingMinutes: number;
  advice: string;
}

export interface HydrationMilestone {
  km: number;
  amountMl: number;
  timingMinutes: number;
  beverage: string;
}

export interface RaceSplit {
  km: number;
  paceStr: string;
  elapsedMinutes: number;
}

export interface RaceSimulationResult {
  raceDistanceKm: number;
  projectedPaceMinKm: number;
  projectedPaceStr: string;
  totalTimeSeconds: number;
  totalTimeMinutes: number;
  totalTimeFormatted: string;
  weightTimeSavedMinutes: number;
  gelMilestones: GelMilestone[];
  hydrationMilestones: HydrationMilestone[];
  kneeImpactTons: number;
  cadenceAdvice: string;
  splits: RaceSplit[];
}

/**
 * Formatea segundos totales a formato estándar "Xh Ym Zs"
 */
export function formatRaceTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}h ${mStr}m ${sStr}s`;
  }
  return `${minutes}m ${sStr}s`;
}

/**
 * Simula la Media Maratón del 28 de Febrero de 2027 para Álvaro
 */
export function simulateHalfMarathon2027(params: RaceSimulationParams): RaceSimulationResult {
  const {
    currentWeightKg,
    projectedWeightKg,
    basePaceMinKm,
    targetCadenceSpm = 170,
    cacoProtocol = false
  } = params;

  // Ritmo base en segundos por kilómetro
  const basePaceSec = basePaceMinKm * 60;

  // Ganancia por reducción ponderal: ~2.8 segundos/km ganados por kg de grasa reducido
  const weightLossKg = Math.max(0, currentWeightKg - projectedWeightKg);
  const secondsGainedPerKm = weightLossKg * 2.8;

  let projectedPaceSec = Math.max(240, basePaceSec - secondsGainedPerKm);

  // Si se utiliza protocolo CaCo (9 min trote / 1 min caminata activa)
  if (cacoProtocol) {
    projectedPaceSec += 8; // Añade ~8 s/km pero reduce drásticamente el lactato y la carga tendinosa
  }

  const projectedPaceMinKm = Number((projectedPaceSec / 60).toFixed(2));
  const paceMinutes = Math.floor(projectedPaceSec / 60);
  const paceSeconds = Math.round(projectedPaceSec % 60);
  const projectedPaceStr = `${paceMinutes}:${String(paceSeconds).padStart(2, '0')} /km`;

  const totalTimeSeconds = Math.round(projectedPaceSec * RACE_DISTANCE_KM);
  const totalTimeMinutes = Number((totalTimeSeconds / 60).toFixed(1));
  const totalTimeFormatted = formatRaceTime(totalTimeSeconds);

  // Minutos ahorrados gracias a la bajada de peso
  const weightTimeSavedMinutes = Number(((secondsGainedPerKm * RACE_DISTANCE_KM) / 60).toFixed(1));

  // Cronograma de nutrición: Geles en Km 6 y Km 12
  const timeAtKm6 = Math.round((projectedPaceSec * 6) / 60);
  const timeAtKm12 = Math.round((projectedPaceSec * 12) / 60);

  const gelMilestones: GelMilestone[] = [
    {
      km: 6,
      title: 'Gel 1: Hidratos de absorción rápida',
      carbsG: 30,
      hasCaffeine: false,
      timingMinutes: timeAtKm6,
      advice: 'Tomar 500m antes del avituallamiento para acompañar con 100-150ml de agua.'
    },
    {
      km: 12,
      title: 'Gel 2: Con Cafeína (50mg)',
      carbsG: 30,
      hasCaffeine: true,
      timingMinutes: timeAtKm12,
      advice: 'Aporte de cafeína para mantener la activación neuromuscular en el tramo decisivo.'
    }
  ];

  // Cronograma de hidratación: cada 5 km
  const hydrationMilestones: HydrationMilestone[] = [
    {
      km: 5,
      amountMl: 150,
      timingMinutes: Math.round((projectedPaceSec * 5) / 60),
      beverage: 'Bebida isotónica con sales'
    },
    {
      km: 10,
      amountMl: 150,
      timingMinutes: Math.round((projectedPaceSec * 10) / 60),
      beverage: 'Agua mineral (junto al gel del km 12)'
    },
    {
      km: 15,
      amountMl: 150,
      timingMinutes: Math.round((projectedPaceSec * 15) / 60),
      beverage: 'Isotónico / Agua para evitar deshidratación tardía'
    }
  ];

  // Cálculo de Carga de Impacto en Rodillas (Toneladas)
  // Pasos totales = (tiempo en minutos) * cadencia (pasos/min)
  const totalSteps = Math.round((totalTimeSeconds / 60) * targetCadenceSpm);
  
  // Factor de cadencia: cadencia alta (>172) reduce la fuerza máxima en cada apoyo
  let cadenceFactor = 1.0;
  if (targetCadenceSpm >= 172) {
    cadenceFactor = 0.85;
  } else if (targetCadenceSpm < 165) {
    cadenceFactor = 1.15;
  }

  // Fuerza media por paso = ~3.2 veces el peso corporal en carrera de asfalto
  const totalImpactKg = totalSteps * (projectedWeightKg * 3.2) * cadenceFactor;
  const kneeImpactTons = Number((totalImpactKg / 1000).toFixed(1));

  let cadenceAdvice = '';
  if (targetCadenceSpm < 165) {
    cadenceAdvice = 'Cadencia baja (<165 ppm): Se recomienda aumentar a 170-174 ppm para acortar la zancada y reducir hasta un 20% el impacto sobre el tendón rotuliano.';
  } else if (targetCadenceSpm >= 172) {
    cadenceAdvice = 'Cadencia óptima (≥172 ppm): Minimiza el tiempo de contacto en suelo y optimiza el retroceso elástico del tendón de Aquiles y rotuliano.';
  } else {
    cadenceAdvice = 'Cadencia adecuada (165-171 ppm): Zona media funcional.';
  }

  // Splits por tramos principales (km 5, 10, 15, 20, 21.1)
  const splitPoints = [5, 10, 15, 20, 21.097];
  const splits: RaceSplit[] = splitPoints.map((km) => ({
    km,
    paceStr: projectedPaceStr,
    elapsedMinutes: Number(((projectedPaceSec * km) / 60).toFixed(1))
  }));

  return {
    raceDistanceKm: RACE_DISTANCE_KM,
    projectedPaceMinKm,
    projectedPaceStr,
    totalTimeSeconds,
    totalTimeMinutes,
    totalTimeFormatted,
    weightTimeSavedMinutes,
    gelMilestones,
    hydrationMilestones,
    kneeImpactTons,
    cadenceAdvice,
    splits
  };
}
