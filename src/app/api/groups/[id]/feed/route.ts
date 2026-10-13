// ====================================================================
// ENDPOINT: /api/groups/[id]/feed
// GET: Feed de check-ins de la tribu con avatares y reacciones
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSquadFeed } from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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

    // 1. Si Supabase está disponible, consultar checkins de miembros de la tribu
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: members, error: mErr } = await supabaseAdmin
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        let userIds = (!mErr && members) ? members.map((m: any) => m.user_id) : [];

        // Incluir siempre al creador de la tribu en la lista de usuarios
        const { data: grp } = await supabaseAdmin
          .from('groups')
          .select('created_by')
          .eq('id', groupId)
          .maybeSingle();

        if (grp?.created_by && !userIds.includes(grp.created_by)) {
          userIds.push(grp.created_by);
        }

        if (userIds.length > 0) {
          const { data: dbCheckins, error: cErr } = await supabaseAdmin
            .from('checkins')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: false })
            .limit(30);

          if (!cErr && dbCheckins && dbCheckins.length > 0) {
            // Enriquecer con perfiles de atleta
            const { data: profiles } = await supabaseAdmin
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .in('id', userIds);

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

            // Consultar reacciones asociadas a estos checkins
            const checkinIds = dbCheckins.map((c: any) => c.id);
            const { data: dbReactions } = await supabaseAdmin
              .from('checkin_reactions')
              .select('*')
              .in('checkin_id', checkinIds);

            const reactionsByCheckin = new Map<string, any[]>();
            (dbReactions || []).forEach((r: any) => {
              const list = reactionsByCheckin.get(r.checkin_id) || [];
              list.push({
                emoji: r.emoji,
                user_id: r.user_id,
                created_at: r.created_at,
              });
              reactionsByCheckin.set(r.checkin_id, list);
            });

            const enriched = dbCheckins.map((chk: any) => {
              const u = profileMap.get(chk.user_id);
              return {
                ...chk,
                metrics_summary: chk.metrics_summary || {},
                user: u ? {
                  id: u.id,
                  username: u.username,
                  display_name: u.display_name,
                  avatar_url: u.avatar_url,
                } : undefined,
                reactions: reactionsByCheckin.get(chk.id) || [],
              };
            });

            return NextResponse.json({
              success: true,
              data: enriched,
              total: enriched.length,
            });
          }
        }
      } catch (supaErr) {
        console.warn('Supabase feed query fallback:', supaErr);
      }
    }

    // 2. Fallback a memoria
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
