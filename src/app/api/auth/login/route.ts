// ====================================================================
// ENDPOINT: /api/auth/login
// POST: Iniciar sesión de atleta mediante @username o email
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfileByUsername, socialStore } from '@/lib/socialManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail } = body;

    if (!usernameOrEmail || typeof usernameOrEmail !== 'string' || !usernameOrEmail.trim()) {
      return NextResponse.json(
        { success: false, error: 'Introduce tu usuario (@username) o email' },
        { status: 400 }
      );
    }

    const cleanInput = usernameOrEmail.trim().toLowerCase().replace(/^@/, '');

    // Buscar por username o por email
    let profile = getUserProfileByUsername(cleanInput);

    if (!profile) {
      profile = socialStore.profiles.find((p) => p.email?.toLowerCase() === cleanInput) || null;
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Atleta no encontrado. Comprueba los datos o crea una cuenta.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: `¡Sesión iniciada con éxito! Hola de nuevo, ${profile.display_name}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
