# Worker Task Assignment — Milestone 2: P1.2 Log de Fuerza a 1-Tap con Pre-llenado de Sobrecarga Progresiva y RPE Táctil

- **Working Directory**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m2`
- **Original Request**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Spec**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md`
- **Explorer Survey Report**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p2\survey_p2.md` and `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p2\handoff.md`

## Write Ownership (Exclusively Owned Files)
- `src/lib/gymOverload.ts`
- `src/components/gym/GymView.tsx`
- `tests/gym-overload.test.ts`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. Create `src/lib/gymOverload.ts` with pure, robust, and well-typed logic:
   - `getExerciseReferenceSet(logs, exercise, todayStr)`: Resolves previous set (last set of today, or best set from previous sessions, or target from exercise definition).
   - `calculateOverloadOptions(referenceSet)`: Returns progressive overload options:
     - `= Serie previa`: same reps and weight.
     - `+2.5 kg`: same reps and weight + 2.5 kg (if bodyweight 0 kg, sets 2.5 kg added load).
     - `+1 rep`: reps + 1 and same weight.
   - `RPE_SCALE`: 8-point tactical scale `[6, 7, 7.5, 8, 8.5, 9, 9.5, 10]` with RIR badges ('4 RIR', '3 RIR', '2.5 RIR', '2 RIR', '1.5 RIR', '1 RIR', '0.5 RIR', 'Fallo').
2. Update `src/components/gym/GymView.tsx`:
   - Add 1-Tap progressive overload action buttons (`= Serie previa`, `+2.5 kg`, `+1 rep`) that instantly pre-fill weight & reps in the logging card.
   - Replace the 3-button mini RPE selector with the ergonomic tactile RPE selector bar supporting the full scale (6-10 including half points).
3. Create unit test suite `tests/gym-overload.test.ts`:
   - Comprehensive test suite covering reference set resolution, overload calculations (`= Serie previa`, `+2.5 kg`, `+1 rep`, bodyweight edge cases), and RPE scale properties using `node:test` and `node:assert/strict`.
4. Verification:
   - Run `npx tsx --test tests/gym-overload.test.ts` (100% green).
   - Run `npm test` (all tests passing).
   - Run `npx tsc --noEmit` (0 errors).

## Output
Write `handoff.md` in your working directory with build and test verification outputs.


## 2026-10-07T22:20:18Z
You are the Gym Overload Implementation Worker for IronManApp.
Your working directory is: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m2
Read your task assignment: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m2\DISPATCH.md
Read the original request: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project spec: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md
Read the survey report: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p2\survey_p2.md and handoff: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p2\handoff.md

Exclusively owned files:
- src/lib/gymOverload.ts
- src/components/gym/GymView.tsx
- tests/gym-overload.test.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Feature P1.2 per DISPATCH.md. Create src/lib/gymOverload.ts with reference set calculation, progressive overload options (= Serie previa, +2.5 kg, +1 rep), and 8-point RPE scale. Update GymView.tsx with 1-tap overload action buttons and ergonomic tactile RPE bar. Create tests/gym-overload.test.ts. Run tests, verify tsc, and report your results in handoff.md.
