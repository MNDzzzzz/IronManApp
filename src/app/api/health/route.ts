// Endpoint para consultar métricas de salud (Galaxy Fit3)
import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';

export async function GET() {
  try {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('daily_health_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(14);

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          today: data[0],
          history: data,
        });
      }
    }

    return NextResponse.json({
      today: mockStore.dailyMetrics[0] || null,
      history: mockStore.dailyMetrics,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
