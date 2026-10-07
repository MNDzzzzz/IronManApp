# Original User Request

## Initial Request — 2026-10-07T22:10:32Z

# Teamwork Project Prompt — Implementation

Implementar las 3 funcionalidades de Prioridad 1 en IronManApp (Next.js 14, Supabase, Tailwind CSS, PWA Offline-First en c:\Users\alvar\Desktop\Projects\IronManApp):

## Requirements
1. P1.1: Sistema Graduado de Molestias y Adaptación Proporcional (6 niveles: 1 Muy Leve, 2 Leve, 3 Media, 4 Media-Alta, 5 Alta, 6 Lesión) en `src/lib/discomfortManager.ts`, con triage del bot en `coachCore.ts` y UI en `TodayView`/`DynamicIslandCoach`.
2. P1.2: Log de Entrenamiento de Fuerza a 1-Tap con Pre-llenado de Sobrecarga Progresiva (`= Serie previa`, `+2.5 kg`, `+1 rep`) y selector de RPE táctil en `GymView.tsx`.
3. P1.3: Plantillas de Comidas Frecuentes en Bloque y Modo "Día Típico Cumplido" con inserción por lotes en `NutritionView.tsx`.

## Acceptance Criteria
- Suites de tests unitarios: `tests/discomfort-adaptation.test.ts`, `tests/gym-overload.test.ts`, `tests/nutrition-presets.test.ts`.
- `npm test` al 100% (23+ tests existentes + nuevos tests verdes).
- `npx tsc --noEmit` limpio (0 errores).
- `npm run build` con código 0.
