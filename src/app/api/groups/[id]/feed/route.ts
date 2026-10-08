// ====================================================================
// ENDPOINT: /api/groups/[id]/feed
// GET: Feed de check-ins de la tribu con avatares y reacciones
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSquadFeed } from '@/lib/socialManager';

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

    const feed = getSquadFeed(groupId);

    return NextResponse.json({
      success: true,
      data: feed,
      total: feed.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener feed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
