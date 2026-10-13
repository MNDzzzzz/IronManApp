// ====================================================================
// ENDPOINT DE PESO CORPORAL: IronManApp (/api/weight)
// Consulta y registro de pesajes diarios con persistencia y aislamiento multi-tenant
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { WeightLog } from '@/types/database';
import { activeProtocol, updateWeight } from '@/lib/nutritionProtocol';
import { getAuthAthlete } from '@/lib/auth/getAuthAthlete';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Obtener historial de pesajes y estadísticas de evolución
 */
export async function GET(request: NextRequest) {
  try {
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    };

    const { athleteId, isAlvaro } = getAuthAthlete(request);

    // 0. Si no hay atleta identificado (visitante o anónimo), devolver conjunto vacío (Zero Data Leakage)
    if (!athleteId) {
      return NextResponse.json(
        {
          logs: [],
          current_weight: null,
          initial_weight: null,
          total_lost_kg: 0,
          stats: {
            count: 0,
            min: null,
            max: null,
            avg: null,
          },
          protocol: null,
        },
        { headers: noCacheHeaders }
      );
    }

    let logs: WeightLog[] = [];

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('weight_logs')
          .select('*')
          .order('date', { ascending: false });

        if (isAlvaro) {
          query = query.or(`user_id.eq.${athleteId},user_id.is.null`);
        } else {
          query = query.eq('user_id', athleteId);
        }

        const { data, error } = await query;

        let weightData: WeightLog[] = [];
        if (!error && data && data.length > 0) {
          weightData = data;
        }

        // Si es Álvaro, consultar también nutrition_logs para garantizar que ningún peso histórico falte
        let nutritionWeightData: WeightLog[] = [];
        if (isAlvaro) {
          const { data: fbData, error: fbErr } = await supabaseAdmin
            .from('nutrition_logs')
            .select('*')
            .eq('meal_type', 'PESO_CORPORAL')
            .order('date', { ascending: false });

          if (!fbErr && fbData && fbData.length > 0) {
            nutritionWeightData = fbData.map((fb) => ({
              id: fb.id,
              date: fb.date,
              timestamp: fb.timestamp,
              weight_kg: Number(fb.protein_g),
              notes: fb.description,
              created_at: fb.timestamp,
            }));
          }
        }

        // Combinar ambas fuentes deduplicando por fecha para un historial continuo completo
        const dateMap = new Map<string, WeightLog>();
        nutritionWeightData.forEach((item) => {
          if (item.date) dateMap.set(item.date, item);
        });
        weightData.forEach((item) => {
          if (item.date) dateMap.set(item.date, item);
        });

        logs = Array.from(dateMap.values());
        if (logs.length === 0 && isAlvaro) {
          logs = mockStore.weightLogs || [];
        }
      } catch (err) {
        console.warn('Aviso en consulta de weight_logs:', err);
        if (isAlvaro) {
          logs = mockStore.weightLogs || [];
        }
      }
    } else if (isAlvaro) {
      logs = mockStore.weightLogs || [];
    }

    // Ordenar de más reciente a más antiguo
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Estadísticas
    const currentWeight = sortedLogs[0]?.weight_kg || (isAlvaro ? activeProtocol.weightKg : null);
    const initialWeight = sortedLogs[sortedLogs.length - 1]?.weight_kg || currentWeight;
    const totalLostKg = currentWeight && initialWeight ? Number((currentWeight - initialWeight).toFixed(2)) : 0;
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
        protocol: isAlvaro ? activeProtocol : null,
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
    const { athleteId, isAlvaro } = getAuthAthlete(request);

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

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

    // 1. Guardar en mockStore si es Álvaro
    if (isAlvaro) {
      const existingIdx = mockStore.weightLogs.findIndex((w) => w.date === logDate);
      if (existingIdx >= 0) {
        mockStore.weightLogs[existingIdx] = newLog;
      } else {
        mockStore.weightLogs.unshift(newLog);
      }
      updateWeight(weightVal);
    }

    // 2. Persistir en Supabase con user_id
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('weight_logs').upsert([
          {
            ...newLog,
            user_id: athleteId || null,
          },
        ], { onConflict: 'id' });
      } catch (err) {
        console.warn('Aviso: no se pudo persistir pesaje en Supabase:', err);
      }
    }

    return NextResponse.json({
      success: true,
      log: newLog,
      current_weight: weightVal,
      protocol: isAlvaro ? activeProtocol : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { athleteId, isAlvaro } = getAuthAthlete(request);

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

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
        let delQuery = supabaseAdmin.from('weight_logs').delete().eq('id', id);
        if (!isAlvaro) {
          delQuery = delQuery.eq('user_id', athleteId);
        }
        await delQuery;
      } catch (_) {}
    }
    if (isAlvaro) {
      mockStore.weightLogs = mockStore.weightLogs.filter((w) => w.id !== id);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
