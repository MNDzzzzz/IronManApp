# Orchestration Plan — IronManApp Priority 1 Features

## Goal
Implement and verify with 100% test coverage, 0 TypeScript errors, and build code 0 the 3 Priority 1 features:
1. P1.1: Sistema Graduado de Molestias y Adaptación Proporcional (6 niveles)
2. P1.2: Log de Entrenamiento de Fuerza 1-Tap con Pre-llenado de Sobrecarga Progresiva
3. P1.3: Plantillas de Comidas Frecuentes en Bloque y Modo Día Típico Cumplido

## Phase 0: Codebase Survey
- Spawn 3 parallel Explorers:
  - Explorer 1: Survey P1.1 (Discomfort adaptation, `discomfortManager.ts`, `coachCore.ts`, `TodayView`, `DynamicIslandCoach`).
  - Explorer 2: Survey P1.2 (Gym strength logging, progressive overload calculations, `GymView.tsx`).
  - Explorer 3: Survey P1.3 (Nutrition templates, batch logging, `NutritionView.tsx`, test runner and build configuration).
- Collect reports, synthesize findings into `PROJECT.md § Feature Inventory` and Architecture.

## Phase 1: Milestone 1 — P1.1 Discomfort & Proportional Adaptation
- Worker: Implement `src/lib/discomfortManager.ts` (6 levels, proportional training volume/intensity scaling, triage logic), wire into `coachCore.ts`, add UI interactions in `TodayView` and `DynamicIslandCoach`.
- Test writer / Worker: `tests/discomfort-adaptation.test.ts`.
- Verification loop: Reviewers + Challengers + Forensic Auditor.

## Phase 2: Milestone 2 — P1.2 Gym Strength Log & Progressive Overload
- Worker: Implement 1-tap logging with previous set prefill (`= Serie previa`, `+2.5 kg`, `+1 rep`), tactile RPE selector in `GymView.tsx`.
- Test writer / Worker: `tests/gym-overload.test.ts`.
- Verification loop: Reviewers + Challengers + Forensic Auditor.

## Phase 3: Milestone 3 — P1.3 Nutrition Templates & Typical Day Mode
- Worker: Implement frequent meal block templates, "Día Típico Cumplido" batch insertion in `NutritionView.tsx`.
- Test writer / Worker: `tests/nutrition-presets.test.ts`.
- Verification loop: Reviewers + Challengers + Forensic Auditor.

## Phase 4: Final Integration & E2E / Suite Verification
- Run complete test suite (`npm test`), verify 23+ existing tests + new tests pass at 100%.
- Run `npx tsc --noEmit` to verify 0 errors.
- Run `npm run build` to verify clean production build.
- Reviewers + Challengers + Forensic Auditor final certification.
- Report complete results to parent Sentinel.
