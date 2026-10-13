// ====================================================================
// ENDPOINT: /api/auth/me
// Devuelve el perfil del atleta activo o permite registrar/actualizar
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserProfile,
  registerAthleteProfile,
  upsertUserProfile,
  socialStore,
  MASTER_ATHLETE_ID,
} from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get('userId');

    // 1. Si se solicita un ID específico
    if (requestedUserId) {
      let profile = getUserProfile(requestedUserId);

      if (!profile && isSupabaseConfigured && supabaseAdmin) {
        try {
          const { data: dbProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', requestedUserId)
            .single();
          if (dbProfile) {
            profile = dbProfile;
            upsertUserProfile(dbProfile);
          }
        } catch {}
      }

      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'Perfil de atleta no encontrado' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        authenticated: true,
        data: profile,
      });
    }

    // 2. Si no se especifica ID, comprobar cookie de sesión activa
    const sessionCookie = request.cookies.get('ironman_session')?.value;
    if (sessionCookie) {
      let profile = getUserProfile(sessionCookie);

      if (!profile && isSupabaseConfigured && supabaseAdmin) {
        try {
          const { data: dbProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', sessionCookie)
            .single();
          if (dbProfile) {
            profile = dbProfile;
            upsertUserProfile(dbProfile);
          }
        } catch {}
      }

      if (profile) {
        return NextResponse.json({
          success: true,
          authenticated: true,
          data: profile,
        });
      }
    }

    // 3. Estado cero: No hay sesión activa aún (visitante nuevo o desconectado)
    return NextResponse.json({
      success: true,
      authenticated: false,
      data: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener sesión';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, bio, weeklyGoal, targetRaceName, targetRaceDate, avatarUrl } = body;

    if (!name || !username) {
      return NextResponse.json(
        { success: false, error: 'Nombre y @username son campos requeridos' },
        { status: 400 }
      );
    }

    const profile = registerAthleteProfile({
      name,
      username,
      bio,
      weeklyGoal: weeklyGoal ? Number(weeklyGoal) : undefined,
      targetRaceName,
      targetRaceDate,
      avatarUrl,
    });

    return NextResponse.json(
      { success: true, message: 'Perfil registrado correctamente', data: profile },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar perfil';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
