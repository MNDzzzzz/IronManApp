// ====================================================================
// ENDPOINT DE REPORTES SEMANALES: IronManApp (/api/reports/weekly)
// Consulta de datos reales consolidados y generación de PDF oficial
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getWeekDateRange,
  getWeeklyReportDataset,
} from '@/lib/reports/weeklyDataAggregator';
import { generateWeeklyClinicalAssessment } from '@/lib/reports/weeklyClinicalEngine';
import { generateWeeklyReportPdf } from '@/lib/reports/weeklyPdfGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' o 'pdf'
    const weekOffsetStr = searchParams.get('weekOffset') || '0';
    const weekOffset = parseInt(weekOffsetStr, 10) || 0;

    let startDateStr = searchParams.get('startDate');
    let endDateStr = searchParams.get('endDate');

    // Si no se proporcionaron fechas explícitas, calcular rango por weekOffset
    if (!startDateStr || !endDateStr) {
      const range = getWeekDateRange(weekOffset);
      startDateStr = range.startDate;
      endDateStr = range.endDate;
    }

    // 1. Extraer dataset real consolidado
    const dataset = await getWeeklyReportDataset(startDateStr, endDateStr);

    // 2. Generar diagnóstico clínico y prescripción para la semana N+1
    const assessment = generateWeeklyClinicalAssessment(dataset);

    // Si se solicita el PDF binario
    if (format === 'pdf') {
      const pdfBytes = await generateWeeklyReportPdf(dataset, assessment);
      const filename = `IronMan_Informe_Semanal_Semana_${dataset.weekNumber}_${dataset.startDate}.pdf`;

      return new Response(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Respuesta JSON completa para la interfaz web o clientes API
    return NextResponse.json(
      {
        success: true,
        weekOffset,
        startDate: startDateStr,
        endDate: endDateStr,
        dataset,
        assessment,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generando informe semanal en /api/reports/weekly:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno generando informe semanal',
      },
      { status: 500 }
    );
  }
}
