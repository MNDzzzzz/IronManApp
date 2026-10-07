# Handoff Report — Feature P1.1 Discomfort & Proportional Adaptation Survey

## 1. Observation
- **Archivo de pruebas P1.1**: `tests/discomfort-adaptation.test.ts` (154 líneas). Contiene 8 pruebas unitarias que especifican la firma contractual de `DiscomfortManager`, los niveles del 1 al 6 (`DiscomfortLevel.VERY_LIGHT` hasta `DiscomfortLevel.INJURY`), adaptaciones proporcionales de volumen (0% a 100%), intensidad, sustitución de ejercicios (isométricos/prensa), suspensión de impacto, pautas nutricionales (+10% proteína, hasta 1000ml de agua), inmutabilidad de `WEEKLY_ROUTINE` y triage de lenguaje natural en español (`DiscomfortManager.triageMessage`).
- **Archivo central de lógica**: `src/lib/discomfortManager.ts` (225 líneas). Implementa `DiscomfortLevel` enum, interfaces `DiscomfortReport` y `AdaptationStrategy`, método estático `DiscomfortManager.evaluate(report)` y `DiscomfortManager.triageMessage(text)`.
- **Ejecución del test unitario de P1.1**:
  - Comando: `npx tsx --test tests/discomfort-adaptation.test.ts`
  - Resultado: `ℹ tests 8, ℹ suites 1, ℹ pass 8, ℹ fail 0, ℹ duration_ms 174.7363ms`. Salida limpia con código 0.
- **Ruta del motor de Coach**: `src/lib/coach/coachCore.ts` (1041 líneas). NO existe `src/lib/coachCore.ts` directamente en la raíz de `src/lib/`. Actualmente no importa ni utiliza `DiscomfortManager`. En la función `tryDeterministicBypass` (línea 362), los textos que contienen `molestia`, `dolor` o `rodilla` retornan `null` y son derivados a Gemini.
- **Restricción de Bypass en pruebas existentes**: En `tests/performanceAndBypass.test.ts` (líneas 56-63):
  ```typescript
  test('PERFORMANCE & BYPASS: Preguntas clínicas y dudas articulares NO hacen bypass (se derivan a IA)', async () => {
    const today = getSpainTodayStr();
    const consulta = '¿Qué me recomiendas para el dolor en la rodilla tras rodar?';
    const result = await tryDeterministicBypass(consulta, today);
    assert.strictEqual(result, null, 'Debe devolver null para que el Coach con Gemini responda');
  });
  ```
  Cualquier texto que sea pregunta clínica (`?`, `¿`, `recomiendas`) debe continuar devolviendo `null`.
- **Componentes de interfaz**:
  - `src/components/dashboard/DynamicIslandCoach.tsx` (71 líneas): Renderiza únicamente un banner con `message`, `subtext` y `statusType`. Carece de visualización específica de los niveles 1 a 6 de molestias ni advertencias de alerta médica.
  - `src/components/dashboard/TodayView.tsx` (439 líneas): Conecta `DynamicIslandCoach`, `HeroVoiceButton` y `CoachChat`. No dispone de un selector o control táctil para registrar molestias del atleta ni de un banner de alerta que indique que la sesión del día fue adaptada por una molestia articular activa.
- **Modelos de datos y memoria**: `src/types/database.ts` y `src/lib/mockStore.ts` (779 líneas) no definen la colección `discomfortReports` ni `activeDiscomfort` en `mockStore`.

## 2. Logic Chain
1. A partir de la observación de `tests/discomfort-adaptation.test.ts` y `src/lib/discomfortManager.ts`, se confirma que el motor fisiológico de los 6 niveles y la lógica de triage están completamente programados y pasan los 8 tests unitarios correspondientes.
2. Dado que `src/lib/coach/coachCore.ts` no invoca `DiscomfortManager`, el bot actualmente no procesa ni registra reportes de molestias cuando el atleta le habla por voz o por chat; en su lugar, delega la frase genéricamente a Gemini o al webhook.
3. Considerando que `tests/performanceAndBypass.test.ts` requiere que preguntas clínicas con `?` devuelvan `null` en `tryDeterministicBypass`, el triage determinista de molestias en `coachCore.ts` debe activarse solo para afirmaciones estructuradas (ej: "tengo una ligera molestia nivel 2 en la rodilla derecha" sin interrogaciones), o gestionarse de forma explícita en `executeCoachTurn` mediante una acción `'discomfort_report'`.
4. Al evaluar `TodayView.tsx` y `DynamicIslandCoach.tsx`, se concluye que el usuario carece de visibilidad inmediata sobre su estado articular y de un método directo 1-Tap para registrar molestias fuera del dictado libre.
5. Por ende, para completar la funcionalidad P1.1 a nivel de producción, es necesario:
   - Crear el archivo proxy `src/lib/coachCore.ts` reexportando `src/lib/coach/coachCore.ts`.
   - Conectar el bot triage en `coachCore.ts` con `DiscomfortManager`.
   - Extender `mockStore.ts` con `discomfortReports`.
   - Adaptar `DynamicIslandCoach.tsx` para mostrar los badges de nivel 1-6 y protocolos (PEACE & LOVE / CaCo).
   - Añadir en `TodayView.tsx` un widget de registro rápido y visualización de la sesión adaptada.

## 3. Caveats
- No se han modificado archivos de código fuente de producción durante esta tarea, respetando el rol estricto de exploración solo-lectura (Read-Only).
- Las pruebas `tests/gym-overload.test.ts` y `tests/nutrition-presets.test.ts` fallan actualmente porque corresponden a las features P1.2 y P1.3 asignadas a otros flujos de trabajo; no guardan relación con la integridad del subsistema de molestias P1.1.
- Supabase cuenta con `supabase/schema.sql`, pero la persistencia en desarrollo y tests opera principalmente sobre `mockStore.ts`.

## 4. Conclusion
El motor de evaluación matemática, biomecánica y bromatológica de molestias `DiscomfortManager` en 6 niveles está completamente construido y 100% verificado por su suite de tests unitarios (`tests/discomfort-adaptation.test.ts`). La tarea inmediata para el implementador consiste en:
1. Crear `src/lib/coachCore.ts` (proxy a `src/lib/coach/coachCore.ts`).
2. Integrar el triage en `coachCore.ts` asociando la acción `'discomfort_report'` y adaptaciones de calendario vía `scheduleManager`.
3. Conectar la interfaz en `TodayView` y `DynamicIslandCoach` reflejando los niveles 1 a 6 con códigos cromáticos y protocolos de rehabilitación.
4. Extender `mockStore.ts` y `types/database.ts` con `discomfortReports`.

## 5. Verification Method
- **Ejecutar test unitario del motor de molestias**:
  ```bash
  npx tsx --test tests/discomfort-adaptation.test.ts
  ```
  Debe reportar `pass 8`, `fail 0`.
- **Verificar que no se rompen los bypasses existentes**:
  ```bash
  npx tsx --test tests/performanceAndBypass.test.ts
  ```
  Debe reportar `pass 5`, `fail 0`.
- **Verificar la inmutabilidad de rutinas**:
  ```bash
  npx tsx --test tests/routineAndSchedule.test.ts
  ```
  Debe reportar `pass 5`, `fail 0`.
- **Verificación de tipos TypeScript**:
  ```bash
  npx tsc --noEmit
  ```
