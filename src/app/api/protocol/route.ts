// ====================================================================
// ENDPOINT: PROTOCOLO NUTRICIONAL Y REGLAS DE ATLETA
// Permite consultar y modificar peso, targets, creatina y tipo de día
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  activeProtocol,
  setDayType,
  updateWeight,
  toggleCreatine,
  DayType,
} from '@/lib/nutritionProtocol';

export async function GET() {
  return NextResponse.json({
    success: true,
    protocol: activeProtocol,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Actualizar peso
    if (body.weight_kg !== undefined) {
      updateWeight(Number(body.weight_kg));
    }

    // Actualizar tipo de día
    if (body.day_type !== undefined) {
      setDayType(body.day_type as DayType);
    }

    // Alternar creatina
    if (body.creatine_taken !== undefined) {
      toggleCreatine(Boolean(body.creatine_taken));
    }

    // Modificar targets manuales si se proporcionan
    if (body.targets) {
      activeProtocol.targets = {
        ...activeProtocol.targets,
        ...body.targets,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Protocolo nutricional actualizado con éxito',
      protocol: activeProtocol,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error actualizando protocolo' }, { status: 500 });
  }
}
