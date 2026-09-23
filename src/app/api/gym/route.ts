// Endpoint para rutinas y registro de series de gimnasio / fuerza
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { GymWorkoutLog } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let exercises = mockStore.gymExercises;
    let logs = mockStore.gymLogs;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: dbExercises } = await supabaseAdmin.from('gym_exercises').select('*');
      if (dbExercises && dbExercises.length > 0) exercises = dbExercises;

      const { data: dbLogs } = await supabaseAdmin
        .from('gym_workout_logs')
        .select('*, gym_exercises(*)')
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (dbLogs) logs = dbLogs;
    } else {
      logs = mockStore.gymLogs.filter((l) => l.date === date);
    }

    return NextResponse.json({
      exercises,
      logs,
      date,
    });
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
