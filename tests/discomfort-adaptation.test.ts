import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  DiscomfortManager, 
  DiscomfortLevel, 
  DiscomfortReport 
} from '../src/lib/discomfortManager';
import { WEEKLY_ROUTINE } from '../src/lib/weeklyRoutine';

describe('P1.1: Discomfort & Proportional Adaptation Engine (Niveles 1 al 6)', () => {

  it('NIVEL 1 (Muy Leve): Mantiene 100% de volumen e intensidad con advertencia preventiva', () => {
    const report: DiscomfortReport = {
      id: 'rep-01',
      userId: 'alvaro-main',
      bodyPartId: 'patellar_tendon_right',
      level: DiscomfortLevel.VERY_LIGHT, // 1
      notes: 'Ligera rigidez al levantarse',
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.strictEqual(strategy.training.volumeReductionPercent, 0, 'No debe reducir volumen en nivel 1');
    assert.strictEqual(strategy.training.intensityReductionPercent, 0, 'No debe reducir intensidad en nivel 1');
    assert.strictEqual(strategy.training.skipMuscleGroup, false, 'No debe cancelar el grupo muscular');
    assert.ok(strategy.training.warmupNote?.includes('calentamiento'), 'Debe incluir nota de calentamiento específico');
    assert.strictEqual(strategy.nutrition.hydrationIncreaseMl, 0, 'No requiere ajuste hídrico extra');
  });

  it('NIVEL 2 (Leve): Reduce volumen un 15-20% y conmuta carrera continua a CaCo suave', () => {
    const report: DiscomfortReport = {
      id: 'rep-02',
      userId: 'alvaro-main',
      bodyPartId: 'knee_right',
      level: DiscomfortLevel.LIGHT, // 2
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.ok(strategy.training.volumeReductionPercent >= 15 && strategy.training.volumeReductionPercent <= 20, 
      `Reducción esperada entre 15% y 20%, recibida: ${strategy.training.volumeReductionPercent}%`);
    assert.strictEqual(strategy.training.intensityReductionPercent, 10, 'Intensidad reducida un 10%');
    assert.strictEqual(strategy.training.skipMuscleGroup, false);
    assert.strictEqual(strategy.training.cardioAlternative, 'CACO_CONSERVATIVE', 'Debe alternar a CaCo 4min/1min');
  });

  it('NIVEL 3 (Media): Reduce volumen 30-40% y sustituye ejercicios de impacto por isométricos', () => {
    const report: DiscomfortReport = {
      id: 'rep-03',
      userId: 'alvaro-main',
      bodyPartId: 'knee_right',
      level: DiscomfortLevel.MODERATE, // 3
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.strictEqual(strategy.training.volumeReductionPercent, 35);
    assert.strictEqual(strategy.training.intensityReductionPercent, 25);
    assert.ok(Array.isArray(strategy.training.substituteExercises), 'Debe proveer array de sustitutos');
    assert.ok(strategy.training.substituteExercises.length > 0, 'Debe sugerir al menos un sustituto');
    assert.ok(strategy.training.substituteExercises.some(ex => ex.toLowerCase().includes('isom') || ex.toLowerCase().includes('prensa')));
    assert.strictEqual(strategy.nutrition.hydrationIncreaseMl, 250, 'Añadir 250ml de soporte hídrico');
  });

  it('NIVEL 4 (Media-Alta): Reduce volumen 50-70%, prohibición de impacto y soporte nutricional antiinflamatorio', () => {
    const report: DiscomfortReport = {
      id: 'rep-04',
      userId: 'alvaro-main',
      bodyPartId: 'patellar_tendon_right',
      level: DiscomfortLevel.MODERATE_HIGH, // 4
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.ok(strategy.training.volumeReductionPercent >= 50 && strategy.training.volumeReductionPercent <= 70);
    assert.strictEqual(strategy.training.skipImpactRunning, true, 'Prohíbe carrera continua de impacto');
    assert.strictEqual(strategy.nutrition.hydrationIncreaseMl, 500, 'Debe aumentar 500ml de agua');
    assert.ok(strategy.nutrition.suggestedSupplements.includes('Omega 3') || strategy.nutrition.suggestedSupplements.includes('Colágeno'));
  });

  it('NIVEL 5 (Alta): Omite el grupo muscular completo, descanso activo y aumento de proteína (+10%)', () => {
    const report: DiscomfortReport = {
      id: 'rep-05',
      userId: 'alvaro-main',
      bodyPartId: 'knee_right',
      level: DiscomfortLevel.HIGH, // 5
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.strictEqual(strategy.training.skipMuscleGroup, true, 'Debe omitir el grupo muscular');
    assert.strictEqual(strategy.training.volumeReductionPercent, 100);
    assert.strictEqual(strategy.nutrition.proteinMultiplier, 1.1, 'Debe aumentar 10% la ingesta proteica');
    assert.strictEqual(strategy.nutrition.hydrationIncreaseMl, 750, 'Debe aumentar 750ml de hidratación');
  });

  it('NIVEL 6 (Lesión / Dolor Agudo): Reposo total del segmento, alerta roja y protocolo clínico RICE', () => {
    const report: DiscomfortReport = {
      id: 'rep-06',
      userId: 'alvaro-main',
      bodyPartId: 'hamstring_left',
      level: DiscomfortLevel.INJURY, // 6
      notes: 'Pinchazo agudo e imposibilidad de apoyo',
      reportedAt: new Date()
    };

    const strategy = DiscomfortManager.evaluate(report);

    assert.strictEqual(strategy.training.skipMuscleGroup, true);
    assert.strictEqual(strategy.training.volumeReductionPercent, 100);
    assert.strictEqual(strategy.training.intensityReductionPercent, 100);
    assert.strictEqual(strategy.clinicalAlert, true, 'Debe detonar bandera de alerta médica/fisioterapéutica');
    assert.ok(strategy.recommendationsMarkdown.includes('PEACE & LOVE') || strategy.recommendationsMarkdown.includes('RICE'));
  });

  it('INMUTABILIDAD: La evaluación de molestias NO debe mutar el objeto base WEEKLY_ROUTINE en memoria', () => {
    const frozenRoutineBefore = JSON.stringify(WEEKLY_ROUTINE);
    
    DiscomfortManager.evaluate({
      id: 'test-immutability',
      userId: 'alvaro-main',
      bodyPartId: 'knee_right',
      level: DiscomfortLevel.HIGH,
      reportedAt: new Date()
    });

    const frozenRoutineAfter = JSON.stringify(WEEKLY_ROUTINE);
    assert.strictEqual(frozenRoutineBefore, frozenRoutineAfter, 'WEEKLY_ROUTINE debe mantenerse estrictamente idéntico');
  });

  it('TRIAGE DEL BOT: Extrae correctamente el nivel de molestia y zona corporal desde texto natural', () => {
    const natural1 = 'tengo una ligera molestia nivel 2 en la rodilla derecha';
    const parsed1 = DiscomfortManager.triageMessage(natural1);
    assert.ok(parsed1, 'Debe parsear el mensaje');
    assert.strictEqual(parsed1?.level, DiscomfortLevel.LIGHT);
    assert.ok(parsed1?.bodyPartId.includes('rodilla') || parsed1?.bodyPartId.includes('knee'));

    const natural2 = 'me noto molestia media nivel 3 en el hombro';
    const parsed2 = DiscomfortManager.triageMessage(natural2);
    assert.ok(parsed2);
    assert.strictEqual(parsed2?.level, DiscomfortLevel.MODERATE);

    const natural3 = 'siento molestia muy leve nivel 1 en el gemelo';
    const parsed3 = DiscomfortManager.triageMessage(natural3);
    assert.ok(parsed3);
    assert.strictEqual(parsed3?.level, DiscomfortLevel.VERY_LIGHT);
  });

  it('ESCALA DE MULTIPLICADORES PROPORCIONALES: Evalúa volumeMultiplier y suspensión de impacto en los 6 niveles', () => {
    const levels = [
      { lvl: DiscomfortLevel.VERY_LIGHT, expectedMultiplier: 1.0, suspend: false },
      { lvl: DiscomfortLevel.LIGHT, expectedMultiplier: 0.85, suspend: false },
      { lvl: DiscomfortLevel.MODERATE, expectedMultiplier: 0.70, suspend: false },
      { lvl: DiscomfortLevel.MODERATE_HIGH, expectedMultiplier: 0.50, suspend: true },
      { lvl: DiscomfortLevel.HIGH, expectedMultiplier: 0.25, suspend: true },
      { lvl: DiscomfortLevel.INJURY, expectedMultiplier: 0.0, suspend: true },
    ];

    for (const { lvl, expectedMultiplier, suspend } of levels) {
      const strat = DiscomfortManager.evaluate({
        id: `test-mul-${lvl}`,
        userId: 'alvaro-main',
        bodyPartId: 'rodilla_patellar',
        level: lvl,
        reportedAt: new Date(),
      });

      assert.strictEqual(strat.training.volumeMultiplier, expectedMultiplier, `Multiplicador de volumen incorrecto para nivel ${lvl}`);
      assert.strictEqual(strat.training.suspendImpact, suspend, `Estado de suspensión de impacto incorrecto para nivel ${lvl}`);
      assert.ok(strat.coachNotice, 'Debe incluir coachNotice descriptivo');
    }
  });

  it('TRIAGE EXTENDIDO: Detecta correctamente nivel 4, 5 y 6 con diferentes zonas anatómicas', () => {
    const parsed4 = DiscomfortManager.triageMessage('tengo molestia media alta nivel 4 en el tendon de aquiles');
    assert.ok(parsed4);
    assert.strictEqual(parsed4?.level, DiscomfortLevel.MODERATE_HIGH);
    assert.strictEqual(parsed4?.bodyPartId, 'tobillo_aquiles');

    const parsed5 = DiscomfortManager.triageMessage('dolor fuerte nivel 5 en la zona lumbar');
    assert.ok(parsed5);
    assert.strictEqual(parsed5?.level, DiscomfortLevel.HIGH);
    assert.strictEqual(parsed5?.bodyPartId, 'lumbar');

    const parsed6 = DiscomfortManager.triageMessage('pinchazo agudo nivel 6 en el cuadriceps');
    assert.ok(parsed6);
    assert.strictEqual(parsed6?.level, DiscomfortLevel.INJURY);
    assert.strictEqual(parsed6?.bodyPartId, 'cuadriceps');
  });

  it('INTEGRACIÓN COACH CORE: Triage determinista vía tryDeterministicBypass en coachCore', async () => {
    const { tryDeterministicBypass, getSpainTodayStr } = await import('../src/lib/coachCore');
    const today = getSpainTodayStr();

    // Reporte directo de molestia (sin interrogación) genera action discomfort_report en 0ms
    const directResult = await tryDeterministicBypass('tengo molestia nivel 2 en la rodilla', today);
    assert.ok(directResult, 'Debe resolverse de forma determinista');
    assert.strictEqual(directResult.action, 'discomfort_report');
    assert.strictEqual(directResult.discomfort_report.level, DiscomfortLevel.LIGHT);
    assert.ok(directResult.reply_text?.includes('Molestia Registrada'));

    // Pregunta clínica con '?' o '¿' NO hace bypass (se deriva a Gemini)
    const questionResult = await tryDeterministicBypass('¿Qué me recomiendas para el dolor en la rodilla tras rodar?', today);
    assert.strictEqual(questionResult, null, 'Pregunta clínica debe retornar null');
  });
});

