// ====================================================================
// ENDPOINT: /api/groups
// GET: Listar tribus a las que pertenece el atleta
// POST: Crear una nueva tribu con código de invitación único
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserGroups,
  createSquadGroup,
  MASTER_ATHLETE_ID,
} from '@/lib/socialManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || MASTER_ATHLETE_ID;

    const groups = getUserGroups(userId);

    return NextResponse.json({
      success: true,
      data: groups,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener tribus';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, avatarEmoji, userId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la tribu es obligatorio' },
        { status: 400 }
      );
    }

    const creatorId = userId || MASTER_ATHLETE_ID;
    const newGroup = createSquadGroup(name, creatorId, description, avatarEmoji || '⚡');

    return NextResponse.json(
      {
        success: true,
        data: newGroup,
        message: `Tribu creada exitosamente con código ${newGroup.invite_code}`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear tribu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
