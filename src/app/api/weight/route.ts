// ====================================================================
// ENDPOINT DE PESO CORPORAL: IronManApp (/api/weight)
// Consulta y registro de pesajes diarios con persistencia y fallback
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { WeightLog } from '@/types/database';
import { activeProtocol, updateWeight } from '@/lib/nutritionProtocol';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Obtener historial de pesajes y estadísticas de evolución
 */
export async function GET() {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    };

    let logs: WeightLog[] = [];

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('weight_logs')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          logs = data;
        } else {
          // Fallback a nutrition_logs con meal_type = 'PESO_CORPORAL'
          const { data: fbData, error: fbErr } = await supabaseAdmin
            .from('nutrition_logs')
            .select('*')
            .eq('meal_type', 'PESO_CORPORAL')
            .order('date', { ascending: false });

          if (!fbErr && fbData && fbData.length > 0) {
            logs = fbData.map((fb) => ({
              id: fb.id,
              date: fb.date,
              timestamp: fb.timestamp,
              weight_kg: Number(fb.protein_g),
              notes: fb.description,
              created_at: fb.timestamp,
            }));
          } else {
            // Cargar iniciales de mockStore y persistirlos de inmediato en Supabase
            logs = mockStore.weightLogs || [];
            if (logs.length > 0) {
              const rowsToSeed = logs.map((l) => ({
                id: l.id,
                date: l.date,
                timestamp: l.timestamp,
                meal_type: 'PESO_CORPORAL',
                description: l.notes || 'Antes de cenar, después de entrenar',
                calories: 0,
                protein_g: l.weight_kg,
                carbs_g: 0,
                fat_g: 0,
              }));
              try {
                await supabaseAdmin.from('nutrition_logs').upsert(rowsToSeed, { onConflict: 'id' });
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.warn('Aviso en consulta de weight_logs:', err);
        logs = mockStore.weightLogs || [];
      }
    } else {
      logs = mockStore.weightLogs || [];
    }

    // Ordenar de más reciente a más antiguo
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Estadísticas
    const currentWeight = sortedLogs[0]?.weight_kg || activeProtocol.weightKg;
    const initialWeight = sortedLogs[sortedLogs.length - 1]?.weight_kg || 102.5;
    const totalLostKg = Number((currentWeight - initialWeight).toFixed(2));
    const allWeights = sortedLogs.map((l) => l.weight_kg);
    const minWeight = allWeights.length ? Math.min(...allWeights) : currentWeight;
    const maxWeight = allWeights.length ? Math.max(...allWeights) : currentWeight;
    const avgWeight = allWeights.length
      ? Number((allWeights.reduce((a, b) => a + b, 0) / allWeights.length).toFixed(2))
      : currentWeight;

    return NextResponse.json(
      {
        logs: sortedLogs,
        current_weight: currentWeight,
        initial_weight: initialWeight,
        total_lost_kg: totalLostKg,
        stats: {
          count: sortedLogs.length,
          min: minWeight,
          max: maxWeight,
          avg: avgWeight,
        },
        protocol: activeProtocol,
      },
      { headers: noCacheHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

/**
 * POST: Registrar o actualizar pesaje con doble seguro de persistencia
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const weightVal = parseFloat(String(body.weight_kg).replace(',', '.'));

    if (isNaN(weightVal) || weightVal < 40 || weightVal > 250) {
      return NextResponse.json(
        { error: 'Peso inválido. Debe ser un número entre 40 y 250 kg.' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = body.date || todayStr;
    const notes = body.notes || 'Antes de cenar, después de entrenar';

    const newLog: WeightLog = {
      id: `weight-${Date.now()}`,
      date: logDate,
      timestamp: body.timestamp || new Date().toISOString(),
      weight_kg: Number(weightVal.toFixed(2)),
      notes,
      created_at: new Date().toISOString(),
    };

    // 1. Guardar en mockStore
    const existingIdx = mockStore.weightLogs.findIndex((w) => w.date === logDate);
    if (existingIdx >= 0) {
      mockStore.weightLogs[existingIdx] = newLog;
    } else {
      mockStore.weightLogs.unshift(newLog);
    }

    // 2. Actualizar protocolo activo
    updateWeight(weightVal);

    // 3. Persistir en Supabase con doble seguro
    if (isSupabaseConfigured && supabaseAdmin) {
      let savedInWeightLogs = false;
      try {
        const { error: wErr } = await supabaseAdmin.from('weight_logs').upsert([newLog], { onConflict: 'id' });
        if (!wErr) savedInWeightLogs = true;
      } catch (_) {}

      // Si no existe la tabla weight_logs, persistir en nutrition_logs con meal_type = 'PESO_CORPORAL'
      if (!savedInWeightLogs) {
        try {
          const fallbackRow = {
            id: newLog.id,
            date: newLog.date,
            timestamp: newLog.timestamp,
            meal_type: 'PESO_CORPORAL',
            description: newLog.notes || 'Antes de cenar, después de entrenar',
            calories: 0,
            protein_g: newLog.weight_kg,
            carbs_g: 0,
            fat_g: 0,
          };
          await supabaseAdmin.from('nutrition_logs').upsert([fallbackRow], { onConflict: 'id' });
        } catch (dbErr) {
          console.warn('Aviso: no se pudo persistir pesaje en Supabase:', dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      log: newLog,
      current_weight: weightVal,
      protocol: activeProtocol,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Falta el id del pesaje' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('weight_logs').delete().eq('id', id);
      } catch (_) {}
      try {
        await supabaseAdmin.from('nutrition_logs').delete().eq('id', id).eq('meal_type', 'PESO_CORPORAL');
      } catch (_) {}
    }
    mockStore.weightLogs = mockStore.weightLogs.filter((w) => w.id !== id);

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

