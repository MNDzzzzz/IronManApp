import { NextRequest, NextResponse } from 'next/server';
import { executeCoachTurn, getAppSnapshot, getSpainTodayStr } from '@/lib/coach/coachCore';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text, audioBase64, mimeType } = body;

    if (!text && !audioBase64) {
      return NextResponse.json(
        { success: false, error: 'Se requiere mensaje de texto o nota de voz' },
        { status: 400 }
      );
    }

    // Validaciones de seguridad de payload
    if (text && (typeof text !== 'string' || text.length > 4000)) {
      return NextResponse.json(
        { success: false, error: 'El mensaje de texto no puede exceder los 4.000 caracteres' },
        { status: 400 }
      );
    }

    if (audioBase64) {
      if (typeof audioBase64 !== 'string' || audioBase64.length > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'El archivo de audio supera el límite permitido (10MB)' },
          { status: 400 }
        );
      }
      const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/m4a', 'audio/mp3', 'audio/x-m4a', 'audio/aac'];
      if (mimeType && !allowedMimes.some((m) => mimeType.toLowerCase().startsWith(m))) {
        return NextResponse.json(
          { success: false, error: 'Formato de audio no compatible' },
          { status: 400 }
        );
      }
    }

    const result = await executeCoachTurn({
      text,
      audioBase64,
      mimeType,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error en /api/coach/message:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error procesando interacción con el Coach',
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const todayStr = getSpainTodayStr();
    const snapshot = await getAppSnapshot(todayStr);
    return NextResponse.json({ success: true, snapshot });
  } catch (err: any) {
    console.error('Error en GET /api/coach/message:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error obteniendo estado del Coach' },
      { status: 500 }
    );
  }
}
