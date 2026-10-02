// ====================================================================
// ENDPOINT: CALENDARIO Y GESTIÓN DE RUTINAS MODULARES: IronManApp
// Permite consultar el calendario semanal con overrides,
// intercambiar días (swap), reasignar sesiones y resetear a estado original.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getWeekSchedule,
  swapScheduleDays,
  setDayRoutineOverride,
  resetDayRoutineOverride,
  CANONICAL_ROUTINES,
} from '@/lib/scheduleManager';
import { getSpainDate } from '@/lib/weeklyRoutine';
import { RoutineKey } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Obtener el calendario de la semana y catálogo de rutinas disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const schedule = await getWeekSchedule(dateParam);

    return NextResponse.json({
      success: true,
      referenceDate: dateParam,
      schedule,
      canonicalRoutines: Object.values(CANONICAL_ROUTINES),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error consultando calendario' },
      { status: 500 }
    );
  }
}

/**
 * POST: Realizar acciones de modificación modular sobre el calendario
 * Acciones soportadas:
 * - 'swap': Intercambiar dos días (ej: ayer con hoy, o jueves con viernes)
 * - 'set_day': Reasignar la sesión de un día concreto
 * - 'reset': Restaurar la rutina original del día según la planificación canónica
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Debe especificarse el parámetro action (swap, set_day, reset).' },
        { status: 400 }
      );
    }

    if (action === 'swap') {
      const { date1, date2, notes } = body;
      if (!date1 || !date2) {
        return NextResponse.json(
          { success: false, error: 'Para intercambiar días se requieren date1 y date2 (YYYY-MM-DD).' },
          { status: 400 }
        );
      }

      const result = await swapScheduleDays(date1, date2, notes);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        date1,
        date2,
      });
    }

    if (action === 'set_day') {
      const {
        date,
        routineKey,
        title,
        category,
        dayType,
        description,
        targetStepsMin,
        targetStepsMax,
        customExercises,
        notes,
      } = body;

      if (!date || !routineKey) {
        return NextResponse.json(
          { success: false, error: 'Se requiere date (YYYY-MM-DD) y routineKey.' },
          { status: 400 }
        );
      }

      const result = await setDayRoutineOverride({
        date,
        routineKey: routineKey as RoutineKey,
        title,
        category,
        dayType,
        description,
        targetStepsMin,
        targetStepsMax,
        customExercises,
        notes,
      });

      return NextResponse.json({
        success: result.success,
        message: result.message,
        override: result.override,
      });
    }

    if (action === 'reset') {
      const { date } = body;
      if (!date) {
        return NextResponse.json(
          { success: false, error: 'Se requiere date (YYYY-MM-DD) para restaurar la sesión.' },
          { status: 400 }
        );
      }

      const result = await resetDayRoutineOverride(date);
      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    }

    return NextResponse.json(
      { success: false, error: `Acción desconocida: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando solicitud de calendario' },
      { status: 500 }
    );
  }
}
