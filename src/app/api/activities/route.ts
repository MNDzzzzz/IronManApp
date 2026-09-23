// Endpoint para listar actividades deportivas de Strava con datos fusionados
import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';

export async function GET() {
  try {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('strava_activities')
        .select('id, name, type, start_date, elapsed_time, moving_time, distance, total_elevation_gain, summary_polyline, avg_hr, max_hr')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ activities: data });
      }
    }

    // Fallback a almacén en memoria
    return NextResponse.json({ activities: mockStore.stravaActivities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
