// ====================================================================
// ENDPOINT: /api/checkins/reactions
// POST: Añadir o alternar micro-reacción háptica en un check-in
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { toggleCheckInReaction, MASTER_ATHLETE_ID } from '@/lib/socialManager';
import { ReactionEmoji } from '@/types/social';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkinId, userId, emoji } = body;

    if (!checkinId || typeof checkinId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID del check-in es requerido' },
        { status: 400 }
      );
    }

    const validEmojis: ReactionEmoji[] = ['🔥', '💪', '⚡', '👑', '🫡'];
    if (!emoji || !validEmojis.includes(emoji)) {
      return NextResponse.json(
        { success: false, error: 'Emoji no admitido' },
        { status: 400 }
      );
    }

    const athleteId = userId || MASTER_ATHLETE_ID;
    const result = toggleCheckInReaction(checkinId, athleteId, emoji);

    return NextResponse.json({
      success: true,
      data: result.checkin,
      added: result.added,
      message: result.added ? `Reacción ${emoji} enviada` : 'Reacción retirada',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al procesar reacción';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
