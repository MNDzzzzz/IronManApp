// Endpoint para consultar métricas de salud (Galaxy Fit3) y telemetría continua de FC
// Con aislamiento multi-tenant estricto y protección contra fugas de datos
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { getAuthAthlete } from '@/lib/auth/getAuthAthlete';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    };

    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date'); // YYYY-MM-DD opcional
    const todayStr = new Date().toISOString().split('T')[0];
    const { athleteId, isAlvaro } = getAuthAthlete(request);

    // 0. Si no hay atleta identificado (visitante o anónimo), devolver conjunto vacío (Zero Data Leakage)
    if (!athleteId) {
      return NextResponse.json(
        {
          today: null,
          selected_date: requestedDate || todayStr,
          history: [],
          hr_samples: [],
        },
        { headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Obtener métricas diarias consolidadas filtradas por atleta
      let metricsQuery = supabaseAdmin
        .from('daily_health_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (isAlvaro) {
        metricsQuery = metricsQuery.or(`user_id.eq.${athleteId},user_id.is.null`);
      } else {
        metricsQuery = metricsQuery.eq('user_id', athleteId);
      }

      const { data: metrics, error: metricsError } = await metricsQuery;

      const history = !metricsError && metrics ? metrics : [];
      const effectiveDate = requestedDate || (history.length > 0 ? history[0].date : todayStr);
      const selectedMetric = history.find((m) => m.date === effectiveDate) || (history.length > 0 ? history[0] : null);

      // 2. Obtener muestras de pulso (series temporales continuas de la Fit3) para el día
      let hrQuery = supabaseAdmin
        .from('heart_rate_samples')
        .select('timestamp, bpm')
        .gte('timestamp', `${effectiveDate}T00:00:00.000Z`)
        .lte('timestamp', `${effectiveDate}T23:59:59.999Z`)
        .order('timestamp', { ascending: true })
        .limit(1440);

      if (isAlvaro) {
        hrQuery = hrQuery.or(`user_id.eq.${athleteId},user_id.is.null`);
      } else {
        hrQuery = hrQuery.eq('user_id', athleteId);
      }

      const { data: hrSamples } = await hrQuery;

      return NextResponse.json(
        {
          today: selectedMetric,
          selected_date: effectiveDate,
          history: history,
          hr_samples: hrSamples || [],
        },
        { headers: noCacheHeaders }
      );
    }

    // Modo memoria (mock) solo para el atleta principal Álvaro
    if (isAlvaro) {
      const history = mockStore.dailyMetrics;
      const effectiveDate = requestedDate || (history.length > 0 ? history[0].date : todayStr);
      const selectedMetric = history.find((m) => m.date === effectiveDate) || history[0] || null;
      const hrSamples = mockStore.hrSamples
        .filter((s) => s.timestamp.startsWith(effectiveDate))
        .map((s) => ({ timestamp: s.timestamp, bpm: s.bpm }));

      return NextResponse.json(
        {
          today: selectedMetric,
          selected_date: effectiveDate,
          history: history,
          hr_samples: hrSamples,
        },
        { headers: noCacheHeaders }
      );
    }

    // Cualquier otro usuario en modo memoria arranca limpio
    return NextResponse.json(
      {
        today: null,
        selected_date: requestedDate || todayStr,
        history: [],
        hr_samples: [],
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
