import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateACWR,
  calculateKJSI,
  assessJointStrain,
  JointStrainAssessment,
  DailyWorkloadSample
} from '../src/lib/biomechanics/jointStrainEngine';

describe('FASE 2: Biomechanics, ACWR & Knee Joint Strain Index (KJSI)', () => {

  it('ACWR-1: Carga equilibrada en el Sweet Spot (0.8 <= ACWR <= 1.3)', () => {
    // 28 días con carga constante de 100 unidades/día
    const samples: DailyWorkloadSample[] = Array.from({ length: 28 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      runningKm: 5,
      gymVolumeKg: 2000,
      discomfortLevel: 1
    }));

    const result = calculateACWR(samples);
    assert.ok(result.acwr >= 0.8 && result.acwr <= 1.3, `ACWR esperado en Sweet Spot, obtenido: ${result.acwr}`);
    assert.strictEqual(result.zone, 'OPTIMAL');
  });

  it('ACWR-2: Detección de Spike Agudo peligroso (ACWR > 1.5)', () => {
    // 21 días con carga baja (2 km/día) y los últimos 7 días con salto brusco (10 km/día)
    const samples: DailyWorkloadSample[] = [];
    for (let i = 0; i < 21; i++) {
      samples.push({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        runningKm: 2,
        gymVolumeKg: 1000,
        discomfortLevel: 1
      });
    }
    for (let i = 21; i < 28; i++) {
      samples.push({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        runningKm: 10,
        gymVolumeKg: 4000,
        discomfortLevel: 2
      });
    }

    const result = calculateACWR(samples);
    assert.ok(result.acwr > 1.5, `ACWR esperado > 1.5 (Peligro de spike), obtenido: ${result.acwr}`);
    assert.strictEqual(result.zone, 'DANGER');
  });

  it('ACWR-3: Infracarga o desentrenamiento (ACWR < 0.8)', () => {
    // 21 días con carga normal y los últimos 7 días casi a cero
    const samples: DailyWorkloadSample[] = [];
    for (let i = 0; i < 21; i++) {
      samples.push({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        runningKm: 6,
        gymVolumeKg: 3000,
        discomfortLevel: 1
      });
    }
    for (let i = 21; i < 28; i++) {
      samples.push({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        runningKm: 0.5,
        gymVolumeKg: 0,
        discomfortLevel: 1
      });
    }

    const result = calculateACWR(samples);
    assert.ok(result.acwr < 0.8, `ACWR esperado < 0.8 (Infracarga), obtenido: ${result.acwr}`);
    assert.strictEqual(result.zone, 'UNDERLOAD');
  });

  it('ACWR-4: Manejo seguro sin histórico suficiente (Suelo basal de carga / Floor)', () => {
    // Solo 3 días de datos
    const fewSamples: DailyWorkloadSample[] = [
      { date: '2026-10-01', runningKm: 5, gymVolumeKg: 2000, discomfortLevel: 1 },
      { date: '2026-10-02', runningKm: 0, gymVolumeKg: 1500, discomfortLevel: 1 },
      { date: '2026-10-03', runningKm: 4, gymVolumeKg: 0, discomfortLevel: 1 }
    ];

    const result = calculateACWR(fewSamples);
    assert.ok(!Number.isNaN(result.acwr), 'El ratio no debe ser NaN');
    assert.ok(Number.isFinite(result.acwr), 'El ratio no debe ser infinito');
    assert.ok(result.isCalibrating, 'Debe indicar que está en período de calibración basal');
  });

  it('KJSI-1: Knee Joint Strain Index pondera peso del atleta (101 kg) y cadencia', () => {
    // Mismo kilometraje pero con cadencia baja (<165 spm, mayor tiempo de contacto e impacto rotuliano)
    const lowCadenceKjsi = calculateKJSI({
      runningKm: 8,
      cadenceSpm: 158,
      athleteWeightKg: 101,
      legVolumeKg: 2500,
      recentDiscomfortLevel: 3
    });

    // Con cadencia óptima (174 spm, zancada corta y menor estrés en tendón)
    const highCadenceKjsi = calculateKJSI({
      runningKm: 8,
      cadenceSpm: 174,
      athleteWeightKg: 101,
      legVolumeKg: 2500,
      recentDiscomfortLevel: 3
    });

    assert.ok(lowCadenceKjsi > highCadenceKjsi, 
      `Cadencia baja (${lowCadenceKjsi}) debe generar mayor KJSI que cadencia alta (${highCadenceKjsi})`);
  });

  it('BIO-1: Evaluación clínica integrada (assessJointStrain)', () => {
    const samples: DailyWorkloadSample[] = Array.from({ length: 28 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      runningKm: i >= 21 ? 9 : 4,
      gymVolumeKg: 2000,
      discomfortLevel: i >= 21 ? 4 : 1
    }));

    const assessment: JointStrainAssessment = assessJointStrain(samples, 101, 164);
    assert.ok(assessment.clinicalAdvice.length > 0);
    assert.ok(assessment.recommendations.length >= 2);
    assert.ok(assessment.kjsi >= 0 && assessment.kjsi <= 100);
  });

});
