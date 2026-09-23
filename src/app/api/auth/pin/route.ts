// Endpoint de autenticación con PIN Maestro para iPhone Safari
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const masterPin = process.env.APP_MASTER_PIN || '1234';

    if (pin === masterPin) {
      const response = NextResponse.json({ success: true, message: 'Acceso autorizado' });
      // Establecer cookie de sesión persistente por 365 días
      response.cookies.set('ironman_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ success: false, error: 'PIN incorrecto' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
