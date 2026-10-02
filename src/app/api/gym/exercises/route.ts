// ====================================================================
// ENDPOINT: GESTIÓN MODULAR DE EJERCICIOS DE GIMNASIO: IronManApp
// Permite consultar, añadir, editar y eliminar ejercicios por día de entrenamiento
// (Día 1: Torso, Día 2: Pierna, Día 3: Full Body).
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockStore';
import { GymExercise } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Obtener lista de ejercicios (opcionalmente filtrado por day)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dayFilter = searchParams.get('day');

    let exercises = mockStore.gymExercises;

    if (isSupabaseConfigured && supabaseAdmin) {
      let query = supabaseAdmin.from('gym_exercises').select('*').order('id', { ascending: true });
      if (dayFilter) {
        query = query.ilike('day', `%${dayFilter}%`);
      }
      const { data, error } = await query;
      if (!error && data) {
        exercises = data;
      }
    } else if (dayFilter) {
      exercises = exercises.filter((e) =>
        Boolean(e.day && e.day.toLowerCase().includes(dayFilter.toLowerCase()))
      );
    }

    return NextResponse.json({
      success: true,
      exercises,
      count: exercises.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error consultando ejercicios' },
      { status: 500 }
    );
  }
}

/**
 * POST: Crear un nuevo ejercicio para un día específico
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.day) {
      return NextResponse.json(
        { success: false, error: 'Se requieren al menos el nombre del ejercicio (name) y el día asignado (day).' },
        { status: 400 }
      );
    }

    const newExercise: GymExercise = {
      id: body.id || `ex-${Date.now()}`,
      name: body.name.trim(),
      category: (body.category as any) || 'Pierna',
      is_stretch: Boolean(body.is_stretch),
      day: body.day.trim() as any,
      target_sets: Number(body.target_sets) || 3,
      target_reps: body.target_reps || '8-10 reps',
      current_weight_kg: Number(body.current_weight_kg) || 0,
      rest_time: body.rest_time || '2 min',
      notes: body.notes || '',
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('gym_exercises').insert([newExercise]);
      if (error) {
        console.warn('Aviso guardando ejercicio en Supabase:', error.message);
      }
    }

    mockStore.gymExercises.push(newExercise);

    return NextResponse.json({
      success: true,
      message: `Ejercicio "${newExercise.name}" añadido con éxito al ${newExercise.day}.`,
      exercise: newExercise,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error guardando ejercicio' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Modificar un ejercicio existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el id del ejercicio a actualizar.' },
        { status: 400 }
      );
    }

    const exId = body.id;
    const updates: Partial<GymExercise> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category.trim();
    if (body.day !== undefined) updates.day = body.day.trim();
    if (body.target_sets !== undefined) updates.target_sets = Number(body.target_sets);
    if (body.target_reps !== undefined) updates.target_reps = body.target_reps;
    if (body.current_weight_kg !== undefined) updates.current_weight_kg = Number(body.current_weight_kg);
    if (body.rest_time !== undefined) updates.rest_time = body.rest_time;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.is_stretch !== undefined) updates.is_stretch = Boolean(body.is_stretch);

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('gym_exercises')
        .update(updates)
        .eq('id', exId);
      if (error) {
        console.warn('Aviso actualizando ejercicio en Supabase:', error.message);
      }
    }

    const idx = mockStore.gymExercises.findIndex((e) => e.id === exId);
    if (idx >= 0) {
      mockStore.gymExercises[idx] = {
        ...mockStore.gymExercises[idx],
        ...updates,
      };
    }

    return NextResponse.json({
      success: true,
      message: `Ejercicio actualizado con éxito.`,
      exercise: mockStore.gymExercises.find((e) => e.id === exId),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error actualizando ejercicio' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar un ejercicio por id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el parámetro id del ejercicio.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('gym_exercises').delete().eq('id', id);
      if (error) {
        console.warn('Aviso eliminando ejercicio en Supabase:', error.message);
      }
    }

    const idx = mockStore.gymExercises.findIndex((e) => e.id === id);
    if (idx >= 0) {
      mockStore.gymExercises.splice(idx, 1);
    }

    return NextResponse.json({
      success: true,
      message: `Ejercicio eliminado con éxito.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error eliminando ejercicio' },
      { status: 500 }
    );
  }
}
