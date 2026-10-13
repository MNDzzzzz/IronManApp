// ====================================================================
// ENDPOINT: /api/groups/join
// POST: Unirse a una tribu mediante código de invitación
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  joinGroupByInviteCode,
  getUserProfile,
  getGroupByInviteCode,
  upsertUserProfile,
  socialStore,
  MASTER_ATHLETE_ID,
} from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SquadGroup } from '@/types/social';

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

    const cleanCode = code.trim().toUpperCase();
    const athleteId = userId || request.headers.get('x-athlete-id') || body.userProfile?.id || MASTER_ATHLETE_ID;

    if (body.userProfile) {
      upsertUserProfile(body.userProfile);
    }

    // 1. Buscar en memoria o en Supabase
    let group = getGroupByInviteCode(cleanCode);
    if (!group && isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: dbGroup } = await supabaseAdmin
          .from('groups')
          .select('*')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        if (dbGroup) {
          const { count } = await supabaseAdmin
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', dbGroup.id);

          const loadedGroup: SquadGroup = {
            id: dbGroup.id,
            name: dbGroup.name,
            description: dbGroup.description,
            invite_code: dbGroup.invite_code,
            created_by: dbGroup.created_by,
            avatar_emoji: dbGroup.avatar_emoji,
            max_members: dbGroup.max_members || 15,
            created_at: dbGroup.created_at,
            members_count: count || 1,
          };
          group = loadedGroup;

          if (!socialStore.groups.some((g) => g.id === loadedGroup.id)) {
            socialStore.groups.push(loadedGroup);
          }
        }
      } catch (err) {
        console.warn('Error buscando grupo en Supabase por código:', err);
      }
    }

    const result = joinGroupByInviteCode(cleanCode, athleteId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo unir a la tribu' },
        { status: 400 }
      );
    }

    // Persistir en Supabase si está activo
    if (isSupabaseConfigured && supabaseAdmin && result.group) {
      try {
        const profileToUpsert = body.userProfile || getUserProfile(athleteId);
        if (profileToUpsert) {
          await supabaseAdmin.from('profiles').upsert({
            id: profileToUpsert.id,
            username: profileToUpsert.username,
            display_name: profileToUpsert.display_name,
            avatar_url: profileToUpsert.avatar_url,
            bio: profileToUpsert.bio,
            email: profileToUpsert.email,
          }, { onConflict: 'id' });
        }

        await supabaseAdmin.from('group_members').upsert({
          id: `mem-${Date.now()}-${athleteId.slice(-4)}`,
          group_id: result.group.id,
          user_id: athleteId,
          role: 'member',
          joined_at: new Date().toISOString(),
          group_xp: 0,
          weekly_checkins_count: 0,
        }, { onConflict: 'group_id,user_id' });
      } catch (supaErr) {
        console.warn('Supabase join warning:', supaErr);
      }
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
