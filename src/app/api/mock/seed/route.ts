// Endpoint para reiniciar o generar datos realistas de prueba en IronManApp
import { NextResponse } from 'next/server';
import {
  mockStore,
  initialDailyMetrics,
  initialGymExercises,
  initialGymLogs,
  initialNutritionLogs,
  initialWaterLogs,
  initialWeightLogs,
  initialStravaActivities,
} from '@/lib/mockStore';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST() {
  try {
    mockStore.dailyMetrics = [...initialDailyMetrics];
    mockStore.gymExercises = [...initialGymExercises];
    mockStore.gymLogs = [...initialGymLogs];
    mockStore.nutritionLogs = [...initialNutritionLogs];
    mockStore.waterLogs = [...initialWaterLogs];
    mockStore.weightLogs = [...initialWeightLogs];
    mockStore.stravaActivities = [...initialStravaActivities];

    // Si Supabase está conectado, sembrar también las tablas de la base de datos
    if (isSupabaseConfigured && supabaseAdmin) {
      if (mockStore.gymExercises.length > 0) {
        await supabaseAdmin.from('gym_exercises').upsert(mockStore.gymExercises);
      }
      if (mockStore.gymLogs.length > 0) {
        await supabaseAdmin.from('gym_workout_logs').upsert(mockStore.gymLogs);
      }
      if (mockStore.nutritionLogs.length > 0) {
        await supabaseAdmin.from('nutrition_logs').upsert(mockStore.nutritionLogs);
      }
      if (mockStore.waterLogs.length > 0) {
        await supabaseAdmin.from('water_logs').upsert(mockStore.waterLogs);
      }
      if (mockStore.weightLogs.length > 0) {
        try {
          await supabaseAdmin.from('weight_logs').upsert(mockStore.weightLogs);
        } catch (wErr) {
          console.warn('Aviso sembrando weight_logs en Supabase:', wErr);
        }
      }
    }

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
