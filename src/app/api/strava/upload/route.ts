// Alias para compatibilidad de subida de Strava: /api/strava/upload -> delega a /api/activities/strava-upload
import { NextRequest, NextResponse } from 'next/server';
import { POST as handleStravaUpload, GET as handleStravaGet } from '@/app/api/activities/strava-upload/route';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleStravaGet();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleStravaUpload(request);
}
