// Endpoint para rutinas y registro de series de gimnasio / fuerza
// Con aislamiento multi-tenant estricto y protección contra fugas de datos
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { GymWorkoutLog } from '@/types/database';
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
    const dateParam = searchParams.get('date');
    const { athleteId, isAlvaro } = getAuthAthlete(request);

    let exercises = mockStore.gymExercises;
    let logs: GymWorkoutLog[] = [];

    // 0. Si no hay atleta identificado (visitante o anónimo), devolver series vacías (Zero Data Leakage)
    if (!athleteId) {
      return NextResponse.json(
        {
          exercises,
          logs: [],
          date: dateParam || new Date().toISOString().split('T')[0],
        },
        { headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: dbExercises } = await supabaseAdmin.from('gym_exercises').select('*');
      if (dbExercises && dbExercises.length > 0) exercises = dbExercises;

      let query = supabaseAdmin
        .from('gym_workout_logs')
        .select('*, gym_exercises(*)')
        .order('created_at', { ascending: true });

      if (isAlvaro) {
        query = query.or(`user_id.eq.${athleteId},user_id.is.null`);
      } else {
        query = query.eq('user_id', athleteId);
      }

      if (dateParam) {
        query = query.eq('date', dateParam);
      }

      const { data: dbLogs } = await query;
      if (dbLogs) logs = dbLogs;
    } else if (isAlvaro) {
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
    const { athleteId: detectedAuthId, isAlvaro: detectedAlvaro } = getAuthAthlete(request);
    const athleteId = detectedAuthId || body.userId || body.userProfile?.id || request.headers.get('x-athlete-id') || null;

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    const isAlvaro = detectedAlvaro || (typeof athleteId === 'string' && athleteId.toLowerCase().includes('alvaro'));
    const todayStr = new Date().toISOString().split('T')[0];

    const newLog: GymWorkoutLog & { user_id?: string | null } = {
      id: `log-${Date.now()}`,
      user_id: athleteId || null,
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
      if (newLog.weight_kg > 0) {
        await supabaseAdmin
          .from('gym_exercises')
          .update({ current_weight_kg: newLog.weight_kg })
          .eq('id', newLog.exercise_id);
      }
    }
    if (isAlvaro) {
      mockStore.gymLogs.push(newLog as GymWorkoutLog);
      const mockEx = mockStore.gymExercises.find((e) => e.id === newLog.exercise_id);
      if (mockEx && newLog.weight_kg > 0) {
        mockEx.current_weight_kg = newLog.weight_kg;
      }
    }

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { athleteId, isAlvaro } = getAuthAthlete(request);

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Falta el id de la serie' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      let q = supabaseAdmin.from('gym_workout_logs').delete().eq('id', id);
      if (!isAlvaro) q = q.eq('user_id', athleteId);
      await q;
    }
    if (isAlvaro) {
      mockStore.gymLogs = mockStore.gymLogs.filter((l) => l.id !== id);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
