// ====================================================================
// ENDPOINT: /api/auth/logout
// POST: Cerrar sesión activa del atleta y limpiar cookies de sesión
// ====================================================================

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesión cerrada correctamente.',
  });

  response.cookies.set('ironman_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set('ironman_athlete_id', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: false,
    sameSite: 'lax',
  });

  return response;
}
