// ====================================================================
// ENDPOINT: /api/groups/[id]/members/[userId]
// GET: Resumen de perfil público condensado y no-intrusivo de un compañero
// REGLA DE ORO DE PRIVACIDAD: Jamás expone calorías, báscula ni datos médicos
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMemberPublicSummary } from '@/lib/socialManager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID de atleta no especificado' },
        { status: 400 }
      );
    }

    const summary = getMemberPublicSummary(userId);
    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Perfil de atleta no encontrado' },
        { status: 404 }
      );
    }

    // Doble verificación defensiva contra fugas de PII
    const safePayload = {
      user_id: summary.user_id,
      username: summary.username,
      display_name: summary.display_name,
      avatar_url: summary.avatar_url,
      bio: summary.bio,
      current_level: summary.current_level,
      total_xp: summary.total_xp,
      current_streak_days: summary.current_streak_days,
      weekly_adherence_pct: summary.weekly_adherence_pct,
      weekly_km_total: summary.weekly_km_total,
      weekly_strength_sets: summary.weekly_strength_sets,
      badges_count: summary.badges_count,
      badges: summary.badges,
      recent_checkins: summary.recent_checkins,
    };

    return NextResponse.json({
      success: true,
      data: safePayload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener resumen de atleta';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
