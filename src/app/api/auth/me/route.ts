// ====================================================================
// ENDPOINT: /api/auth/me
// Devuelve el perfil del atleta activo (o usuario maestro por defecto)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, MASTER_ATHLETE_ID } from '@/lib/socialManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get('userId') || MASTER_ATHLETE_ID;

    const profile = getUserProfile(requestedUserId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Perfil de atleta no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener sesión';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
