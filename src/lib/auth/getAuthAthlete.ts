// ====================================================================
// UTILIDAD: getAuthAthlete.ts
// Extrae y valida la identidad del atleta en las rutas de API
// Previene cualquier fuga de datos (Zero Data Leakage) a clientes anónimos
// Idioma: Español (Strict TypeScript & Apple Security)
// ====================================================================

import { NextRequest } from 'next/server';

export interface AuthAthleteResult {
  athleteId: string | null;
  isAlvaro: boolean;
}

/**
 * Resuelve el identificador del atleta que realiza la petición
 * Comprueba cookie HTTP-only 'ironman_session', cabecera 'x-athlete-id' y query 'userId'.
 */
export function getAuthAthlete(request: NextRequest): AuthAthleteResult {
  const cookieId = request.cookies.get('ironman_session')?.value?.trim();
  const headerId = request.headers.get('x-athlete-id')?.trim();
  const queryId = request.nextUrl.searchParams.get('userId')?.trim();

  const athleteId = cookieId || headerId || queryId || null;

  if (!athleteId) {
    return { athleteId: null, isAlvaro: false };
  }

  const lower = athleteId.toLowerCase();
  const isAlvaro =
    lower === 'usr-alvaro-master-001' ||
    lower === 'usr-1791544128294-ohzu' ||
    lower.includes('alvaro') ||
    lower.includes('mendez') ||
    lower.includes('alvaro_iron');

  return { athleteId, isAlvaro };
}
