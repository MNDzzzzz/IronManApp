// ====================================================================
// ENDPOINT: /api/groups/[id]/leaderboard
// GET: Clasificación y podio semanal de la tribu (XP, check-ins y rachas)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSquadLeaderboard, MASTER_ATHLETE_ID } from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SquadLeaderboardEntry } from '@/types/social';

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
    const currentUserId = searchParams.get('userId') || request.headers.get('x-athlete-id') || MASTER_ATHLETE_ID;

    // 1. Si Supabase está disponible, consultar datos reales de Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: members, error: mErr } = await supabaseAdmin
          .from('group_members')
          .select('*')
          .eq('group_id', groupId);

        let memberList = (!mErr && members) ? [...members] : [];

        // Incluir al creador si por alguna razón no está en group_members
        const { data: grp } = await supabaseAdmin
          .from('groups')
          .select('created_by')
          .eq('id', groupId)
          .maybeSingle();

        if (grp?.created_by && !memberList.some((m: any) => m.user_id === grp.created_by)) {
          memberList.push({
            id: `mem-creator-${grp.created_by}`,
            group_id: groupId,
            user_id: grp.created_by,
            role: 'owner',
            group_xp: 0,
            weekly_checkins_count: 0,
          });
        }

        if (memberList.length > 0) {
          const userIds = memberList.map((m: any) => m.user_id);
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', userIds);

          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

          // Calcular checkins de la última semana por usuario
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recentCheckins } = await supabaseAdmin
            .from('checkins')
            .select('user_id, xp_awarded, is_gold_checkin')
            .in('user_id', userIds)
            .gte('created_at', oneWeekAgo);

          const xpByUser = new Map<string, number>();
          const countByUser = new Map<string, number>();
          const goldByUser = new Map<string, boolean>();

          (recentCheckins || []).forEach((c: any) => {
            xpByUser.set(c.user_id, (xpByUser.get(c.user_id) || 0) + (c.xp_awarded || 100));
            countByUser.set(c.user_id, (countByUser.get(c.user_id) || 0) + 1);
            if (c.is_gold_checkin) goldByUser.set(c.user_id, true);
          });

          const entries: SquadLeaderboardEntry[] = memberList.map((m: any) => {
            const prof = profileMap.get(m.user_id);
            const weeklyXp = (xpByUser.get(m.user_id) || 0) + (m.group_xp || 0);
            const weeklyCheckins = countByUser.get(m.user_id) || m.weekly_checkins_count || 0;
            return {
              rank: 0,
              user_id: m.user_id,
              username: prof?.username || 'atleta',
              display_name: prof?.display_name || 'Compañero',
              avatar_url: prof?.avatar_url || undefined,
              weekly_xp: weeklyXp,
              weekly_checkins: weeklyCheckins,
              current_streak: prof?.current_streak_days || 0,
              is_current_user: m.user_id === currentUserId,
              has_gold_this_week: Boolean(goldByUser.get(m.user_id)),
            };
          });

          entries.sort((a, b) => {
            if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
            if (b.weekly_checkins !== a.weekly_checkins) return b.weekly_checkins - a.weekly_checkins;
            return b.current_streak - a.current_streak;
          });

          entries.forEach((e, idx) => {
            e.rank = idx + 1;
          });

          return NextResponse.json({
            success: true,
            data: entries,
            total_members: entries.length,
          });
        }
      } catch (supaErr) {
        console.warn('Supabase leaderboard fetch fallback to memory:', supaErr);
      }
    }

    // 2. Fallback a memoria
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
