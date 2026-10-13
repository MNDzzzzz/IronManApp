// ====================================================================
// ENDPOINT: /api/groups
// GET: Listar tribus a las que pertenece el atleta
// POST: Crear una nueva tribu con código de invitación único
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserGroups,
  createSquadGroup,
  getUserProfile,
  upsertUserProfile,
  MASTER_ATHLETE_ID,
} from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getAuthAthlete } from '@/lib/auth/getAuthAthlete';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { athleteId: authAthleteId } = getAuthAthlete(request);
    const userId = authAthleteId || searchParams.get('userId');

    // Si no hay atleta autenticado ni especificado, devolver array vacío sin filtrar ni fugar datos
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 1. Si Supabase está configurado, intentar consultar tablas reales de Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      const client = supabaseAdmin;
      try {
        const { data: memberRows, error: mErr } = await client
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        let groupIds = (memberRows || []).map((m: any) => m.group_id);

        // Consultar también grupos donde el atleta sea el creador original
        const { data: createdRows, error: cErr } = await client
          .from('groups')
          .select('id')
          .eq('created_by', userId);

        if (!cErr && createdRows && createdRows.length > 0) {
          const createdIds = createdRows.map((g: any) => g.id);
          groupIds = Array.from(new Set([...groupIds, ...createdIds]));
        }

        if (groupIds.length > 0) {
          const { data: dbGroups, error: gErr } = await client
            .from('groups')
            .select('*')
            .in('id', groupIds);

          if (!gErr && dbGroups && dbGroups.length > 0) {
            const formatted = await Promise.all(
              dbGroups.map(async (g: any) => {
                const { count } = await client
                  .from('group_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('group_id', g.id);
                return {
                  id: g.id,
                  name: g.name,
                  description: g.description,
                  invite_code: g.invite_code,
                  created_by: g.created_by,
                  avatar_emoji: g.avatar_emoji,
                  max_members: g.max_members,
                  created_at: g.created_at,
                  memberCount: count || 1,
                  members_count: count || 1,
                };
              })
            );
            return NextResponse.json({
              success: true,
              data: formatted,
            });
          }
        }
      } catch (supaErr) {
        console.warn('Supabase groups fetch fallback to memory:', supaErr);
      }
    }

    // 2. Fallback a socialStore (memoria)
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
    const { name, description, avatarEmoji, userId, userProfile } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la tribu es obligatorio' },
        { status: 400 }
      );
    }

    const { athleteId: authAthleteId } = getAuthAthlete(request);
    const creatorId = authAthleteId || userId || (userProfile?.id);

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para crear una tribu' },
        { status: 401 }
      );
    }
    
    // Si viene perfil completo en la petición, sincronizarlo en memoria
    if (userProfile && userProfile.id) {
      upsertUserProfile(userProfile);
    }

    const newGroup = createSquadGroup(name, creatorId, description, avatarEmoji || '⚡');

    // Si Supabase está configurado, persistir en PostgreSQL
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const profileToPersist = userProfile || getUserProfile(creatorId);
        if (profileToPersist) {
          await supabaseAdmin.from('profiles').upsert({
            id: profileToPersist.id,
            username: profileToPersist.username,
            display_name: profileToPersist.display_name,
            avatar_url: profileToPersist.avatar_url || null,
            bio: profileToPersist.bio || null,
            email: profileToPersist.email || null,
            target_race_name: profileToPersist.target_race_name || 'Media Maratón 21K 2027',
            target_race_date: profileToPersist.target_race_date || '2027-02-28',
            weekly_workout_goal: profileToPersist.weekly_workout_goal || 5,
            total_xp: profileToPersist.total_xp || 0,
            current_level: profileToPersist.current_level || 1,
            current_streak_days: profileToPersist.current_streak_days || 0,
            best_streak_days: profileToPersist.best_streak_days || 0,
          }, { onConflict: 'id' });
        } else {
          // Asegurar que el creador exista en profiles antes de insertar en groups
          const { data: dbProf } = await supabaseAdmin.from('profiles').select('id').eq('id', creatorId).maybeSingle();
          if (!dbProf) {
            const uniqueSuffix = `${Date.now().toString().slice(-4)}_${Math.random().toString(36).substring(2, 5)}`;
            await supabaseAdmin.from('profiles').insert({
              id: creatorId,
              username: `atleta_${uniqueSuffix}`,
              display_name: 'Atleta IronMan',
            });
          }
        }

        const { error: gErr } = await supabaseAdmin.from('groups').insert({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          invite_code: newGroup.invite_code,
          created_by: creatorId,
          avatar_emoji: newGroup.avatar_emoji,
          max_members: newGroup.max_members,
          created_at: newGroup.created_at,
        });

        if (gErr) {
          console.error('Error al insertar grupo en Supabase:', gErr);
          return NextResponse.json(
            { success: false, error: `Error persistiendo tribu en Supabase: ${gErr.message}` },
            { status: 500 }
          );
        }

        const { error: memErr } = await supabaseAdmin.from('group_members').insert({
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          group_id: newGroup.id,
          user_id: creatorId,
          role: 'owner',
          joined_at: new Date().toISOString(),
          group_xp: 0,
          weekly_checkins_count: 0,
        });

        if (memErr) {
          console.error('Error al insertar miembro en Supabase:', memErr);
        }
      } catch (supaErr: any) {
        console.error('Excepción al persistir grupo en Supabase:', supaErr);
        return NextResponse.json(
          { success: false, error: `Fallo de conexión o base de datos: ${supaErr?.message || supaErr}` },
          { status: 500 }
        );
      }
    }

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
