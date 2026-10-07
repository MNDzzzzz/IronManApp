# Project: IronManApp — Priority 1 Features Implementation

## Architecture
- **Framework**: Next.js 14 App Router (`src/app`), React 18, Tailwind CSS, Lucide React icons.
- **Data Persistence**: Offline-First via IndexedDB (`src/lib/offlineStore.ts`) + Supabase sync (`src/types/database.ts`), local mock store fallback (`src/lib/mockStore.ts`), REST API routes (`src/app/api/*`).
- **Coach / AI Engine**: Biomechanical and nutritional coach engine (`src/lib/coach/coachCore.ts`, `src/lib/discomfortManager.ts`, `src/lib/scheduleManager.ts`, `src/lib/weeklyRoutine.ts`).
- **Testing Engine**: Node.js Native Test Runner (`node:test`, `node:assert/strict`) executed via `tsx --test tests/**/*.test.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | P1.1 Discomfort Engine | 6-level graduated discomfort model (1-6) and proportional adaptation rules in `src/lib/discomfortManager.ts` | M1 | ORIGINAL_REQUEST §1, survey_p1 |
| 2 | P1.1 Coach Triage Integration | Bot triage in `src/lib/coachCore.ts` (proxy to `src/lib/coach/coachCore.ts`) handling `discomfort_report` actions and adapting workout | M1 | ORIGINAL_REQUEST §1, survey_p1 |
| 3 | P1.1 UI Discomfort Indicators | Discomfort level badge, alert, and 1-tap reporting in `DynamicIslandCoach.tsx` and `TodayView.tsx` | M1 | ORIGINAL_REQUEST §1, survey_p1 |
| 4 | P1.2 Gym Overload Math | Pure calculation functions for `= Serie previa`, `+2.5 kg`, `+1 rep` and reference set lookup in `src/lib/gymOverload.ts` | M2 | ORIGINAL_REQUEST §2, survey_p2 |
| 5 | P1.2 RPE Tactile Scale | 8-point RPE scale (6 to 10 with half-points) with RIR descriptions in `src/lib/gymOverload.ts` and UI in `GymView.tsx` | M2 | ORIGINAL_REQUEST §2, survey_p2 |
| 6 | P1.2 Gym UI 1-Tap Bar | 1-tap quick action buttons and ergonomic RPE selector bar in `src/components/gym/GymView.tsx` | M2 | ORIGINAL_REQUEST §2, survey_p2 |
| 7 | P1.3 Frequent Meal Presets | Predefined catalogue of 8 frequent meal block templates in `src/lib/nutritionPresets.ts` | M3 | ORIGINAL_REQUEST §3, survey_p3 |
| 8 | P1.3 Typical Day Block Generator | Generator for "Día Típico Cumplido" based on today's `WEEKLY_ROUTINE` recommended meals in `src/lib/nutritionPresets.ts` | M3 | ORIGINAL_REQUEST §3, survey_p3 |
| 9 | P1.3 Nutrition Batch Insert API | Batch meal insertion in `src/app/api/nutrition/route.ts` (`action: 'batch_insert'`) | M3 | ORIGINAL_REQUEST §3, survey_p3 |
| 10 | P1.3 Nutrition UI | "Día Típico Cumplido" 1-tap button and Frequent Meal Presets modal in `src/components/nutrition/NutritionView.tsx` | M3 | ORIGINAL_REQUEST §3, survey_p3 |
| 11 | Acceptance Criteria Test Suites | `tests/discomfort-adaptation.test.ts`, `tests/gym-overload.test.ts`, `tests/nutrition-presets.test.ts` passing 100% | M4 | ORIGINAL_REQUEST §Acceptance |
| 12 | Global Integrity & Build | `npm test` (all 30+ tests), `npx tsc --noEmit` (0 errors), `npm run build` (exit 0), Forensic Integrity clean | M4 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | P1.1 Discomfort & Proportional Adaptation | Complete `discomfortManager.ts`, `coachCore.ts` triage, and `TodayView`/`DynamicIslandCoach` UI | None | IN_PROGRESS (worker_m1: eba0adfe-c1d6-428a-8d25-0e8b39aea86f) |
| M2 | P1.2 Gym Strength Log & Overload | Implement `gymOverload.ts`, `tests/gym-overload.test.ts`, and `GymView.tsx` UI | None | IN_PROGRESS (worker_m2: 9766fa8f-8a3e-48ec-93f6-44e3a6ab561f) |
| M3 | P1.3 Nutrition Meal Presets & Batch Insert | Implement `nutritionPresets.ts`, batch insert in `/api/nutrition`, and `NutritionView.tsx` UI | None | IN_PROGRESS (worker_m3: 968cfeff-c39e-4169-9b78-5bf5b1f9e098) |
| M4 | Final Integration, Test Suites, & Integrity Audit | Run full test suite, tsc, build, adversarial challenge, and forensic audit | M1, M2, M3 | PLANNED |

## Interface Contracts
### P1.1 Discomfort System
- `DiscomfortLevel`: 1 (VERY_LIGHT), 2 (LIGHT), 3 (MODERATE), 4 (MODERATE_HIGH), 5 (HIGH), 6 (INJURY).
- `evaluate(report: DiscomfortReport)`: Returns `AdaptationStrategy` (volumeMultiplier, intensityLimit, substituteExercises, suspendImpact, extraProteinG, extraWaterMl, coachNotice).
- `triageMessage(text: string)`: Parses severity and location from athlete reports.
- `src/lib/coachCore.ts`: Re-exports `coachCore` and handles triage without breaking question bypass in `tests/performanceAndBypass.test.ts`.

### P1.2 Gym Overload
- `getExerciseReferenceSet(logs, exercise, todayStr)`: Returns last set of today or best set of previous session or target baseline.
- `calculateOverloadOptions(referenceSet)`: Returns `{ same: { reps, weight }, plusWeight: { reps, weight + 2.5 }, plusRep: { reps + 1, weight } }`.
- `RPE_SCALE`: `[6, 7, 7.5, 8, 8.5, 9, 9.5, 10]` with RIR badges.

### P1.3 Nutrition Presets
- `FREQUENT_MEAL_PRESETS`: Array of 8 structured meal blocks.
- `generateTypicalDayMeals(dateStr)`: Generates 4 `NutritionLog` entries matching today's `WEEKLY_ROUTINE` nutrition strategy.
- `POST /api/nutrition`: Accepts `{ action: 'batch_insert', meals: NutritionLog[] }` or `{ meals: NutritionLog[] }`.

## Code Layout
- `src/lib/discomfortManager.ts` (M1)
- `src/lib/coachCore.ts` (M1)
- `src/lib/coach/coachCore.ts` (M1)
- `src/components/dashboard/DynamicIslandCoach.tsx` (M1)
- `src/components/dashboard/TodayView.tsx` (M1)
- `src/lib/gymOverload.ts` (M2)
- `src/components/gym/GymView.tsx` (M2)
- `tests/gym-overload.test.ts` (M2)
- `src/lib/nutritionPresets.ts` (M3)
- `src/app/api/nutrition/route.ts` (M3)
- `src/components/nutrition/NutritionView.tsx` (M3)
- `tests/nutrition-presets.test.ts` (M3)
- `tests/discomfort-adaptation.test.ts` (M1/M4)
