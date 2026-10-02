// ====================================================================
// ENDPOINT: ADAPTACIÓN SEMANAL DE NUTRICIÓN: IronManApp
// Permite calcular la adaptación nutricional con base en datos reales
// y aplicarla directamente al protocolo activo de la aplicación.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateWeeklyDietAdaptation,
  applyDietAdaptation,
  getLatestNutritionAdaptation,
} from '@/lib/reports/nutritionAdapter';
import { aggregateWeeklyTelemetry } from '@/lib/reports/weeklyDataAggregator';
import { activeProtocol } from '@/lib/nutritionProtocol';
import { NutritionAdaptation } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Consultar última adaptación y estado actual del protocolo
 */
export async function GET() {
  try {
    const latest = await getLatestNutritionAdaptation();

    return NextResponse.json({
      success: true,
      currentProtocol: activeProtocol,
      latestAdaptation: latest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error consultando adaptación nutricional' },
      { status: 500 }
    );
  }
}

/**
 * POST: Calcular o aplicar la adaptación semanal
 * Acciones soportadas:
 * - 'calculate': agrega datos reales de la semana y produce la prescripción adaptada
 * - 'apply': aplica la prescripción calculada o pasada al protocolo activo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'calculate';
    const weekOffset = Number(body.weekOffset) || 0;

    if (action === 'calculate') {
      // 1. Agregar telemetría 100% real de la semana
      const dataset = await aggregateWeeklyTelemetry(weekOffset);
      // 2. Calcular la prescripción adaptativa
      const dietPlan = calculateWeeklyDietAdaptation(dataset);

      return NextResponse.json({
        success: true,
        dietPlan,
        summaryEvaluated: dataset.summary,
      });
    }

    if (action === 'apply') {
      let adaptationToApply: NutritionAdaptation;

      if (body.adaptation) {
        adaptationToApply = body.adaptation;
      } else {
        // Si no se envió adaptación en el cuerpo, calculamos la correspondiente a la semana
        const dataset = await aggregateWeeklyTelemetry(weekOffset);
        const dietPlan = calculateWeeklyDietAdaptation(dataset);
        adaptationToApply = dietPlan.adaptation;
      }

      const result = await applyDietAdaptation(adaptationToApply);

      return NextResponse.json({
        success: result.success,
        message: result.message,
        appliedProtocol: result.appliedProtocol,
      });
    }

    return NextResponse.json(
      { success: false, error: `Acción no reconocida: ${action}. Usa 'calculate' o 'apply'.` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando adaptación nutricional' },
      { status: 500 }
    );
  }
}
