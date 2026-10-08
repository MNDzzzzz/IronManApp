import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateHalfMarathon2027,
  RaceSimulationParams,
  RaceSimulationResult,
  formatRaceTime
} from '../src/lib/cardio/raceSimulatorEngine';

describe('FASE 3: Media Maratón 2027 Race Simulator Engine', () => {

  const standardParams: RaceSimulationParams = {
    currentWeightKg: 101,
    projectedWeightKg: 86, // Pérdida de 15 kg hacia competición
    basePaceMinKm: 5.5,    // 5:30 min/km
    targetCadenceSpm: 174,
    cacoProtocol: false
  };

  it('SIM-1: Proyección de tiempo final y reducción de ritmo por pérdida de peso', () => {
    const simulation: RaceSimulationResult = simulateHalfMarathon2027(standardParams);

    // Con 15 kg menos, el ritmo mejora ~40-45 seg/km
    assert.ok(simulation.projectedPaceMinKm < standardParams.basePaceMinKm, 
      `El ritmo proyectado (${simulation.projectedPaceMinKm}) debe ser más rápido que el base (${standardParams.basePaceMinKm})`);
    assert.ok(simulation.weightTimeSavedMinutes > 10, 'Una pérdida de 15 kg debe ahorrar más de 10 minutos en 21K');
    assert.ok(simulation.totalTimeFormatted.includes('h'), 'Formato legible en horas y minutos');
  });

  it('SIM-2: Plan de Nutrición Intra-Carrera (Geles en Km 6 y Km 12)', () => {
    const simulation = simulateHalfMarathon2027(standardParams);

    assert.strictEqual(simulation.gelMilestones.length, 2, 'Debe planificar exactamente 2 geles estratégicos');
    assert.strictEqual(simulation.gelMilestones[0].km, 6, 'Gel 1 en km 6');
    assert.strictEqual(simulation.gelMilestones[1].km, 12, 'Gel 2 en km 12');
    assert.strictEqual(simulation.gelMilestones[0].carbsG, 30);
    assert.ok(simulation.gelMilestones[1].hasCaffeine, 'El gel del km 12 debe incluir cafeína para mantener el foco');
  });

  it('SIM-3: Cronograma de Hidratación en Avituallamientos (cada 5 km)', () => {
    const simulation = simulateHalfMarathon2027(standardParams);

    assert.ok(simulation.hydrationMilestones.length >= 3, 'Debe incluir al menos 3 tomas de agua/isotónico');
    assert.ok(simulation.hydrationMilestones.some(h => h.km === 5));
    assert.ok(simulation.hydrationMilestones.some(h => h.km === 10));
    assert.ok(simulation.hydrationMilestones.some(h => h.km === 15));
  });

  it('SIM-4: Estimación de Carga de Impacto en Rodillas y Ponderación de Cadencia', () => {
    const lowCadence = simulateHalfMarathon2027({
      ...standardParams,
      targetCadenceSpm: 158 // Cadencia baja = mayores fuerzas de impacto
    });

    const highCadence = simulateHalfMarathon2027({
      ...standardParams,
      targetCadenceSpm: 176 // Cadencia alta = menor estrés rotuliano
    });

    assert.ok(highCadence.kneeImpactTons < lowCadence.kneeImpactTons, 
      `Mayor cadencia (${highCadence.kneeImpactTons}t) debe generar menos impacto total que baja cadencia (${lowCadence.kneeImpactTons}t)`);
    assert.ok(highCadence.kneeImpactTons > 0);
  });

  it('SIM-5: Helper formatRaceTime formatea segundos con precisión hh:mm:ss', () => {
    const str1 = formatRaceTime(6720); // 1h 52m 00s
    assert.strictEqual(str1, '1h 52m 00s');

    const str2 = formatRaceTime(7215); // 2h 00m 15s
    assert.strictEqual(str2, '2h 00m 15s');
  });

});
