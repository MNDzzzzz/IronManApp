// ====================================================================
// ENDPOINT: /api/auth/register
// POST: Crear una nueva cuenta / perfil de atleta con validaciones
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { registerAthleteProfile, getUserProfileByUsername } from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, email, bio, targetRaceName } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'El nombre de usuario es obligatorio' },
        { status: 400 }
      );
    }

    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: 'El usuario debe tener entre 3 y 20 caracteres (solo letras minúsculas, números o guiones bajos)' },
        { status: 400 }
      );
    }

    let resolvedEmail = `${cleanUsername}@ironman.app`;
    if (email && typeof email === 'string' && email.trim().length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Introduce un correo electrónico válido' },
          { status: 400 }
        );
      }
      resolvedEmail = email.trim();
    }

    const existing = getUserProfileByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `El usuario @${cleanUsername} ya está en uso. Elige otro o inicia sesión.` },
        { status: 409 }
      );
    }

    // Comprobar también unicidad en Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: supaProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, username')
          .or(`username.ilike.${cleanUsername},email.ilike.${resolvedEmail}`)
          .limit(1);

        if (supaProfiles && supaProfiles.length > 0) {
          return NextResponse.json(
            { success: false, error: `El usuario @${cleanUsername} o email ya está registrado. Inicia sesión en su lugar.` },
            { status: 409 }
          );
        }
      } catch (checkErr) {
        console.warn('Supabase profile uniqueness check warning:', checkErr);
      }
    }

    const newProfile = registerAthleteProfile({
      name: name.trim(),
      username: cleanUsername,
      email: resolvedEmail,
      bio: bio?.trim(),
      targetRaceName: targetRaceName?.trim() || 'Media Maratón 21K 2027',
    });

    // Persistir en Supabase si está disponible
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: newProfile.id,
          username: newProfile.username,
          display_name: newProfile.display_name,
          email: newProfile.email,
          bio: newProfile.bio,
          avatar_url: newProfile.avatar_url,
          target_race_name: newProfile.target_race_name,
          target_race_date: newProfile.target_race_date,
          weekly_workout_goal: newProfile.weekly_workout_goal,
          total_xp: newProfile.total_xp,
          current_level: newProfile.current_level,
          current_streak_days: newProfile.current_streak_days,
          best_streak_days: newProfile.best_streak_days,
        }, { onConflict: 'id' });
      } catch (supaErr) {
        console.warn('Supabase register profile warning:', supaErr);
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        data: newProfile,
        message: `¡Bienvenido a IronManApp, ${newProfile.display_name}!`,
      },
      { status: 201 }
    );

    response.cookies.set('ironman_session', newProfile.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar atleta';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
