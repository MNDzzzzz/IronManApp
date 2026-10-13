// ====================================================================
// ENDPOINT: /api/checkins
// POST: Registrar un check-in de entrenamiento (running, fuerza o híbrido)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  registerWorkoutCheckIn,
  MASTER_ATHLETE_ID,
  getUserProfile,
  upsertUserProfile,
} from '@/lib/socialManager';
import { CheckInActivityType } from '@/types/social';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getAuthAthlete } from '@/lib/auth/getAuthAthlete';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userProfile,
      activityType,
      title,
      metrics,
      stravaActivityId,
      gymWorkoutDate,
      hasPhoto,
      photoUrl,
      isGoldCheckin,
      geminiDetectedEquipment,
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'El título del check-in es requerido' },
        { status: 400 }
      );
    }

    const validActivityTypes: CheckInActivityType[] = ['running', 'strength', 'hybrid', 'rest_day'];
    const resolvedType = validActivityTypes.includes(activityType) ? activityType : 'strength';

    const { athleteId: authAthleteId } = getAuthAthlete(request);
    const athleteId = authAthleteId || userId || (userProfile?.id);

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para registrar un check-in' },
        { status: 401 }
      );
    }

    // Si viene perfil completo, asegurar en memoria
    if (userProfile && userProfile.id) {
      upsertUserProfile(userProfile);
    }

    const checkin = registerWorkoutCheckIn({
      userId: athleteId,
      activityType: resolvedType,
      title: title.trim(),
      metrics: metrics || {},
      stravaActivityId,
      gymWorkoutDate,
      hasPhoto: Boolean(hasPhoto),
      photoUrl,
      isGoldCheckin: Boolean(isGoldCheckin),
      geminiDetectedEquipment,
    });

    // Si Supabase está configurado, persistir en checkins
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        // Asegurar que el usuario exista en profiles y actualizar su XP acumulado
        const inMemoryProf = getUserProfile(checkin.user_id);
        const profileToUpsert = inMemoryProf || userProfile;
        if (profileToUpsert) {
          let effectiveXp = inMemoryProf?.total_xp || (profileToUpsert.total_xp || 0);
          const { data: dbUser } = await supabaseAdmin
            .from('profiles')
            .select('total_xp, current_streak_days, best_streak_days')
            .eq('id', profileToUpsert.id)
            .maybeSingle();

          if (dbUser) {
            effectiveXp = Math.max(effectiveXp, (dbUser.total_xp || 0) + checkin.xp_awarded);
          } else if (effectiveXp === 0) {
            effectiveXp = checkin.xp_awarded;
          }

          const effectiveLevel = Math.floor(effectiveXp / 100) + 1;
          const currentStreak = Math.max(inMemoryProf?.current_streak_days || 0, (dbUser?.current_streak_days || 0) + 1);
          const bestStreak = Math.max(inMemoryProf?.best_streak_days || 0, dbUser?.best_streak_days || 0, currentStreak);

          await supabaseAdmin.from('profiles').upsert({
            id: profileToUpsert.id,
            username: profileToUpsert.username,
            display_name: profileToUpsert.display_name,
            avatar_url: profileToUpsert.avatar_url || null,
            bio: profileToUpsert.bio || null,
            email: profileToUpsert.email || null,
            target_race_name: profileToUpsert.target_race_name || 'Media Maratón 21K 2027',
            target_race_date: profileToUpsert.target_race_date || '2027-02-28',
            weekly_workout_goal: profileToUpsert.weekly_workout_goal || 5,
            total_xp: effectiveXp,
            current_level: effectiveLevel,
            current_streak_days: currentStreak,
            best_streak_days: bestStreak,
          }, { onConflict: 'id' });
        } else {
          const { data: dbProf } = await supabaseAdmin.from('profiles').select('id').eq('id', checkin.user_id).maybeSingle();
          if (!dbProf) {
            const uniqueSuffix = `${Date.now().toString().slice(-4)}_${Math.random().toString(36).substring(2, 5)}`;
            await supabaseAdmin.from('profiles').insert({
              id: checkin.user_id,
              username: `atleta_${uniqueSuffix}`,
              display_name: 'Atleta IronMan',
            });
          }
        }

        const safeStravaId = checkin.strava_activity_id ? Number(checkin.strava_activity_id) || null : null;

        const { error: cErr } = await supabaseAdmin.from('checkins').insert({
          id: checkin.id,
          user_id: checkin.user_id,
          date: checkin.date,
          activity_type: checkin.activity_type,
          strava_activity_id: safeStravaId,
          gym_workout_date: checkin.gym_workout_date || null,
          title: checkin.title,
          metrics_summary: checkin.metrics_summary,
          has_photo: checkin.has_photo,
          photo_url: checkin.photo_url || null,
          is_gold_checkin: checkin.is_gold_checkin,
          gemini_verification_status: checkin.gemini_verification_status,
          gemini_detected_equipment: checkin.gemini_detected_equipment || null,
          xp_awarded: checkin.xp_awarded,
          created_at: checkin.created_at,
        });

        if (cErr) {
          console.error('Error insertando checkin en Supabase:', cErr);
          return NextResponse.json(
            { success: false, error: `Error persistiendo checkin en Supabase: ${cErr.message}` },
            { status: 500 }
          );
        }
      } catch (supaErr: any) {
        console.error('Excepción persistiendo checkin en Supabase:', supaErr);
        return NextResponse.json(
          { success: false, error: `Fallo en base de datos: ${supaErr?.message || supaErr}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: checkin,
        message: checkin.is_gold_checkin
          ? `¡Check-in de Oro verificado! (+${checkin.xp_awarded} XP)`
          : `¡Entreno verificado y racha incrementada! (+${checkin.xp_awarded} XP)`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar check-in';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
