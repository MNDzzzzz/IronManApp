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
