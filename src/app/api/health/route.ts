// Endpoint para consultar métricas de salud (Galaxy Fit3)
import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('daily_health_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(14);

      if (!error && data && data.length > 0) {
        return NextResponse.json(
          {
            today: data[0],
            history: data,
          },
          { headers: noCacheHeaders }
        );
      }
    }

    return NextResponse.json(
      {
        today: mockStore.dailyMetrics[0] || null,
        history: mockStore.dailyMetrics,
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

