import { NextRequest, NextResponse } from 'next/server';
import { getLiveRunningWeather } from '@/lib/weather/weatherService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '40.4168');
    const lon = parseFloat(searchParams.get('lon') || '-3.7038');

    const weather = await getLiveRunningWeather(lat, lon);
    return NextResponse.json({ success: true, weather });
  } catch (error) {
    console.error('Error obteniendo meteorología en ruta API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo obtener la información meteorológica',
      },
      { status: 500 }
    );
  }
}
