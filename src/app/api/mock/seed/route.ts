// Endpoint para reiniciar o generar datos realistas de prueba en IronManApp
import { NextResponse } from 'next/server';
import {
  mockStore,
  initialDailyMetrics,
  initialGymExercises,
  initialGymLogs,
  initialNutritionLogs,
  initialWaterLogs,
} from '@/lib/mockStore';

export async function POST() {
  try {
    mockStore.dailyMetrics = [...initialDailyMetrics];
    mockStore.gymExercises = [...initialGymExercises];
    mockStore.gymLogs = [...initialGymLogs];
    mockStore.nutritionLogs = [...initialNutritionLogs];
    mockStore.waterLogs = [...initialWaterLogs];

    return NextResponse.json({
      success: true,
      message: 'Base de datos de prueba resembrada con éxito.',
      metrics_count: mockStore.dailyMetrics.length,
      activities_count: mockStore.stravaActivities.length,
      gym_logs_count: mockStore.gymLogs.length,
      nutrition_count: mockStore.nutritionLogs.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
