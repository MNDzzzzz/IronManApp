// Endpoint para listar y registrar actividades de cardio (Samsung Galaxy Fit3 / Rodajes)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { CardioActivity } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('strava_activities')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        // Enriquecer con metadatos guardados en streams_data
        const enrichedActivities: CardioActivity[] = data.map((act: any) => {
          const streamMeta = typeof act.streams_data === 'object' && act.streams_data !== null ? act.streams_data : {};
          return {
            ...act,
            avg_cadence: act.avg_cadence || streamMeta.avg_cadence || 168,
            calories: act.calories || streamMeta.calories || (act.distance ? Math.round((act.distance / 1000) * 85) : 350),
            source: act.source || streamMeta.source || 'galaxy_fit3',
            notes: act.notes || streamMeta.notes || '',
            zone_distribution: act.zone_distribution || streamMeta.zone_distribution || {
              zone1_minutes: 5,
              zone2_minutes: 25,
              zone3_minutes: 5,
              zone4_minutes: 0,
              zone5_minutes: 0,
            },
          };
        });

        return NextResponse.json({ activities: enrichedActivities }, { headers: noCacheHeaders });
      }
    }

    // Fallback a almacén en memoria
    return NextResponse.json({ activities: mockStore.stravaActivities }, { headers: noCacheHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const distanceMeters = Number(body.distance) || 4000;
    const elapsedSeconds = Number(body.elapsed_time) || 2100;
    const movingSeconds = Number(body.moving_time) || elapsedSeconds;
    const avgHr = Number(body.avg_hr) || 142;
    const maxHr = Number(body.max_hr) || 155;
    const avgCadence = Number(body.avg_cadence) || 168;
    const calories = Number(body.calories) || Math.round((distanceMeters / 1000) * 85);

    const newActivity: CardioActivity = {
      id: Date.now(),
      name: body.name || `Rodaje CaCo ${(distanceMeters / 1000).toFixed(1)} km (Galaxy Fit3)`,
      type: body.type || 'Run',
      start_date: body.start_date || new Date().toISOString(),
      elapsed_time: elapsedSeconds,
      moving_time: movingSeconds,
      distance: distanceMeters,
      total_elevation_gain: Number(body.total_elevation_gain) || 10,
      avg_hr: avgHr,
      max_hr: maxHr,
      avg_cadence: avgCadence,
      calories: calories,
      source: body.source || 'galaxy_fit3',
      notes: body.notes || 'Sesión registrada con Galaxy Fit3. Rodaje aeróbico en Zona 2.',
      zone_distribution: body.zone_distribution || {
        zone1_minutes: Math.round((elapsedSeconds / 60) * 0.15),
        zone2_minutes: Math.round((elapsedSeconds / 60) * 0.70),
        zone3_minutes: Math.round((elapsedSeconds / 60) * 0.15),
        zone4_minutes: 0,
        zone5_minutes: 0,
      },
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('strava_activities').insert([
        {
          id: newActivity.id,
          name: newActivity.name,
          type: newActivity.type,
          start_date: newActivity.start_date,
          elapsed_time: newActivity.elapsed_time,
          moving_time: newActivity.moving_time,
          distance: newActivity.distance,
          total_elevation_gain: newActivity.total_elevation_gain,
          avg_hr: newActivity.avg_hr,
          max_hr: newActivity.max_hr,
          streams_data: {
            avg_cadence: newActivity.avg_cadence,
            calories: newActivity.calories,
            source: newActivity.source,
            notes: newActivity.notes,
            zone_distribution: newActivity.zone_distribution,
          },
          merged_hr_data: body.merged_hr_data || [],
        },
      ]);
    }

    mockStore.stravaActivities.unshift(newActivity);

    return NextResponse.json(
      {
        success: true,
        message: 'Rodaje Fit3 guardado con éxito.',
        activity: newActivity,
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    console.error('Error guardando actividad de cardio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

