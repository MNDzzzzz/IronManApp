// ====================================================================
// MOTOR DE DIAGNÓSTICO CLÍNICO & COACH DE ALTO RENDIMIENTO
// Basado en la metodología oficial de preparación de Álvaro (101 kg)
// hacia la Media Maratón del 28 de Febrero de 2027 (21,097 km).
// Analiza 100% datos reales y prescribe ajustes biomecánicos exactos.
// ====================================================================

import { WeeklyReportDataset } from './weeklyDataAggregator';
import {
  getRunningProgressionForWeek,
  RunningWeekPlan,
  KNEE_CLINICAL_PROTOCOLS,
  WEEKLY_ROUTINE,
} from '@/lib/weeklyRoutine';

export interface ClinicalPoint {
  title: string;
  detail: string;
  impactLevel: 'high' | 'medium' | 'low';
}

export interface ArticularDiagnosis {
  status: 'optimal' | 'warning' | 'alert';
  headline: string;
  tendonCuadricipitalStatus: string;
  gerdyTubercleStatus: string;
  recommendedProtocols: string[];
}

export interface NextWeekPrescription {
  targetWeekNumber: number;
  phaseName: string;
  targetWeightRecommendation: string;
  calorieTarget: number;
  proteinTargetG: number;
  waterTargetL: number;
  runningSessions: {
    thursday: {
      session: string;
      km: number;
      targetPace: string;
      cadenceTarget: string;
    };
    sunday: {
      session: string;
      km: number;
      targetPace: string;
      cacoProtocol: string;
    };
  };
  gymAdjustments: {
    torsoFocus: string;
    legShieldFocus: string;
    fullbodyFocus: string;
    isometricsPrescribed: string;
  };
  restDaysRule: string;
}

export interface WeeklyClinicalAssessment {
  overallScore: number; // 0 a 100
  executiveHeadline: string;
  strengths: ClinicalPoint[];
  improvements: ClinicalPoint[];
  articularDiagnosis: ArticularDiagnosis;
  nextWeekPrescription: NextWeekPrescription;
  metricsAudit: {
    nutritionTrackingScore: string; // ej: "6 de 7 días (86%)"
    fit3TelemetryScore: string;
    cardioVolumeStatus: string;
    strengthVolumeStatus: string;
    weightDeltaStatus: string;
  };
}

/**
 * Genera el diagnóstico clínico y las adaptaciones para la semana siguiente
 * a partir de la recopilación de datos 100% reales.
 */
export function generateWeeklyClinicalAssessment(
  dataset: WeeklyReportDataset
): WeeklyClinicalAssessment {
  const { summary, days, weekNumber } = dataset;
  const latestWeightKg = summary.latestWeightKg;

  const strengths: ClinicalPoint[] = [];
  const improvements: ClinicalPoint[] = [];
  let scorePoints = 50; // Base neutral

  // --------------------------------------------------------------------
  // 1. AUDITORÍA DE PESAJE Y DÉFICIT CALÓRICO
  // --------------------------------------------------------------------
  let weightDeltaStatus = 'Sin variación registrada';
  if (summary.weightDeltaKg !== null) {
    const delta = summary.weightDeltaKg;
    if (delta <= -0.4 && delta >= -1.0) {
      strengths.push({
        title: `Pérdida de peso perfecta y sostenible (${delta > 0 ? '+' : ''}${delta} kg)`,
        detail: `Has bajado ${Math.abs(delta)} kg esta semana. Es el rango ideal (-0.5 a -0.8 kg/semana) para desgravar impacto en rodillas preservando el 100% de la masa muscular magra.`,
        impactLevel: 'high',
      });
      scorePoints += 15;
      weightDeltaStatus = `Óptimo (${delta} kg en la semana)`;
    } else if (delta < -1.1) {
      improvements.push({
        title: `Pérdida de peso acelerada (${delta} kg en la semana)`,
        detail: `Una bajada de más de 1.1 kg en una sola semana puede inducir fatiga central y debilidad en los tensores articulares. Aumenta ligeramente los hidratos complejos (arroz/patata en almuerzo y cena) para no comprometer el glucógeno de los rodajes.`,
        impactLevel: 'medium',
      });
      scorePoints += 5;
      weightDeltaStatus = `Muy rápida (${delta} kg - riesgo catabólico)`;
    } else if (delta > 0.3) {
      improvements.push({
        title: `Incremento de peso registrado (+${delta} kg)`,
        detail: `Si no ha habido salto calórico, puede deberse a retención hídrica por inflamación tendinosa o suplementación con creatina. Mantén la ingesta en 2.400 kcal estrictas y prioriza el descanso nocturno.`,
        impactLevel: 'medium',
      });
      scorePoints -= 5;
      weightDeltaStatus = `Aumento (+${delta} kg)`;
    } else {
      strengths.push({
        title: `Peso corporal estable (${summary.endWeightKg ?? latestWeightKg} kg)`,
        detail: `Variación neutra o mantenimiento de peso. El cuerpo consolida la recomposición muscular generada por las sesiones de fuerza.`,
        impactLevel: 'low',
      });
      scorePoints += 5;
      weightDeltaStatus = `Estable (${summary.endWeightKg ?? latestWeightKg} kg)`;
    }
  } else {
    improvements.push({
      title: 'Registro de pesaje incompleto en la semana',
      detail: 'Se recomienda pesarse en ayunas tras evacuar al menos 3 a 4 mañanas por semana para calcular la media móvil real sin interferencia de agua o glucógeno.',
      impactLevel: 'low',
    });
    weightDeltaStatus = 'Incompleto (pocos registros)';
  }

  // --------------------------------------------------------------------
  // 2. AUDITORÍA DE NUTRICIÓN & MACROS MERCADONA
  // --------------------------------------------------------------------
  const nutDaysCount = summary.daysWithNutritionCount;
  const nutritionTrackingScore = `${nutDaysCount}/7 días registrados (${Math.round((nutDaysCount / 7) * 100)}%)`;

  if (nutDaysCount >= 5) {
    strengths.push({
      title: `Alta constancia en registro nutricional (${nutDaysCount}/7 días)`,
      detail: `El pesaje exhaustivo con los alimentos de Mercadona garantiza un control milimétrico del balance energético.`,
      impactLevel: 'medium',
    });
    scorePoints += 10;

    // Evaluación de calorías
    if (summary.avgDailyCalories >= 2200 && summary.avgDailyCalories <= 2550) {
      strengths.push({
        title: `Déficit calórico clavado (~${summary.avgDailyCalories} kcal/día)`,
        detail: `Tu ingesta media se ajusta con exactitud al protocolo de 2.400 kcal (déficit de ~500-600 kcal con tu NEAT habitual).`,
        impactLevel: 'high',
      });
      scorePoints += 10;
    } else if (summary.avgDailyCalories < 2100 && summary.avgDailyCalories > 0) {
      improvements.push({
        title: `Calorías medias por debajo del objetivo (~${summary.avgDailyCalories} kcal/día)`,
        detail: `Un déficit excesivo con 101 kg y tiradas de running acelera el desgaste articular y retrasa la regeneración del colágeno tendinoso. Sube a las 2.400 kcal fijadas en tu plan.`,
        impactLevel: 'high',
      });
      scorePoints -= 5;
    } else if (summary.avgDailyCalories > 2650) {
      improvements.push({
        title: `Superávit o exceso calórico (~${summary.avgDailyCalories} kcal/día)`,
        detail: `Estás consumiendo ~${summary.avgDailyCalories - 2400} kcal extra al día. A 101 kg, cada kilo de más suma 4 kg de fuerza de impacto por zancada en carrera. Ajusta el menú estructurado de 2.400 kcal.`,
        impactLevel: 'medium',
      });
      scorePoints -= 5;
    }

    // Evaluación de proteína
    if (summary.avgDailyProteinG >= 185) {
      strengths.push({
        title: `Excelente aporte proteico (${summary.avgDailyProteinG} g/día)`,
        detail: `Cumples con el objetivo de ~2.0 g/kg de masa magra, fundamental para frenar el catabolismo y sintetizar colágeno en los tendones.`,
        impactLevel: 'high',
      });
      scorePoints += 10;
    } else if (summary.avgDailyProteinG > 0) {
      improvements.push({
        title: `Proteína por debajo de la meta (${summary.avgDailyProteinG} g vs 202 g objetivo)`,
        detail: `Te faltan ~${202 - summary.avgDailyProteinG} g de proteína diarios. Asegura los 300g de queso fresco batido 0%, el pollo/merluza y los huevos del menú base para blindar tendones y masa muscular.`,
        impactLevel: 'medium',
      });
    }

    // Evaluación de hidratación
    if (summary.avgWaterLiters >= 3.0) {
      strengths.push({
        title: `Hidratación óptima (${summary.avgWaterLiters} L de agua al día)`,
        detail: `Fluidez perfecta para lubricación de cartílago articular y disipación térmica.`,
        impactLevel: 'medium',
      });
      scorePoints += 5;
    } else if (summary.avgWaterLiters > 0) {
      improvements.push({
        title: `Hidratación deficiente (${summary.avgWaterLiters} L vs 3.5 - 4.0 L objetivo)`,
        detail: `Un tendón deshidratado pierde elasticidad y triplica la fricción mecánica contra el hueso. Lleva una botella contigo y bebe en tomas regulares.`,
        impactLevel: 'medium',
      });
    }
  } else {
    improvements.push({
      title: `Registro nutricional intermitente (${nutDaysCount}/7 días)`,
      detail: `Faltan días de registro en la app. La precisión en el pesaje es la clave maestra para llegar en 85-88 kg al 28 de Febrero.`,
      impactLevel: 'high',
    });
    scorePoints -= 10;
  }

  // --------------------------------------------------------------------
  // 3. AUDITORÍA BIOMECÁNICA: DESCANSO ARTICULAR & PASOS FIT3
  // --------------------------------------------------------------------
  const healthDaysCount = summary.daysWithHealthCount;
  const fit3TelemetryScore = `${healthDaysCount}/7 días sincronizados`;

  // Evaluar días de descanso (Miércoles y Sábado)
  const restDays = days.filter((d) => d.isRestDay);
  const restOverstepped = restDays.some((d) => d.health.steps > 10500);
  const restCompliant = restDays.every((d) => d.health.steps <= 9500 && d.health.hasData);

  let articularStatus: ArticularDiagnosis['status'] = 'optimal';
  let articularHeadline = 'Articulaciones estables y en proceso de compactación';

  if (restOverstepped) {
    articularStatus = 'warning';
    articularHeadline = 'Sobrecarga de impacto en días de desinflamación';
    improvements.push({
      title: `Exceso de pasos en días de descanso articular (${summary.restDaysAvgSteps.toLocaleString()} pasos de media)`,
      detail: `Los miércoles y sábados están pautados para descanso total (<9.000 pasos). Superar los 10.500 pasos impide que el líquido sinovial y los tejidos del tubérculo de Gerdy drenen la inflamación generada en carrera.`,
      impactLevel: 'high',
    });
    scorePoints -= 10;
  } else if (restCompliant) {
    strengths.push({
      title: 'Respeto riguroso de los descansos articulares',
      detail: `Has mantenido los pasos bajos (<9.000) en miércoles y sábados, permitiendo la descompresión total del tendón rotuliano y la cabeza del peroné.`,
      impactLevel: 'high',
    });
    scorePoints += 10;
  }

  // --------------------------------------------------------------------
  // 4. AUDITORÍA DE CARDIO & RUNNING (STRAVA / FIT3)
  // --------------------------------------------------------------------
  let cardioVolumeStatus = `${summary.totalCardioKm} km en ${summary.cardioSessionsCount} sesiones`;
  if (summary.cardioSessionsCount >= 2) {
    strengths.push({
      title: `Plan de rodajes completado (${summary.totalCardioKm} km totales)`,
      detail: `Has cumplido con las salidas de carrera semanales pautadas en la periodización.`,
      impactLevel: 'high',
    });
    scorePoints += 10;
  } else if (summary.cardioSessionsCount === 1) {
    improvements.push({
      title: `Solo 1 salida de carrera registrada (${summary.totalCardioKm} km)`,
      detail: `Para la media maratón del 28 de Febrero necesitamos consolidar 2 estímulos semanales: Rodaje base de jueves + Tirada larga de domingo.`,
      impactLevel: 'medium',
    });
  } else {
    improvements.push({
      title: 'Sin salidas de carrera registradas en la semana',
      detail: 'Si se debió a dolor articular, fue una decisión clínica correcta. Si no hubo dolor, retoma el protocolo CaCo el próximo jueves.',
      impactLevel: 'high',
    });
    cardioVolumeStatus = '0 km (Sin salidas registradas)';
  }

  // Comprobar ritmo medio de carrera
  // Si corrió a ritmos < 7:00 min/km con 101 kg, alertar de impacto
  const runsWithPace = days.flatMap((d) => d.cardio.activities).filter((a) => a.distance >= 2000);
  const fastRuns = runsWithPace.filter((a) => {
    const paceSec = ((a.moving_time || a.elapsed_time) / a.distance) * 1000;
    return paceSec < 420; // menos de 7:00 min/km
  });

  if (fastRuns.length > 0) {
    articularStatus = 'warning';
    improvements.push({
      title: 'Ritmo de carrera demasiado agresivo (<7:00 min/km a 101 kg)',
      detail: `Correr más rápido de 7:15 min/km en esta fase genera unas 4.500 frenadas violentas sobre el tendón cuadricipital. La velocidad llegará cuando bajes a 88 kg; ahora el objetivo es acumular tiempo en Zona 2 aeróbica sin fricción.`,
      impactLevel: 'high',
    });
    scorePoints -= 10;
  }

  // Comprobar cadencia
  const cadences = days.map((d) => d.cardio.avgCadence).filter((c): c is number => c !== null && c > 0);
  const avgCadence = cadences.length > 0
    ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length)
    : null;

  if (avgCadence && avgCadence < 162) {
    improvements.push({
      title: `Cadencia baja de carrera (~${avgCadence} ppm)`,
      detail: `Una cadencia por debajo de 165 ppm significa zancadas demasiado largas que impactan por delante de tu centro de gravedad, multiplicando el estrés sobre la inserción iliotibial. Acorta el paso a 168-172 ppm.`,
      impactLevel: 'medium',
    });
  } else if (avgCadence && avgCadence >= 165) {
    strengths.push({
      title: `Cadencia de carrera protectora (~${avgCadence} ppm)`,
      detail: `Pasos cortos y ágiles que descargan las rodillas y amortiguan con mediopié.`,
      impactLevel: 'high',
    });
    scorePoints += 5;
  }

  // --------------------------------------------------------------------
  // 5. AUDITORÍA DE FUERZA (GIMNASIO & BLINDAJE ARTICULAR)
  // --------------------------------------------------------------------
  let strengthVolumeStatus = `${summary.totalGymVolumeKg.toLocaleString()} kg (${summary.gymSessionsCount} sesiones)`;
  if (summary.gymSessionsCount >= 3) {
    strengths.push({
      title: `Microciclo de fuerza completado al 100% (${summary.gymSessionsCount} sesiones)`,
      detail: `Has completado el trío de fuerza (Torso + Pierna blindada + Full Body) moviendo un volumen de ${summary.totalGymVolumeKg.toLocaleString()} kg.`,
      impactLevel: 'high',
    });
    scorePoints += 15;
  } else if (summary.gymSessionsCount >= 2) {
    strengths.push({
      title: `Buen cumplimiento de fuerza (${summary.gymSessionsCount}/3 sesiones)`,
      detail: `Volumen movido: ${summary.totalGymVolumeKg.toLocaleString()} kg. Intenta asegurar la tercera sesión de estímulo funcional.`,
      impactLevel: 'medium',
    });
    scorePoints += 5;
  } else if (summary.gymSessionsCount === 1) {
    improvements.push({
      title: `Sesiones de gimnasio insuficientes (${summary.gymSessionsCount}/3 sesiones)`,
      detail: `El entrenamiento de fuerza es el pilar que protege tus articulaciones contra las cargas de la media maratón. Asegura al menos la sesión de pierna y torso.`,
      impactLevel: 'high',
    });
  } else {
    improvements.push({
      title: 'Semana sin entrenamientos de fuerza registrados',
      detail: 'Sin masa muscular fuerte en glúteos e isquiosurales, el impacto de correr a 101 kg recae íntegramente sobre los ligamentos de la rodilla.',
      impactLevel: 'high',
    });
    strengthVolumeStatus = '0 kg (Sin sesiones registradas)';
    scorePoints -= 15;
  }

  // Auditoría de ejercicios de protección de rodilla
  if (summary.kneeProtectorSetsCount >= 6) {
    strengths.push({
      title: `Blindaje articular ejecutado (${summary.kneeProtectorSetsCount} series de protección)`,
      detail: `Has acumulado series de isométricos (Wall-sits), abductores de glúteo medio y gemelos, asegurando la contención de la rótula.`,
      impactLevel: 'high',
    });
  } else if (summary.gymSessionsCount > 0) {
    improvements.push({
      title: 'Poco trabajo analítico de blindaje de rodilla',
      detail: 'Asegura en la rutina de pierna las 4 series de Wall-sits apoyado en pared (45 seg) y abductores para neutralizar el dolor del tubérculo de Gerdy.',
      impactLevel: 'high',
    });
  }

  // --------------------------------------------------------------------
  // 6. ESTADO ARTICULAR Y PRESCRIPCIÓN DE FISIOTERAPIA
  // --------------------------------------------------------------------
  const recommendedProtocols: string[] = [];

  let tendonCuadricipital = 'Sin dolor reportado. Preservar descanso.';
  let gerdyTubercle = 'Banda iliotibial desinflamada y sin tensión excesiva.';

  if (articularStatus === 'warning') {
    tendonCuadricipital = 'Tensión por impacto o pasos excesivos. Requiere isometría analgésica.';
    gerdyTubercle = 'Fricción rotacional en inserción lateral. Liberar TFL.';
    recommendedProtocols.push(
      'Sentadilla isométrica contra la pared (Wall-sits a 60-70° flexión, 4 series x 35-45s) antes de entrenar.',
      'Masaje con pelota o foam roller en tensor de la fascia lata y glúteo medio (JAMÁS directamente sobre el tubérculo inflamado).',
      'Hielo local en rodilla izquierda durante 10 minutos post-carrera.',
      'Recorte obligatorio de pasos en miércoles y sábado a menos de 9.000.'
    );
  } else {
    recommendedProtocols.push(
      'Wall-sits de mantenimiento (3 series x 35s como activación pre-carrera).',
      'Pelota de liberación miofascial bajo la fascia plantar 2 min por pie.',
      'Estiramiento suave de gemelos y sóleo contra la pared tras cada salida.'
    );
  }

  // --------------------------------------------------------------------
  // 7. PRESCRIPCIÓN DE LA SEMANA N+1 (PLANIFICACIÓN DE CARRERA & GYM)
  // --------------------------------------------------------------------
  const nextWeekNum = Math.min(weekNumber + 1, 22);
  const nextProgression = getRunningProgressionForWeek(nextWeekNum);

  const nextWeekPrescription: NextWeekPrescription = {
    targetWeekNumber: nextWeekNum,
    phaseName: nextProgression.phaseName,
    targetWeightRecommendation:
      summary.endWeightKg && summary.endWeightKg < 100.5
        ? `Consolidar los ${(summary.endWeightKg - 0.6).toFixed(1)} kg con déficit limpio de 2.400 kcal.`
        : 'Romper la barrera de los 100 kg hacia 99,5 kg manteniendo déficit controlado.',
    calorieTarget: 2400,
    proteinTargetG: 202,
    waterTargetL: 3.8,
    runningSessions: {
      thursday: {
        session: nextProgression.thursdaySession,
        km: nextProgression.thursdayKm,
        targetPace: '7:15 - 7:35 min/km (Zona 2 estricta)',
        cadenceTarget: '168 - 172 ppm',
      },
      sunday: {
        session: nextProgression.sundaySession,
        km: nextProgression.sundayKm,
        targetPace: '7:20 - 7:40 min/km',
        cacoProtocol:
          nextWeekNum <= 5
            ? 'Método CaCo: 4 min trote suave + 1 min andar ágil'
            : 'Carrera continua suave con pausas de hidratación',
      },
    },
    gymAdjustments: {
      torsoFocus: 'Press banca (mancuernas 50-60kg) + Remo en polea baja (50kg) + Elevaciones laterales.',
      legShieldFocus: 'Prensa inclinada (120kg) + 4x Wall-sits isométricos + Abductores (90kg) + Gemelos excéntricos.',
      fullbodyFocus: 'Peso muerto rumano + Clamshell con banda + 20 min bicicleta estática suave (sillín alto, drenaje sin impacto).',
      isometricsPrescribed: 'Wall-sits 4 series x 40 segundos los martes y viernes.',
    },
    restDaysRule: 'Miércoles y Sábado: Tope estricto de 8.000 - 9.000 pasos. Cero actividad deportiva.',
  };

  // Normalizar puntuación entre 20 y 98
  const finalScore = Math.max(20, Math.min(98, scorePoints));

  let executiveHeadline = 'Semana de progreso constante y blindaje deportivo';
  if (finalScore >= 85) {
    executiveHeadline = '¡Semana sobresaliente! Máxima adherencia al plan hacia los 21 km';
  } else if (finalScore < 60) {
    executiveHeadline = 'Semana con desvíos: es prioritario reordenar descansos y registros';
  }

  return {
    overallScore: finalScore,
    executiveHeadline,
    strengths,
    improvements,
    articularDiagnosis: {
      status: articularStatus,
      headline: articularHeadline,
      tendonCuadricipitalStatus: tendonCuadricipital,
      gerdyTubercleStatus: gerdyTubercle,
      recommendedProtocols,
    },
    nextWeekPrescription,
    metricsAudit: {
      nutritionTrackingScore,
      fit3TelemetryScore,
      cardioVolumeStatus,
      strengthVolumeStatus,
      weightDeltaStatus,
    },
  };
}
