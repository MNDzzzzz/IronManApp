// Endpoint para consultar y añadir registros de nutrición e hidratación
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { NutritionLog, WaterLog } from '@/types/database';
import { activeProtocol } from '@/lib/nutritionProtocol';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    };

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let meals: NutritionLog[] = [];
    let waterLogs: WaterLog[] = [];
    let allMeals: NutritionLog[] = [];
    let allWater: WaterLog[] = [];

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: dbAllMeals } = await supabaseAdmin
        .from('nutrition_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      const { data: dbAllWater } = await supabaseAdmin
        .from('water_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      allMeals = dbAllMeals || [];
      allWater = dbAllWater || [];
      meals = allMeals.filter((m) => m.date === date);
      waterLogs = allWater.filter((w) => w.date === date);
    } else {
      allMeals = mockStore.nutritionLogs;
      allWater = mockStore.waterLogs;
      meals = allMeals.filter((m) => m.date === date);
      waterLogs = allWater.filter((w) => w.date === date);
    }

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein = meals.reduce((sum, m) => sum + m.protein_g, 0);
    const totalCarbs = meals.reduce((sum, m) => sum + m.carbs_g, 0);
    const totalFat = meals.reduce((sum, m) => sum + m.fat_g, 0);
    const totalWaterMl = waterLogs.reduce((sum, w) => sum + w.amount_ml, 0);

    return NextResponse.json(
      {
        date,
        meals,
        water_logs: waterLogs,
        all_meals: allMeals,
        all_water: allWater,
        protocol: activeProtocol,
        totals: {
          calories: totalCalories,
          protein_g: Number(totalProtein.toFixed(1)),
          carbs_g: Number(totalCarbs.toFixed(1)),
          fat_g: Number(totalFat.toFixed(1)),
          water_ml: totalWaterMl,
        },
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const todayStr = new Date().toISOString().split('T')[0];

    // Registro de agua
    if (body.type === 'water') {
      const newWater: WaterLog = {
        id: `water-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: body.date || todayStr,
        amount_ml: Number(body.amount_ml) || 250,
      };

      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.from('water_logs').insert([newWater]);
      }
      mockStore.waterLogs.unshift(newWater);
      return NextResponse.json({ success: true, water: newWater });
    }

    // Registro de comida manual
    const newMeal: NutritionLog = {
      id: `nutri-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: body.date || todayStr,
      meal_type: body.meal_type || 'Snack',
      description: body.description || 'Comida rápida',
      calories: Number(body.calories) || 0,
      protein_g: Number(body.protein_g) || 0,
      carbs_g: Number(body.carbs_g) || 0,
      fat_g: Number(body.fat_g) || 0,
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('nutrition_logs').insert([newMeal]);
    }
    mockStore.nutritionLogs.unshift(newMeal);

    return NextResponse.json({ success: true, meal: newMeal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
