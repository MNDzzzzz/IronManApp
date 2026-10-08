// ====================================================================
// ENDPOINT: /api/checkins
// POST: Registrar un check-in de entrenamiento (running, fuerza o híbrido)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { registerWorkoutCheckIn, MASTER_ATHLETE_ID } from '@/lib/socialManager';
import { CheckInActivityType } from '@/types/social';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
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

    const checkin = registerWorkoutCheckIn({
      userId: userId || MASTER_ATHLETE_ID,
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
