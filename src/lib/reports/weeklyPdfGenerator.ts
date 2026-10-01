// ====================================================================
// GENERADOR DE INFORMES SEMANALES EN PDF: IronManApp
// Construye un documento A4 vectorial de 3 páginas con pdf-lib:
// - Cero dependencias pesadas de Chromium o Puppeteer.
// - 100% datos reales de Galaxy Fit3, Strava, Gym, Nutrición y Báscula.
// - Diseño de alto contraste técnico (Dark Tech / IronMan Edition).
// ====================================================================

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { WeeklyReportDataset, WeeklyDayTelemetry } from './weeklyDataAggregator';
import { WeeklyClinicalAssessment } from './weeklyClinicalEngine';

// Dimensiones estándar A4 (en puntos tipográficos, 72 pt/pulgada)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36; // ~0.5 pulgada
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Paleta de Colores
const C_DARK_BG = rgb(0.06, 0.07, 0.09); // #0F1217
const C_CARD_BG = rgb(0.10, 0.12, 0.15); // #1A1F26
const C_CARD_BORDER = rgb(0.18, 0.20, 0.25); // #2E3340
const C_HEADER_BG = rgb(0.04, 0.05, 0.07);

const C_ORANGE = rgb(0.97, 0.45, 0.09); // #F97316 (IronMan Accent)
const C_EMERALD = rgb(0.06, 0.72, 0.50); // #10B981 (Aciertos)
const C_AMBER = rgb(0.96, 0.62, 0.04); // #F59E0B (Avisos)
const C_ROSE = rgb(0.94, 0.27, 0.38); // #F43F5E (Alertas)
const C_BLUE = rgb(0.02, 0.58, 0.98); // #0284C7 (Cardio / Fit3)

const C_TEXT_WHITE = rgb(0.98, 0.98, 1.0);
const C_TEXT_LIGHT = rgb(0.85, 0.88, 0.92);
const C_TEXT_MUTED = rgb(0.55, 0.59, 0.66);
const C_ROW_ALT = rgb(0.08, 0.09, 0.12);

/**
 * Trunca o ajusta texto para que no desborde un ancho determinado
 */
function sanitizeText(text: string): string {
  // Reemplazar caracteres no imprimibles o fuera de WinAnsi / Latin-1
  return text
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dibuja un rectángulo con esquinas (o simple) de fondo de tarjeta
 */
function drawCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor = C_CARD_BG,
  borderColor = C_CARD_BORDER
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: fillColor,
    borderColor,
    borderWidth: 1,
  });
}

/**
 * Dibuja el encabezado común en cada página
 */
function drawPageHeader(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  pageNumber: number,
  totalPages: number,
  dataset: WeeklyReportDataset
) {
  // Franja superior de fondo
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 48,
    width: PAGE_WIDTH,
    height: 48,
    color: C_HEADER_BG,
  });

  // Acento naranja superior
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 3,
    width: PAGE_WIDTH,
    height: 3,
    color: C_ORANGE,
  });

  // Título e identificador
  page.drawText('IRONMAN APP', {
    x: MARGIN,
    y: PAGE_HEIGHT - 26,
    size: 13,
    font: fontBold,
    color: C_ORANGE,
  });

  page.drawText('|  INFORME SEMANAL DE RENDIMIENTO & FISIOTERAPIA', {
    x: MARGIN + 95,
    y: PAGE_HEIGHT - 25,
    size: 9,
    font: fontBold,
    color: C_TEXT_LIGHT,
  });

  const rangeStr = `Semana ${dataset.weekNumber} (${dataset.startDate} a ${dataset.endDate})`;
  page.drawText(rangeStr, {
    x: PAGE_WIDTH - MARGIN - fontRegular.widthOfTextAtSize(rangeStr, 8),
    y: PAGE_HEIGHT - 25,
    size: 8,
    font: fontRegular,
    color: C_TEXT_MUTED,
  });

  // Número de página inferior
  page.drawText(`Página ${pageNumber} de ${totalPages} - Datos 100% Reales Auditados`, {
    x: MARGIN,
    y: 20,
    size: 8,
    font: fontRegular,
    color: C_TEXT_MUTED,
  });

  const disclaimer = 'Media Maraton (21,097 km) 28-Feb-2027';
  page.drawText(disclaimer, {
    x: PAGE_WIDTH - MARGIN - fontRegular.widthOfTextAtSize(disclaimer, 8),
    y: 20,
    size: 8,
    font: fontBold,
    color: C_ORANGE,
  });
}

/**
 * Genera el documento PDF completo a partir del dataset real y la evaluación clínica
 */
export async function generateWeeklyReportPdf(
  dataset: WeeklyReportDataset,
  assessment: WeeklyClinicalAssessment
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const totalPages = 3;

  // ====================================================================
  // PÁGINA 1: RESUMEN EJECUTIVO, BIOMETRÍA & TELEMETRÍA GALAXY FIT3
  // ====================================================================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: C_DARK_BG });
  drawPageHeader(page1, fontBold, fontRegular, 1, totalPages, dataset);

  let currentY = PAGE_HEIGHT - 65;

  // Tarjeta de Atleta & Estado de Preparación
  drawCard(page1, MARGIN, currentY, CONTENT_WIDTH, 52, C_CARD_BG, C_CARD_BORDER);

  page1.drawText('ATLETA: ALVARO', {
    x: MARGIN + 12,
    y: currentY - 18,
    size: 11,
    font: fontBold,
    color: C_TEXT_WHITE,
  });

  page1.drawText(`Masa actual: ${dataset.summary.latestWeightKg.toFixed(1)} kg   |   Objetivo carrera: 85 - 88 kg   |   Cuenta atras: ${dataset.countdown.daysRemaining} dias (${dataset.countdown.weeksRemaining} sem)`, {
    x: MARGIN + 12,
    y: currentY - 34,
    size: 9,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  const phaseTag = `${dataset.progressionPlan.phase}: ${dataset.progressionPlan.phaseName}`;
  page1.drawText(phaseTag, {
    x: MARGIN + CONTENT_WIDTH - fontBold.widthOfTextAtSize(phaseTag, 8) - 12,
    y: currentY - 18,
    size: 8,
    font: fontBold,
    color: C_ORANGE,
  });

  currentY -= 62;

  // Cuatro Tarjetas KPIs de Rendimiento
  const kpiWidth = (CONTENT_WIDTH - 24) / 4;
  const kpiHeight = 54;

  // KPI 1: Variacion de peso
  drawCard(page1, MARGIN, currentY, kpiWidth, kpiHeight);
  page1.drawText('VARIACION PESO', { x: MARGIN + 8, y: currentY - 14, size: 7, font: fontBold, color: C_TEXT_MUTED });
  const deltaStr = dataset.summary.weightDeltaKg !== null
    ? `${dataset.summary.weightDeltaKg > 0 ? '+' : ''}${dataset.summary.weightDeltaKg} kg`
    : 'Sin cambio';
  page1.drawText(deltaStr, {
    x: MARGIN + 8,
    y: currentY - 32,
    size: 14,
    font: fontBold,
    color: dataset.summary.weightDeltaKg && dataset.summary.weightDeltaKg <= -0.4 ? C_EMERALD : C_TEXT_WHITE,
  });
  page1.drawText(`Actual: ${dataset.summary.latestWeightKg} kg`, { x: MARGIN + 8, y: currentY - 45, size: 7, font: fontRegular, color: C_TEXT_MUTED });

  // KPI 2: Pasos Diarios Promedio
  const kpi2X = MARGIN + kpiWidth + 8;
  drawCard(page1, kpi2X, currentY, kpiWidth, kpiHeight);
  page1.drawText('PASOS PROMEDIO', { x: kpi2X + 8, y: currentY - 14, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText(`${dataset.summary.avgDailySteps.toLocaleString()}`, {
    x: kpi2X + 8,
    y: currentY - 32,
    size: 14,
    font: fontBold,
    color: C_BLUE,
  });
  page1.drawText(`Descanso: ${dataset.summary.restDaysAvgSteps.toLocaleString()} pasos`, { x: kpi2X + 8, y: currentY - 45, size: 7, font: fontRegular, color: C_TEXT_MUTED });

  // KPI 3: Carrera / Cardio
  const kpi3X = kpi2X + kpiWidth + 8;
  drawCard(page1, kpi3X, currentY, kpiWidth, kpiHeight);
  page1.drawText('VOLUMEN RUNNING', { x: kpi3X + 8, y: currentY - 14, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText(`${dataset.summary.totalCardioKm} km`, {
    x: kpi3X + 8,
    y: currentY - 32,
    size: 14,
    font: fontBold,
    color: C_ORANGE,
  });
  page1.drawText(`Ritmo: ${dataset.summary.avgCardioPaceStr || 'N/A'}`, { x: kpi3X + 8, y: currentY - 45, size: 7, font: fontRegular, color: C_TEXT_MUTED });

  // KPI 4: Fuerza / Gimnasio
  const kpi4X = kpi3X + kpiWidth + 8;
  drawCard(page1, kpi4X, currentY, kpiWidth, kpiHeight);
  page1.drawText('TONELAJE FUERZA', { x: kpi4X + 8, y: currentY - 14, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText(`${(dataset.summary.totalGymVolumeKg / 1000).toFixed(1)} tn`, {
    x: kpi4X + 8,
    y: currentY - 32,
    size: 14,
    font: fontBold,
    color: C_EMERALD,
  });
  page1.drawText(`${dataset.summary.gymSessionsCount} sesiones registradas`, { x: kpi4X + 8, y: currentY - 45, size: 7, font: fontRegular, color: C_TEXT_MUTED });

  currentY -= kpiHeight + 16;

  // Titular de la Tabla Diaria
  page1.drawText('TELEMETRIA DIARIA OFICIAL (LUNES A DOMINGO)', {
    x: MARGIN,
    y: currentY,
    size: 9,
    font: fontBold,
    color: C_TEXT_WHITE,
  });
  page1.drawText('Valores 100% reales de Galaxy Fit3, bascula y registros', {
    x: MARGIN + 260,
    y: currentY,
    size: 8,
    font: fontRegular,
    color: C_TEXT_MUTED,
  });

  currentY -= 12;

  // Tabla Tabular: Cabecera
  const rowHeight = 22;
  const colX = {
    day: MARGIN + 8,
    steps: MARGIN + 70,
    hr: MARGIN + 140,
    sleep: MARGIN + 205,
    kcal: MARGIN + 270,
    protein: MARGIN + 335,
    activity: MARGIN + 400,
  };

  drawCard(page1, MARGIN, currentY, CONTENT_WIDTH, 18, rgb(0.14, 0.16, 0.20), C_CARD_BORDER);
  page1.drawText('DIA', { x: colX.day, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('PASOS FIT3', { x: colX.steps, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('FC REPOSO', { x: colX.hr, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('SUENO', { x: colX.sleep, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('KCAL', { x: colX.kcal, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('PROTEINA', { x: colX.protein, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });
  page1.drawText('ACTIVIDAD REGISTRADA', { x: colX.activity, y: currentY - 12, size: 7, font: fontBold, color: C_TEXT_MUTED });

  currentY -= 18;

  // 7 Filas de la Tabla
  dataset.days.forEach((day, index) => {
    const isAlt = index % 2 === 1;
    drawCard(
      page1,
      MARGIN,
      currentY,
      CONTENT_WIDTH,
      rowHeight,
      isAlt ? C_ROW_ALT : C_CARD_BG,
      C_CARD_BORDER
    );

    // Día
    const dayLabel = `${day.dayName.substring(0, 3)} ${day.date.substring(8, 10)}`;
    page1.drawText(dayLabel, {
      x: colX.day,
      y: currentY - 14,
      size: 8,
      font: fontBold,
      color: day.isRestDay ? C_AMBER : C_TEXT_WHITE,
    });

    // Pasos
    const stepsText = day.health.steps > 0 ? `${day.health.steps.toLocaleString()}` : 'Sin datos';
    const isOverstepped = day.isRestDay && day.health.steps > 9500;
    page1.drawText(stepsText, {
      x: colX.steps,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: isOverstepped ? C_ROSE : day.health.steps > 0 ? C_TEXT_LIGHT : C_TEXT_MUTED,
    });

    // FC reposo
    const hrText = day.health.restingHr ? `${day.health.restingHr} bpm` : '--';
    page1.drawText(hrText, {
      x: colX.hr,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: C_TEXT_LIGHT,
    });

    // Sueño
    const sleepText = day.health.sleepMinutes
      ? `${(day.health.sleepMinutes / 60).toFixed(1)} h`
      : '--';
    page1.drawText(sleepText, {
      x: colX.sleep,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: C_TEXT_LIGHT,
    });

    // Calorías
    const kcalText = day.nutrition.hasData ? `${day.nutrition.totalCalories}` : 'Sin reg.';
    page1.drawText(kcalText, {
      x: colX.kcal,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: day.nutrition.hasData ? C_TEXT_LIGHT : C_TEXT_MUTED,
    });

    // Proteína
    const protText = day.nutrition.hasData ? `${day.nutrition.totalProteinG} g` : '--';
    page1.drawText(protText, {
      x: colX.protein,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: day.nutrition.totalProteinG >= 180 ? C_EMERALD : C_TEXT_LIGHT,
    });

    // Actividad registrada
    let actSummary = 'Descanso';
    if (day.cardio.hasActivity && day.gym.hasWorkout) {
      actSummary = `Run ${day.cardio.totalDistanceKm}k + Gym ${day.gym.totalSets}s`;
    } else if (day.cardio.hasActivity) {
      actSummary = `Run: ${day.cardio.totalDistanceKm} km @ ${day.cardio.avgPaceStr || ''}`;
    } else if (day.gym.hasWorkout) {
      actSummary = `Gym: ${day.gym.exercisesLogged.length} ejer. (${day.gym.totalSets} sets)`;
    } else if (day.isRestDay) {
      actSummary = 'Descanso Articular Pautado';
    } else {
      actSummary = 'Sin sesion registrada';
    }

    page1.drawText(sanitizeText(actSummary).substring(0, 24), {
      x: colX.activity,
      y: currentY - 14,
      size: 8,
      font: fontRegular,
      color: day.cardio.hasActivity ? C_ORANGE : day.gym.hasWorkout ? C_EMERALD : C_TEXT_MUTED,
    });

    currentY -= rowHeight;
  });

  currentY -= 16;

  // Gráfica Vectorial de Pasos Diarios
  page1.drawText('GRAFICA SEMANAL DE PASOS (GALAXY FIT3) VS META DE DESCANSO', {
    x: MARGIN,
    y: currentY,
    size: 9,
    font: fontBold,
    color: C_TEXT_WHITE,
  });

  currentY -= 12;

  const chartHeight = 90;
  drawCard(page1, MARGIN, currentY, CONTENT_WIDTH, chartHeight);

  // Línea de referencia de 9.000 pasos (tope en días de descanso)
  const maxStepsScale = 16000;
  const refY = currentY - chartHeight + (9000 / maxStepsScale) * (chartHeight - 20) + 10;
  page1.drawLine({
    start: { x: MARGIN + 40, y: refY },
    end: { x: MARGIN + CONTENT_WIDTH - 20, y: refY },
    color: C_AMBER,
    thickness: 1,
    opacity: 0.6,
  });
  page1.drawText('Tope Descanso (9.000)', {
    x: MARGIN + CONTENT_WIDTH - 110,
    y: refY + 3,
    size: 6,
    font: fontBold,
    color: C_AMBER,
  });

  // Dibujar barras para los 7 días
  const barSlotWidth = (CONTENT_WIDTH - 60) / 7;
  dataset.days.forEach((day, idx) => {
    const barX = MARGIN + 45 + idx * barSlotWidth;
    const barH = day.health.steps > 0
      ? Math.min(chartHeight - 25, (day.health.steps / maxStepsScale) * (chartHeight - 20))
      : 2;

    const barColor = day.isRestDay
      ? day.health.steps > 9500 ? C_ROSE : C_AMBER
      : day.health.steps >= 10000 ? C_BLUE : C_TEXT_MUTED;

    page1.drawRectangle({
      x: barX,
      y: currentY - chartHeight + 14,
      width: barSlotWidth * 0.55,
      height: Math.max(2, barH),
      color: barColor,
    });

    // Etiqueta del día
    page1.drawText(day.dayName.substring(0, 3), {
      x: barX,
      y: currentY - chartHeight + 4,
      size: 7,
      font: fontBold,
      color: C_TEXT_MUTED,
    });

    // Número de pasos sobre la barra
    if (day.health.steps > 0) {
      const stepValStr = `${Math.round(day.health.steps / 1000)}k`;
      page1.drawText(stepValStr, {
        x: barX,
        y: currentY - chartHeight + 16 + barH,
        size: 6,
        font: fontRegular,
        color: C_TEXT_LIGHT,
      });
    }
  });

  // ====================================================================
  // PÁGINA 2: RENDIMIENTO DEPORTIVO (CARDIO & FUERZA EN GIMNASIO)
  // ====================================================================
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: C_DARK_BG });
  drawPageHeader(page2, fontBold, fontRegular, 2, totalPages, dataset);

  currentY = PAGE_HEIGHT - 65;

  // SECCIÓN A: CARDIO & RUNNING (STRAVA / FIT3)
  page2.drawText('SECCION 1: TELEMETRIA DE CARRERA Y CARDIO (STRAVA / FIT3)', {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: fontBold,
    color: C_ORANGE,
  });

  currentY -= 14;

  const cardioActivities = dataset.days.flatMap((d) => d.cardio.activities);

  if (cardioActivities.length > 0) {
    cardioActivities.slice(0, 3).forEach((act) => {
      const actHeight = 64;
      drawCard(page2, MARGIN, currentY, CONTENT_WIDTH, actHeight);

      const title = `${act.name || 'Rodaje'} - ${act.start_date.substring(0, 10)}`;
      page2.drawText(sanitizeText(title), {
        x: MARGIN + 12,
        y: currentY - 16,
        size: 9,
        font: fontBold,
        color: C_TEXT_WHITE,
      });

      const distKm = (act.distance / 1000).toFixed(2);
      const timeMin = Math.round((act.moving_time || act.elapsed_time) / 60);
      const paceSec = ((act.moving_time || act.elapsed_time) / act.distance) * 1000;
      const paceStr = isNaN(paceSec) ? '--' : `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')} /km`;

      page2.drawText(`Distancia: ${distKm} km   |   Tiempo: ${timeMin} min   |   Ritmo medio: ${paceStr}`, {
        x: MARGIN + 12,
        y: currentY - 32,
        size: 8,
        font: fontRegular,
        color: C_TEXT_LIGHT,
      });

      const hrCad = `FC media: ${act.avg_hr || '--'} bpm   |   Cadencia: ${act.avg_cadence || '--'} ppm   |   Desnivel: +${act.total_elevation_gain || 0} m`;
      page2.drawText(hrCad, {
        x: MARGIN + 12,
        y: currentY - 46,
        size: 8,
        font: fontRegular,
        color: C_TEXT_MUTED,
      });

      currentY -= actHeight + 8;
    });
  } else {
    drawCard(page2, MARGIN, currentY, CONTENT_WIDTH, 42);
    page2.drawText('Sin sesiones de carrera registradas esta semana en Strava o Fit3.', {
      x: MARGIN + 12,
      y: currentY - 24,
      size: 9,
      font: fontRegular,
      color: C_TEXT_MUTED,
    });
    currentY -= 50;
  }

  currentY -= 10;

  // SECCIÓN B: ENTRENAMIENTOS DE FUERZA EN GIMNASIO
  page2.drawText('SECCION 2: ENTRENAMIENTO DE FUERZA Y BLINDAJE ARTICULAR', {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: fontBold,
    color: C_EMERALD,
  });

  currentY -= 14;

  const gymDays = dataset.days.filter((d) => d.gym.hasWorkout);

  if (gymDays.length > 0) {
    gymDays.forEach((gDay) => {
      const gHeight = 18 + gDay.gym.exercisesLogged.length * 15 + 10;
      drawCard(page2, MARGIN, currentY, CONTENT_WIDTH, gHeight);

      // Cabecera de la sesión
      const sTitle = `${gDay.dayName} (${gDay.date}): ${gDay.gym.workoutTitle || 'Sesion de Fuerza'} - ${gDay.gym.totalSets} series (${gDay.gym.totalVolumeKg.toLocaleString()} kg)`;
      page2.drawText(sanitizeText(sTitle), {
        x: MARGIN + 10,
        y: currentY - 14,
        size: 8,
        font: fontBold,
        color: C_TEXT_WHITE,
      });

      let exY = currentY - 28;
      gDay.gym.exercisesLogged.forEach((ex) => {
        const exText = `* ${ex.name} (${ex.category}): ${ex.setsCount} series - Mejor carga: ${ex.bestWeightKg} kg (Vol: ${ex.volumeKg} kg)`;
        page2.drawText(sanitizeText(exText), {
          x: MARGIN + 16,
          y: exY,
          size: 7,
          font: fontRegular,
          color: ex.isKneeProtector ? C_EMERALD : C_TEXT_LIGHT,
        });
        exY -= 15;
      });

      currentY -= gHeight + 10;
    });
  } else {
    drawCard(page2, MARGIN, currentY, CONTENT_WIDTH, 42);
    page2.drawText('Sin registros de ejercicios de gimnasio completados en la semana.', {
      x: MARGIN + 12,
      y: currentY - 24,
      size: 9,
      font: fontRegular,
      color: C_TEXT_MUTED,
    });
    currentY -= 50;
  }

  currentY -= 6;

  // CAJA DE AUDITORÍA DE BLINDAJE DE RODILLA
  drawCard(page2, MARGIN, currentY, CONTENT_WIDTH, 72, rgb(0.12, 0.14, 0.18), C_EMERALD);
  page2.drawText('AUDITORIA FISIOTERAPEUTICA DE RODILLA & BLINDAJE ARTICULAR', {
    x: MARGIN + 12,
    y: currentY - 16,
    size: 9,
    font: fontBold,
    color: C_EMERALD,
  });

  const shieldDesc = `Series de proteccion de rodilla ejecutadas: ${dataset.summary.kneeProtectorSetsCount} series en la semana.`;
  page2.drawText(shieldDesc, {
    x: MARGIN + 12,
    y: currentY - 32,
    size: 8,
    font: fontRegular,
    color: C_TEXT_WHITE,
  });

  const protocolsText = 'Ejercicios clave: Wall-sits isometricos (tendon cuadricipital) + Abductores (gluteo medio / TFL) + Gemelo excentrico.';
  page2.drawText(protocolsText, {
    x: MARGIN + 12,
    y: currentY - 46,
    size: 8,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  const goalText = 'Objetivo: Disipar las fuerzas de impacto sobre el tuberculo de Gerdy antes de que alcancen el periostio.';
  page2.drawText(goalText, {
    x: MARGIN + 12,
    y: currentY - 58,
    size: 7,
    font: fontRegular,
    color: C_TEXT_MUTED,
  });

  // ====================================================================
  // PÁGINA 3: NUTRICIÓN, DIAGNÓSTICO CLÍNICO & PRESCRIPCIÓN SEMANA N+1
  // ====================================================================
  const page3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page3.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: C_DARK_BG });
  drawPageHeader(page3, fontBold, fontRegular, 3, totalPages, dataset);

  currentY = PAGE_HEIGHT - 65;

  // SECCIÓN 1: BALANCE NUTRICIONAL MERCADONA
  page3.drawText('SECCION 1: CONSOLIDADO NUTRICIONAL (MERCADONA WEIGHED DB)', {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: fontBold,
    color: C_ORANGE,
  });

  currentY -= 14;

  drawCard(page3, MARGIN, currentY, CONTENT_WIDTH, 48);
  page3.drawText(`Calorias medias: ${dataset.summary.avgDailyCalories} kcal/dia (Meta: 2.400 kcal)   |   Proteina media: ${dataset.summary.avgDailyProteinG} g/dia (Meta: 202 g - 2.0g/kg)`, {
    x: MARGIN + 12,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: C_TEXT_WHITE,
  });

  page3.drawText(`Hidratacion media: ${dataset.summary.avgWaterLiters} L de agua/dia (Meta: 3.5 - 4.0 L)   |   Dias pesados en app: ${dataset.summary.daysWithNutritionCount}/7 dias`, {
    x: MARGIN + 12,
    y: currentY - 32,
    size: 8,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  currentY -= 60;

  // SECCIÓN 2: DIAGNÓSTICO DEL COACH (LO QUE FUE BIEN / A MEJORAR)
  page3.drawText('SECCION 2: DIAGNOSTICO CLINICO DEL PREPARADOR FISICO', {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: fontBold,
    color: C_EMERALD,
  });

  currentY -= 14;

  // Lo que fue bien
  drawCard(page3, MARGIN, currentY, CONTENT_WIDTH, 70, C_CARD_BG, C_EMERALD);
  page3.drawText('LO QUE HA IDO BIEN (FORTALEZAS DE LA SEMANA):', {
    x: MARGIN + 10,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: C_EMERALD,
  });

  let strY = currentY - 26;
  assessment.strengths.slice(0, 3).forEach((s) => {
    const text = `+ ${s.title}: ${s.detail}`;
    page3.drawText(sanitizeText(text).substring(0, 110), {
      x: MARGIN + 12,
      y: strY,
      size: 7,
      font: fontRegular,
      color: C_TEXT_LIGHT,
    });
    strY -= 13;
  });

  currentY -= 78;

  // Puntos a mejorar
  drawCard(page3, MARGIN, currentY, CONTENT_WIDTH, 70, C_CARD_BG, C_AMBER);
  page3.drawText('PUNTOS A MEJORAR PARA LA SIGUIENTE SEMANA:', {
    x: MARGIN + 10,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: C_AMBER,
  });

  let impY = currentY - 26;
  assessment.improvements.slice(0, 3).forEach((imp) => {
    const text = `! ${imp.title}: ${imp.detail}`;
    page3.drawText(sanitizeText(text).substring(0, 110), {
      x: MARGIN + 12,
      y: impY,
      size: 7,
      font: fontRegular,
      color: C_TEXT_LIGHT,
    });
    impY -= 13;
  });

  currentY -= 78;

  // SECCIÓN 3: PRESCRIPCIÓN DE LA SEMANA N+1 (PLAN DE ACCIÓN)
  page3.drawText(`SECCION 3: PRESCRIPCION PARA LA SEMANA SIGUIENTE (SEMANA ${assessment.nextWeekPrescription.targetWeekNumber})`, {
    x: MARGIN,
    y: currentY,
    size: 10,
    font: fontBold,
    color: C_BLUE,
  });

  currentY -= 14;

  const nextPresc = assessment.nextWeekPrescription;
  const prescHeight = 110;
  drawCard(page3, MARGIN, currentY, CONTENT_WIDTH, prescHeight, C_CARD_BG, C_BLUE);

  page3.drawText(`FASE: ${nextPresc.phaseName.toUpperCase()}   |   META NUTRICIONAL: ${nextPresc.calorieTarget} kcal (${nextPresc.proteinTargetG}g Proteina, ${nextPresc.waterTargetL}L Agua)`, {
    x: MARGIN + 10,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: C_TEXT_WHITE,
  });

  page3.drawText(`* Jueves (Rodaje Base): ${nextPresc.runningSessions.thursday.session}`, {
    x: MARGIN + 10,
    y: currentY - 30,
    size: 7,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  page3.drawText(`* Domingo (Tirada Larga): ${nextPresc.runningSessions.sunday.session}`, {
    x: MARGIN + 10,
    y: currentY - 44,
    size: 7,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  page3.drawText(`* Fuerza Gimnasio Pierna: ${nextPresc.gymAdjustments.legShieldFocus}`, {
    x: MARGIN + 10,
    y: currentY - 58,
    size: 7,
    font: fontRegular,
    color: C_TEXT_LIGHT,
  });

  page3.drawText(`* Isometria Prescrita: ${nextPresc.gymAdjustments.isometricsPrescribed}`, {
    x: MARGIN + 10,
    y: currentY - 72,
    size: 7,
    font: fontRegular,
    color: C_EMERALD,
  });

  page3.drawText(`* REGLA DE ORO DE DESCANSO: ${nextPresc.restDaysRule}`, {
    x: MARGIN + 10,
    y: currentY - 88,
    size: 7,
    font: fontBold,
    color: C_AMBER,
  });

  currentY -= prescHeight + 14;

  // Cuadro de firma y sello del Asistente
  drawCard(page3, MARGIN, currentY, CONTENT_WIDTH, 42, C_HEADER_BG, C_CARD_BORDER);
  page3.drawText('Certificado de Seguimiento Clinico y Deportivo - IronManApp AI Coach', {
    x: MARGIN + 12,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: C_ORANGE,
  });
  page3.drawText('Generado automaticamente con 100% de datos reales registrados. Rumbo al 28 de Febrero de 2027.', {
    x: MARGIN + 12,
    y: currentY - 30,
    size: 7,
    font: fontRegular,
    color: C_TEXT_MUTED,
  });

  return await pdfDoc.save();
}
