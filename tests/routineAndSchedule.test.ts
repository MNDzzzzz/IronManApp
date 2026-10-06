import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getSpainDate,
  getTodayRoutine,
  getCurrentWeekNumber,
  getRunningProgressionForWeek,
  getHalfMarathonCountdown,
  TARGET_HALF_MARATHON_DATE,
  WEEKLY_ROUTINE,
} from '../src/lib/weeklyRoutine';

describe('SUITE DE INTEGRACIÓN: Rutinas y Planificación Biomecánica', () => {
  it('WEEKLY_ROUTINE: Define con precisión los 7 días de la semana con protección articular', () => {
    const routineList = Object.values(WEEKLY_ROUTINE);
    assert.strictEqual(routineList.length, 7, 'Debe haber exactamente 7 días');

    // Verificar Miércoles y Sábado como descanso total
    const wednesday = routineList.find((r) => r.dayName === 'Miércoles');
    const saturday = routineList.find((r) => r.dayName === 'Sábado');

    assert.ok(wednesday, 'Miércoles debe existir');
    assert.strictEqual(wednesday.category, 'Descanso');
    assert.strictEqual(wednesday.dayType, 'rest_refeed');

    assert.ok(saturday, 'Sábado debe existir');
    assert.strictEqual(saturday.category, 'Descanso');
    assert.strictEqual(saturday.dayType, 'rest_refeed');

    // Verificar que los días de descanso limitan pasos para desinflamación tendinosa
    assert.ok(wednesday.targetSteps.max <= 9500, 'Miércoles debe limitar pasos a <= 9500');
    assert.ok(saturday.targetSteps.max <= 10000, 'Sábado debe limitar pasos a <= 10000');
  });

  it('getSpainDate: Retorna fecha válida ajustada a la zona horaria', () => {
    const spainDate = getSpainDate();
    assert.ok(spainDate instanceof Date);
    assert.ok(!isNaN(spainDate.getTime()));

    // Prueba con fecha específica fija
    const fixedDate = getSpainDate('2026-10-06T12:00:00Z');
    assert.strictEqual(fixedDate.getUTCFullYear(), 2026);
  });

  it('getTodayRoutine: Devuelve la sesión correcta según el día', () => {
    // 2026-10-05 fue Lunes (Día de Fuerza Torso)
    const mondayRoutine = getTodayRoutine('2026-10-05T12:00:00');
    assert.strictEqual(mondayRoutine.dayName, 'Lunes');
    assert.strictEqual(mondayRoutine.category, 'Fuerza');
    assert.ok(mondayRoutine.title.includes('Torso'));

    // 2026-10-06 fue Martes (Día de Fuerza Pierna Blindada)
    const tuesdayRoutine = getTodayRoutine('2026-10-06T12:00:00');
    assert.strictEqual(tuesdayRoutine.dayName, 'Martes');
    assert.strictEqual(tuesdayRoutine.category, 'Fuerza');
    assert.ok(tuesdayRoutine.title.includes('Pierna'));

    // 2026-10-08 fue Jueves (Día de Carrera Rodaje Base)
    const thursdayRoutine = getTodayRoutine('2026-10-08T12:00:00');
    assert.strictEqual(thursdayRoutine.dayName, 'Jueves');
    assert.strictEqual(thursdayRoutine.category, 'Cardio');
    assert.ok(thursdayRoutine.title.includes('Rodaje'));

    // 2026-10-11 fue Domingo (Tirada Larga CaCo)
    const sundayRoutine = getTodayRoutine('2026-10-11T12:00:00');
    assert.strictEqual(sundayRoutine.dayName, 'Domingo');
    assert.strictEqual(sundayRoutine.category, 'Cardio');
    assert.ok(sundayRoutine.title.includes('Tirada Larga'));
  });

  it('getHalfMarathonCountdown: Cuenta atrás hacia el 28 de Febrero de 2027', () => {
    const countdown = getHalfMarathonCountdown('2026-10-06');
    assert.ok(countdown.targetDateStr.includes('28 de Febrero de 2027'));
    assert.ok(countdown.daysRemaining > 0, 'Días restantes debe ser positivo');
    assert.ok(countdown.weeksRemaining > 0, 'Semanas restantes debe ser positivo');
    assert.ok(countdown.currentWeekNumber >= 1, 'Semana actual debe ser >= 1');
    assert.ok(countdown.currentPhase.length > 0, 'Fase actual debe tener descripción');
  });

  it('getRunningProgressionForWeek: Progresión segura sin saltos lesivos de kilometraje', () => {
    const week1 = getRunningProgressionForWeek(1);
    const week2 = getRunningProgressionForWeek(2);
    const week3 = getRunningProgressionForWeek(3);

    assert.strictEqual(week1.week, 1);
    assert.ok(week1.thursdayKm > 0);
    assert.ok(week1.sundayKm > 0);

    // Regla de incremento controlado
    const weeklyVol1 = week1.thursdayKm + week1.sundayKm;
    const weeklyVol2 = week2.thursdayKm + week2.sundayKm;
    const weeklyVol3 = week3.thursdayKm + week3.sundayKm;

    assert.ok(weeklyVol2 <= weeklyVol1 * 1.25, 'El incremento semanal no debe exceder el 25%');
    assert.ok(weeklyVol3 <= weeklyVol2 * 1.25, 'El incremento semanal no debe exceder el 25%');
  });
});
