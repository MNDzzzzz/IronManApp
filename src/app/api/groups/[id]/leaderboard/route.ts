// ====================================================================
// ENDPOINT: /api/groups/[id]/leaderboard
// GET: Clasificación y podio semanal de la tribu (XP, check-ins y rachas)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSquadLeaderboard, MASTER_ATHLETE_ID } from '@/lib/socialManager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'ID de tribu no especificado' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('userId') || MASTER_ATHLETE_ID;

    const leaderboard = getSquadLeaderboard(groupId, currentUserId);

    return NextResponse.json({
      success: true,
      data: leaderboard,
      total_members: leaderboard.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener leaderboard';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
