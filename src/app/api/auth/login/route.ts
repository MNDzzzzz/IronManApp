// ====================================================================
// ENDPOINT: /api/auth/login
// POST: Iniciar sesión de atleta mediante @username o email
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  loginAthlete,
  normalizeAthleteText,
  upsertUserProfile,
} from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput = body.usernameOrEmail || body.identifier || body.username || body.email;

    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      return NextResponse.json(
        { success: false, error: 'Introduce tu usuario (@username) o email' },
        { status: 400 }
      );
    }

    const cleanInput = rawInput.trim().toLowerCase().replace(/^@/, '');
    const normalizedInput = normalizeAthleteText(cleanInput);

    // 1. Buscar primero en el almacén en memoria (flexible: username, email, display_name)
    let profile = loginAthlete(rawInput);

    // 2. Si no está en memoria, consultar en Supabase
    if (!profile && isSupabaseConfigured && supabaseAdmin) {
      try {
        // A. Búsqueda exacta y case-insensitive por username o email
        const { data: directProfiles, error: directErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or(`username.ilike.${cleanInput},email.ilike.${cleanInput},username.ilike.${normalizedInput},email.ilike.${normalizedInput}`)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!directErr && directProfiles && directProfiles.length > 0 && directProfiles[0]) {
          profile = directProfiles[0];
        }

        // B. Fallback: búsqueda por display_name si el atleta introdujo su nombre o apellido
        if (!profile) {
          const { data: displayProfiles, error: dispErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${cleanInput}%,display_name.ilike.%${normalizedInput}%`)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (!dispErr && displayProfiles && displayProfiles.length > 0 && displayProfiles[0]) {
            profile = displayProfiles[0];
          }
        }

        if (profile) {
          upsertUserProfile(profile);
        }
      } catch (err) {
        console.warn('Supabase login query warning:', err);
      }
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Atleta no encontrado. Comprueba los datos o crea una cuenta.' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: profile,
      message: `¡Sesión iniciada con éxito! Hola de nuevo, ${profile.display_name}.`,
    });

    // Fijar cookie HTTP-only segura de sesión (30 días)
    response.cookies.set('ironman_session', profile.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    // Fijar cookie accesible para sincronización cliente
    response.cookies.set('ironman_athlete_id', profile.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

