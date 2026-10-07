# Worker Task Assignment — Milestone 1: P1.1 Sistema Graduado de Molestias y Adaptación Proporcional

- **Working Directory**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m1`
- **Original Request**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Spec**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md`
- **Explorer Survey Report**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p1\survey_p1.md` and `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p1\handoff.md`

## Write Ownership (Exclusively Owned Files)
- `src/lib/discomfortManager.ts`
- `src/lib/coachCore.ts` (create proxy if needed)
- `src/lib/coach/coachCore.ts`
- `src/components/dashboard/DynamicIslandCoach.tsx`
- `src/components/dashboard/TodayView.tsx`
- `tests/discomfort-adaptation.test.ts`
- `src/lib/mockStore.ts` (only add discomfort store properties if needed, no conflicts)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. Verify and ensure `src/lib/discomfortManager.ts` implements the 6 graduated levels (1 Muy Leve, 2 Leve, 3 Media, 4 Media-Alta, 5 Alta, 6 Lesión), proportional volume multiplier (0.85, 0.70, 0.50, 0.25, 0.0), intensity scaling, exercise substitutions (isometrics/press for knee), impact suspension, nutritional guidelines (+10% protein, up to +1000ml water), and natural language triage.
2. Wire bot triage in `src/lib/coach/coachCore.ts` and create proxy `src/lib/coachCore.ts`. CRITICAL: Do NOT break the clinical question bypass in `tests/performanceAndBypass.test.ts` (questions with '?' or '¿' like "¿Qué me recomiendas para el dolor en la rodilla tras rodar?" must continue to return `null` so Gemini handles clinical queries).
3. Update UI in `DynamicIslandCoach.tsx` and `TodayView.tsx`: Display discomfort level badge (1-6) when active, show adaptation notice, and provide quick discomfort reporting interaction.
4. Verify `tests/discomfort-adaptation.test.ts` passes 100% (8+ tests).
5. Verify `npm test` passes all tests.
6. Verify `npx tsc --noEmit` has 0 errors.

## Output
Write `handoff.md` in your working directory with build and test verification outputs.

## 2026-10-07T22:20:18Z
You are the Discomfort Implementation Worker for IronManApp.
Your working directory is: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m1
Read your task assignment: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m1\DISPATCH.md
Read the original request: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project spec: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md
Read the survey report: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p1\survey_p1.md and handoff: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p1\handoff.md

Exclusively owned files:
- src/lib/discomfortManager.ts
- src/lib/coachCore.ts
- src/lib/coach/coachCore.ts
- src/components/dashboard/DynamicIslandCoach.tsx
- src/components/dashboard/TodayView.tsx
- tests/discomfort-adaptation.test.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Feature P1.1 per DISPATCH.md. Wire triage in coachCore without breaking tests/performanceAndBypass.test.ts. Update TodayView and DynamicIslandCoach with 6-level badges and quick reporting. Ensure tests/discomfort-adaptation.test.ts passes at 100%. Run tests, verify tsc, and report your results in handoff.md.

