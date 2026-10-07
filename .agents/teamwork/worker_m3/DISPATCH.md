# Worker Task Assignment — Milestone 3: P1.3 Plantillas de Comidas Frecuentes y Modo "Día Típico Cumplido"

- **Working Directory**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m3`
- **Original Request**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Spec**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md`
- **Explorer Survey Report**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p3\survey_p3.md` and `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p3\handoff.md`

## Write Ownership (Exclusively Owned Files)
- `src/lib/nutritionPresets.ts`
- `src/app/api/nutrition/route.ts`
- `src/components/nutrition/NutritionView.tsx`
- `tests/nutrition-presets.test.ts`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. Create `src/lib/nutritionPresets.ts`:
   - Predefined catalogue of 8 frequent meal block templates with exact bromatological macros (Mercadona staples: Tortilla de claras + avena, Arroz con pollo + AOVE, Batido aislado + plátano, Salmón con patata al vapor, Yogur griego + nueces, etc.).
   - Generator function `generateTypicalDayMeals(dateStr)`: Generates the 4 scheduled meals for today's routine (Desayuno, Almuerzo, Merienda, Cena) from `WEEKLY_ROUTINE` or protocol defaults.
   - Batch insertion helper / validation function to ensure macro consistency and total daily calories match protocol.
2. Update backend `src/app/api/nutrition/route.ts`:
   - Extend `POST` handler to support batch insertion (detect `{ action: 'batch_insert', meals: [...] }` or array of meals).
   - Insert all meals into Supabase or `mockStore.nutritionLogs`.
   - Update and return recalculated daily totals.
3. Update UI in `src/components/nutrition/NutritionView.tsx`:
   - Add "Día Típico Cumplido" 1-tap quick action button with confirmation/success state.
   - Add Frequent Meal Templates modal or block selector so athletes can insert any frequent meal block with 1 click.
4. Create unit test suite `tests/nutrition-presets.test.ts`:
   - Test frequent meal catalogue properties, macro calculations, "Día Típico Cumplido" generator, and batch insertion logic with `node:test` and `node:assert/strict`.
5. Verification:
   - Run `npx tsx --test tests/nutrition-presets.test.ts` (100% green).
   - Run `npm test` (all tests passing).
   - Run `npx tsc --noEmit` (0 errors).

## Output
Write `handoff.md` in your working directory with build and test verification outputs.


## 2026-10-07T22:20:18Z
You are the Nutrition Presets Implementation Worker for IronManApp.
Your working directory is: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m3
Read your task assignment: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\worker_m3\DISPATCH.md
Read the original request: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project spec: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\orchestrator_1\PROJECT.md
Read the survey report: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p3\survey_p3.md and handoff: c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p3\handoff.md

Exclusively owned files:
- src/lib/nutritionPresets.ts
- src/app/api/nutrition/route.ts
- src/components/nutrition/NutritionView.tsx
- tests/nutrition-presets.test.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Feature P1.3 per DISPATCH.md. Create src/lib/nutritionPresets.ts with 8 frequent meal templates and typical day generator. Update src/app/api/nutrition/route.ts to support batch insertion. Update NutritionView.tsx with "Día Típico Cumplido" button and frequent meal block selector. Create tests/nutrition-presets.test.ts. Run tests, verify tsc, and report your results in handoff.md.
