// Endpoint para detalle de una actividad con stream completo de GPS, altitud, ritmo y pulso Fit3
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id || params.id === 'strava-upload') {
      return NextResponse.json({ error: 'Endpoint strava-upload requiere método POST' }, { status: 405 });
    }
    const activityId = Number(params.id);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'ID de actividad no válido' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('strava_activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (!error && data) {
        return NextResponse.json({ activity: data });
      }
    }

    const activity = mockStore.stravaActivities.find((a) => a.id === activityId);
    if (activity) {
      return NextResponse.json({ activity });
    }

    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
