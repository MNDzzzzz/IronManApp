// ====================================================================
// ENDPOINT: /api/auth/register
// POST: Crear una nueva cuenta / perfil de atleta con validaciones
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { registerAthleteProfile, getUserProfileByUsername } from '@/lib/socialManager';

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

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Introduce un correo electrónico válido' },
        { status: 400 }
      );
    }

    const existing = getUserProfileByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `El usuario @${cleanUsername} ya está en uso. Elige otro o inicia sesión.` },
        { status: 409 }
      );
    }

    const newProfile = registerAthleteProfile({
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      bio: bio?.trim(),
      targetRaceName: targetRaceName?.trim() || 'Media Maratón 21K 2027',
    });

    return NextResponse.json(
      {
        success: true,
        data: newProfile,
        message: `¡Bienvenido a IronManApp, ${newProfile.display_name}!`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar atleta';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
