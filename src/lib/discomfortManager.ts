// ====================================================================
// GESTOR GRADUADO DE MOLESTIAS Y ADAPTACIÓN PROPORCIONAL (IronManApp)
// Escala de 6 niveles (Muy leve a Lesión) sin hiperfoco ni dramatismo.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

export enum DiscomfortLevel {
  VERY_LIGHT = 1,    // 1: Muy leve (cede en caliente, calentamiento extra, 100% volumen)
  LIGHT = 2,         // 2: Leve (perceptible, reducción ligera 15-20% volumen, CaCo suave)
  MODERATE = 3,      // 3: Media (reducción 35%, sustitutos sin flexión profunda >90° ni impacto)
  MODERATE_HIGH = 4, // 4: Media-Alta (reducción 50-70%, sin impacto running, bici/elíptica)
  HIGH = 5,          // 5: Alta (100% descarga de la zona, +10% proteína, reposo activo)
  INJURY = 6,        // 6: Lesión (cese total de carga en zona, alerta clínica, PEACE & LOVE)
}

export interface DiscomfortReport {
  id?: string;
  userId?: string;
  bodyPartId: string;
  level: DiscomfortLevel;
  notes?: string;
  reportedAt?: Date;
}

export interface AdaptationStrategy {
  training: {
    volumeReductionPercent: number;
    volumeMultiplier?: number;
    intensityReductionPercent: number;
    intensityLimit?: number;
    substituteExercises?: string[];
    skipMuscleGroup: boolean;
    skipImpactRunning?: boolean;
    suspendImpact?: boolean;
    cardioAlternative?: string;
    warmupNote?: string;
  };
  nutrition: {
    proteinMultiplier: number;
    extraProteinG?: number;
    hydrationIncreaseMl: number;
    extraWaterMl?: number;
    suggestedSupplements: string[];
  };
  clinicalAlert: boolean;
  recommendationsMarkdown: string;
  coachNotice?: string;
}

export class DiscomfortManager {
  /**
   * Evalúa un reporte de molestia y genera una estrategia proporcional de adaptación.
   * Totalmente determinista e inmutable.
   */
  static evaluate(report: DiscomfortReport): AdaptationStrategy {
    const level = report.level;
    const isKnee = report.bodyPartId.toLowerCase().includes('knee') ||
                   report.bodyPartId.toLowerCase().includes('rodilla') ||
                   report.bodyPartId.toLowerCase().includes('patellar');

    switch (level) {
      case DiscomfortLevel.VERY_LIGHT: // Nivel 1
        return {
          training: {
            volumeReductionPercent: 0,
            volumeMultiplier: 1.0,
            intensityReductionPercent: 0,
            intensityLimit: 100,
            skipMuscleGroup: false,
            skipImpactRunning: false,
            suspendImpact: false,
            warmupNote: 'Realizar 5-7 min de calentamiento dinámico extendido y movilidad antes de la carga principal. Cede en caliente.',
          },
          nutrition: {
            proteinMultiplier: 1.0,
            extraProteinG: 0,
            hydrationIncreaseMl: 0,
            extraWaterMl: 0,
            suggestedSupplements: [],
          },
          clinicalAlert: false,
          recommendationsMarkdown: 'Molestia muy leve (nivel 1). Mantén tu sesión planificada completa; asegura buena activación de glúteo medio y cuádriceps.',
          coachNotice: 'Molestia muy leve (nivel 1). Mantén tu sesión planificada completa; asegura buena activación de glúteo medio y cuádriceps.',
        };

      case DiscomfortLevel.LIGHT: // Nivel 2
        return {
          training: {
            volumeReductionPercent: 18,
            volumeMultiplier: 0.85,
            intensityReductionPercent: 10,
            intensityLimit: 90,
            skipMuscleGroup: false,
            skipImpactRunning: false,
            suspendImpact: false,
            cardioAlternative: isKnee ? 'CACO_CONSERVATIVE' : undefined,
            warmupNote: 'Calentamiento con activación isométrica previa (Wall-sits 2x30s). Pausas ampliadas +30s.',
          },
          nutrition: {
            proteinMultiplier: 1.0,
            extraProteinG: 0,
            hydrationIncreaseMl: 100,
            extraWaterMl: 100,
            suggestedSupplements: ['Magnesio'],
          },
          clinicalAlert: false,
          recommendationsMarkdown: 'Molestia leve (nivel 2). Reducción prudente de volumen (-18%). En carrera se aplica CaCo suave manteniendo cadencia fluida.',
          coachNotice: 'Molestia leve (nivel 2). Reducción prudente de volumen (-18%). En carrera se aplica CaCo suave manteniendo cadencia fluida.',
        };

      case DiscomfortLevel.MODERATE: // Nivel 3
        return {
          training: {
            volumeReductionPercent: 35,
            volumeMultiplier: 0.70,
            intensityReductionPercent: 25,
            intensityLimit: 75,
            skipMuscleGroup: false,
            skipImpactRunning: false,
            suspendImpact: false,
            substituteExercises: isKnee
              ? ['Isométricos Wall-sit 4x45s', 'Prensa Inclinada rango 0-70°', 'Puente Glúteo Unilateral']
              : ['Isométricos y movilidad asistida'],
            cardioAlternative: 'CACO_CONSERVATIVE',
            warmupNote: 'Evitar ángulos de flexión profunda >90°. Compensación de cadena posterior.',
          },
          nutrition: {
            proteinMultiplier: 1.0,
            extraProteinG: 0,
            hydrationIncreaseMl: 250,
            extraWaterMl: 250,
            suggestedSupplements: ['Omega 3', 'Colágeno con Vitamina C'],
          },
          clinicalAlert: false,
          recommendationsMarkdown: 'Molestia media (nivel 3). Se sustituyen ejercicios de impacto directo por isométricos analgésicos y prensa sin flexión extrema.',
          coachNotice: 'Molestia media (nivel 3). Se sustituyen ejercicios de impacto directo por isométricos analgésicos y prensa sin flexión extrema.',
        };

      case DiscomfortLevel.MODERATE_HIGH: // Nivel 4
        return {
          training: {
            volumeReductionPercent: 60,
            volumeMultiplier: 0.50,
            intensityReductionPercent: 40,
            intensityLimit: 60,
            skipMuscleGroup: false,
            skipImpactRunning: true,
            suspendImpact: true,
            substituteExercises: ['Bicicleta estática sillín alto 35m', 'Wall-sit isométrico 4x45s', 'Curl femoral tumbado'],
            cardioAlternative: 'BIKE_OR_ELLIPTICAL_LOW_IMPACT',
            warmupNote: 'Impacto suspendido. Transferencia a trabajo de bajo estrés articular.',
          },
          nutrition: {
            proteinMultiplier: 1.05,
            extraProteinG: 10,
            hydrationIncreaseMl: 500,
            extraWaterMl: 500,
            suggestedSupplements: ['Omega 3', 'Cúrcuma / Curcumina', 'Colágeno'],
          },
          clinicalAlert: false,
          recommendationsMarkdown: 'Molestia media-alta (nivel 4). Se suprime la carrera de impacto para descargar el tendón, manteniendo capacidad aeróbica en bicicleta/elíptica.',
          coachNotice: 'Molestia media-alta (nivel 4). Se suprime la carrera de impacto para descargar el tendón, manteniendo capacidad aeróbica en bicicleta/elíptica.',
        };

      case DiscomfortLevel.HIGH: // Nivel 5
        return {
          training: {
            volumeReductionPercent: 100,
            volumeMultiplier: 0.25,
            intensityReductionPercent: 80,
            intensityLimit: 20,
            skipMuscleGroup: true,
            skipImpactRunning: true,
            suspendImpact: true,
            substituteExercises: ['Movilidad sin carga', 'Trabajo de tren superior', 'Core y estabilidad lumbar'],
            warmupNote: 'Descarga completa del grupo muscular afectado. Mantener actividad en el resto del cuerpo.',
          },
          nutrition: {
            proteinMultiplier: 1.1, // +10% proteína para regeneración
            extraProteinG: 20,
            hydrationIncreaseMl: 750,
            extraWaterMl: 750,
            suggestedSupplements: ['Omega 3', 'Colágeno', 'Magnesio'],
          },
          clinicalAlert: false,
          recommendationsMarkdown: 'Molestia alta (nivel 5). Descanso activo de la zona afectada, refuerzo proteico (+10%) y mantenimiento de tren no involucrado.',
          coachNotice: 'Molestia alta (nivel 5). Descanso activo de la zona afectada, refuerzo proteico (+10%) y mantenimiento de tren no involucrado.',
        };

      case DiscomfortLevel.INJURY: // Nivel 6
      default:
        return {
          training: {
            volumeReductionPercent: 100,
            volumeMultiplier: 0.0,
            intensityReductionPercent: 100,
            intensityLimit: 0,
            skipMuscleGroup: true,
            skipImpactRunning: true,
            suspendImpact: true,
            warmupNote: 'Cese de carga en la zona. Reposo y protocolo PEACE & LOVE / RICE.',
          },
          nutrition: {
            proteinMultiplier: 1.15,
            extraProteinG: 30,
            hydrationIncreaseMl: 1000,
            extraWaterMl: 1000,
            suggestedSupplements: ['Colágeno', 'Omega 3', 'Vitamina C'],
          },
          clinicalAlert: true,
          recommendationsMarkdown: '⚠️ Alerta de Posible Lesión (nivel 6). Se recomienda suspender cargas en el segmento y realizar valoración fisioterapéutica especializada. Aplicar protocolo PEACE & LOVE.',
          coachNotice: '⚠️ Alerta de Posible Lesión (nivel 6). Se recomienda suspender cargas en el segmento y realizar valoración fisioterapéutica especializada. Aplicar protocolo PEACE & LOVE.',
        };
    }
  }

  /**
   * Extrae nivel de molestia y zona corporal a partir de lenguaje natural.
   */
  static triageMessage(text: string): { level: DiscomfortLevel; bodyPartId: string; notes?: string } | null {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    // 1. Detección de nivel explícito (1 al 6) o cualitativo
    let detectedLevel: DiscomfortLevel | null = null;
    const explicitLevelMatch = lower.match(/\bnivel\s*([1-6])\b/);

    if (explicitLevelMatch) {
      detectedLevel = parseInt(explicitLevelMatch[1], 10) as DiscomfortLevel;
    } else if (lower.includes('lesion') || lower.includes('lesión') || lower.includes('pinchazo agudo')) {
      detectedLevel = DiscomfortLevel.INJURY;
    } else if (lower.includes('molestia alta') || lower.includes('dolor fuerte')) {
      detectedLevel = DiscomfortLevel.HIGH;
    } else if (lower.includes('media alta') || lower.includes('media-alta')) {
      detectedLevel = DiscomfortLevel.MODERATE_HIGH;
    } else if (lower.includes('molestia media') || lower.includes('moderada')) {
      detectedLevel = DiscomfortLevel.MODERATE;
    } else if (lower.includes('muy leve') || lower.includes('rigidez matutina')) {
      detectedLevel = DiscomfortLevel.VERY_LIGHT;
    } else if (lower.includes('molestia leve') || lower.includes('leve')) {
      detectedLevel = DiscomfortLevel.LIGHT;
    }

    if (!detectedLevel) return null;

    // 2. Detección de zona corporal
    let bodyPart = 'rodilla_rotuliano';
    if (lower.includes('gemelo') || lower.includes('soleo') || lower.includes('pantorrilla')) {
      bodyPart = 'gemelo_soleo';
    } else if (lower.includes('hombro') || lower.includes('manguito')) {
      bodyPart = 'hombro';
    } else if (lower.includes('isquio') || lower.includes('femoral')) {
      bodyPart = 'isquiosurales';
    } else if (lower.includes('cuadriceps') || lower.includes('muslo')) {
      bodyPart = 'cuadriceps';
    } else if (lower.includes('tobillo') || lower.includes('aquiles')) {
      bodyPart = 'tobillo_aquiles';
    } else if (lower.includes('espalda') || lower.includes('lumbar')) {
      bodyPart = 'lumbar';
    } else if (lower.includes('rodilla') || lower.includes('rotula') || lower.includes('patellar')) {
      bodyPart = 'rodilla_patellar';
    }

    return {
      level: detectedLevel,
      bodyPartId: bodyPart,
      notes: text.trim(),
    };
  }
}
