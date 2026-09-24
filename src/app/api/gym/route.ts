// Endpoint para rutinas y registro de series de gimnasio / fuerza
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { GymWorkoutLog } from '@/types/database';

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
    const dateParam = searchParams.get('date');

    let exercises = mockStore.gymExercises;
    let logs = mockStore.gymLogs;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: dbExercises } = await supabaseAdmin.from('gym_exercises').select('*');
      if (dbExercises && dbExercises.length > 0) exercises = dbExercises;

      let query = supabaseAdmin
        .from('gym_workout_logs')
        .select('*, gym_exercises(*)')
        .order('created_at', { ascending: true });

      if (dateParam) {
        query = query.eq('date', dateParam);
      }

      const { data: dbLogs } = await query;
      if (dbLogs) logs = dbLogs;
    } else {
      logs = dateParam ? mockStore.gymLogs.filter((l) => l.date === dateParam) : mockStore.gymLogs;
    }

    return NextResponse.json(
      {
        exercises,
        logs,
        date: dateParam || new Date().toISOString().split('T')[0],
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const todayStr = new Date().toISOString().split('T')[0];

    const newLog: GymWorkoutLog = {
      id: `log-${Date.now()}`,
      date: body.date || todayStr,
      exercise_id: body.exercise_id,
      set_number: Number(body.set_number),
      reps: Number(body.reps),
      weight_kg: Number(body.weight_kg),
      rpe: body.rpe ? Number(body.rpe) : undefined,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('gym_workout_logs').insert([newLog]);
    }
    mockStore.gymLogs.push(newLog);

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
