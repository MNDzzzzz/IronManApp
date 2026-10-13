// ====================================================================
// UTILIDAD: apiClient.ts
// Cliente HTTP unificado con inyección automática de identidad de atleta
// Garantiza que ninguna petición viaje huérfana de headers en la app
// Idioma: Español (Strict TypeScript & Clean Architecture)
// ====================================================================

import { ATHLETE_STORAGE_KEY } from '@/lib/socialManager';
import { UserProfile } from '@/types/social';

/**
 * Obtiene el ID del atleta activo desde localStorage si existe en el cliente
 */
export function getActiveAthleteId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ATHLETE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: UserProfile = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene el perfil del atleta activo desde localStorage
 */
export function getActiveAthleteProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ATHLETE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Envoltorio universal de fetch que garantiza la inyección de x-athlete-id
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const athleteId = getActiveAthleteId();
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (athleteId && !headers.has('x-athlete-id')) {
    headers.set('x-athlete-id', athleteId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
