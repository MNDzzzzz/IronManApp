// ====================================================================
// ENDPOINT: /api/groups/join
// POST: Unirse a una tribu mediante código de invitación
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { joinGroupByInviteCode, MASTER_ATHLETE_ID } from '@/lib/socialManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'El código de invitación es requerido' },
        { status: 400 }
      );
    }

    const athleteId = userId || MASTER_ATHLETE_ID;
    const result = joinGroupByInviteCode(code, athleteId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo unir a la tribu' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.group,
      message: `¡Te has unido con éxito a ${result.group?.name}!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al unirse a la tribu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
