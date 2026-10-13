// ====================================================================
// ENDPOINT: /api/groups/[id]/members/[userId]
// GET: Resumen de perfil público condensado y no-intrusivo de un compañero
// REGLA DE ORO DE PRIVACIDAD: Jamás expone calorías, báscula ni datos médicos
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMemberPublicSummary } from '@/lib/socialManager';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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

    let summary = getMemberPublicSummary(userId);

    // Si no está en memoria, consultar Supabase
    if (!summary && isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: prof, error: pErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!pErr && prof) {
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: checkins } = await supabaseAdmin
            .from('checkins')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', oneWeekAgo);

          let weeklyKm = 0;
          let weeklySets = 0;
          let workoutDaysCount = 0;

          (checkins || []).forEach((c: any) => {
            const meta = c.metrics_summary || {};
            if (meta.distance_km) weeklyKm += Number(meta.distance_km) || 0;
            if (meta.volume_sets) weeklySets += Number(meta.volume_sets) || 0;
            if (c.activity_type !== 'rest_day') workoutDaysCount += 1;
          });

          const weeklyGoal = prof.weekly_workout_goal || 5;
          const weeklyAdherence = Math.min(100, Math.round((workoutDaysCount / weeklyGoal) * 100));

          summary = {
            user_id: prof.id,
            username: prof.username,
            display_name: prof.display_name,
            avatar_url: prof.avatar_url || undefined,
            bio: prof.bio || undefined,
            current_level: prof.current_level || 1,
            total_xp: prof.total_xp || 0,
            current_streak_days: prof.current_streak_days || 0,
            weekly_adherence_pct: weeklyAdherence,
            weekly_km_total: parseFloat(weeklyKm.toFixed(1)),
            weekly_strength_sets: weeklySets,
            badges_count: 0,
            badges: [],
            recent_checkins: (checkins || []).slice(0, 5).map((c: any) => ({
              id: c.id,
              date: c.date,
              activity_type: c.activity_type,
              title: c.title,
              is_gold_checkin: c.is_gold_checkin,
              photo_url: c.photo_url || undefined,
              created_at: c.created_at || new Date().toISOString(),
            })),
          };
        }
      } catch (supaErr) {
        console.warn('Error fetching member summary from Supabase:', supaErr);
      }
    }

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
