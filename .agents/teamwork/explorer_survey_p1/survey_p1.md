# Survey & Architectural Investigation: Feature P1.1 (Sistema Graduado de Molestias y Adaptación Proporcional)

**Fecha**: 2026-10-07T22:20:00Z  
**Autor**: Discomfort System Explorer  
**Área de Trabajo**: `c:\Users\alvar\Desktop\Projects\IronManApp\.agents\teamwork\explorer_survey_p1`  
**Objetivo**: Analizar la implementación actual y plan de integración del Sistema Graduado de Molestias (6 niveles: 1 Muy Leve, 2 Leve, 3 Media, 4 Media-Alta, 5 Alta, 6 Lesión), su triage conversacional en el bot (`coachCore.ts`), la visualización en la interfaz (`TodayView` y `DynamicIslandCoach`), los modelos de datos y la suite de pruebas.

---

## 1. Resumen Ejecutivo del Estado Actual

| Componente / Archivo | Estado Actual | Diagnóstico y Hallazgo |
|---|---|---|
| `src/lib/discomfortManager.ts` | **Creado & 100% Testeado** | Implementa `DiscomfortLevel` (1 a 6), `DiscomfortReport`, `AdaptationStrategy`, `DiscomfortManager.evaluate()` y `DiscomfortManager.triageMessage()`. Pasa los 8 tests de `tests/discomfort-adaptation.test.ts`. |
| `tests/discomfort-adaptation.test.ts` | **Verde (8/8 tests pass)** | Cubre los 6 niveles, inmutabilidad de `WEEKLY_ROUTINE` y triage por lenguaje natural. |
| `src/lib/coach/coachCore.ts` | **Pendiente de Integración** | Actualmente no importa ni utiliza `DiscomfortManager`. En `tryDeterministicBypass`, las consultas de molestias se derivan a Gemini o retornan null. Falta la acción `'discomfort_report'` en `executeCoachTurn`. |
| `src/lib/coachCore.ts` (raíz de `lib`) | **Inexistente** | El archivo real reside en `src/lib/coach/coachCore.ts`. Se requiere crear un archivo proxy/re-export en `src/lib/coachCore.ts` para evitar fallos de importación según las especificaciones del proyecto. |
| `src/components/dashboard/DynamicIslandCoach.tsx` | **Básico (Sin soporte de niveles)** | Solo muestra un mensaje de texto plano, subtítulo y estado genérico ('info' \| 'success' \| 'warning'). No renderiza niveles 1-6, alertas clínicas ni badges de adaptación. |
| `src/components/dashboard/TodayView.tsx` | **Sin Logger de Molestias** | Muestra el hero del día y las tarjetas de nutrición/pasos, pero carece de un acceso visual rápido para registrar molestias o visualizar la adaptación activa en la rutina. |
| `src/types/database.ts` & `src/lib/mockStore.ts` | **Falta Colección** | No incluye `discomfortReports` ni `activeDiscomfort` en el store en memoria global ni en los tipos de base de datos. |

---

## 2. Análisis Detallado del Motor `DiscomfortManager`

El archivo `src/lib/discomfortManager.ts` define la escala graduada de 6 niveles con adaptaciones biomecánicas, de entrenamiento y de nutrición proporcionales:

```typescript
export enum DiscomfortLevel {
  VERY_LIGHT = 1,    // 1: Muy leve (cede en caliente, calentamiento extra, 100% volumen)
  LIGHT = 2,         // 2: Leve (perceptible, reducción ligera 15-20% volumen, CaCo suave)
  MODERATE = 3,      // 3: Media (reducción 35%, sustitutos sin flexión profunda >90° ni impacto)
  MODERATE_HIGH = 4, // 4: Media-Alta (reducción 50-70%, sin impacto running, bici/elíptica)
  HIGH = 5,          // 5: Alta (100% descarga de la zona, +10% proteína, reposo activo)
  INJURY = 6,        // 6: Lesión (cese total de carga en zona, alerta clínica, PEACE & LOVE / RICE)
}
```

### Matriz de Adaptación Proporcional por Nivel

| Nivel | Nombre | Reducción Volumen | Reducción Intensidad | Omite Grupo Muscular | Alternativa Cardio / Ejercicio | Nutrición / Hidratación | Alerta Clínica |
|:---:|:---|:---:|:---:|:---:|:---|:---|:---:|
| **1** | **Muy Leve** | 0% | 0% | No (`false`) | Normal (sin cambios). Nota de calentamiento dinámico (+5-7 min). | +0 ml agua, macros normales. | No (`false`) |
| **2** | **Leve** | 18% (15-20%) | 10% | No (`false`) | `CACO_CONSERVATIVE` (4 min trote / 1 min andar si es rodilla). Activación isométrica Wall-sits 2x30s. | +100 ml agua, Magnesio. | No (`false`) |
| **3** | **Media** | 35% | 25% | No (`false`) | Isométricos Wall-sit 4x45s, Prensa 0-70°, Puente glúteo. Evitar flexión profunda >90°. | +250 ml agua, Omega 3 + Colágeno con Vit C. | No (`false`) |
| **4** | **Media-Alta** | 60% (50-70%) | 40% | No (`false`), pero `skipImpactRunning: true` | Prohibición estricta de impacto. Sustitución por bici estática sillín alto o elíptica. | +500 ml agua, Omega 3 + Cúrcuma + Colágeno. | No (`false`) |
| **5** | **Alta** | 100% | 80% | **Sí (`true`)** | Descanso activo de la zona. Mantener tren opuesto, core y estabilidad. | +750 ml agua, **+10% proteína (`proteinMultiplier: 1.1`)**, Omega 3 + Colágeno + Magnesio. | No (`false`) |
| **6** | **Lesión** | 100% | 100% | **Sí (`true`)** | Cese total de carga. Reposo y derivación médica/fisioterapéutica. | +1000 ml agua, soporte antiinflamatorio. | **Sí (`true`)** (Protocolo PEACE & LOVE / RICE) |

### Inmutabilidad Demostrada
En `tests/discomfort-adaptation.test.ts`:
```typescript
const frozenRoutineBefore = JSON.stringify(WEEKLY_ROUTINE);
DiscomfortManager.evaluate({ ... });
const frozenRoutineAfter = JSON.stringify(WEEKLY_ROUTINE);
assert.strictEqual(frozenRoutineBefore, frozenRoutineAfter);
```
`DiscomfortManager.evaluate()` es una función pura que no muta `WEEKLY_ROUTINE`.

### Triage de Lenguaje Natural (`DiscomfortManager.triageMessage`)
Extrae de frases en español:
1. Nivel de molestia: `nivel 1` / `muy leve`, `nivel 2` / `leve`, `nivel 3` / `media`, `nivel 4` / `media alta`, `nivel 5` / `alta` / `dolor fuerte`, `nivel 6` / `lesion` / `pinchazo agudo`.
2. Zona anatómica: `rodilla` / `rotula` / `patellar` (`rodilla_patellar`), `gemelo` / `soleo` (`gemelo_soleo`), `hombro` (`hombro`), `isquio` / `femoral` (`isquiosurales`), `cuadriceps` (`cuadriceps`), `tobillo` / `aquiles` (`tobillo_aquiles`), `espalda` / `lumbar` (`lumbar`).

---

## 3. Integración del Triage en `src/lib/coach/coachCore.ts`

### Situación Actual
En `src/lib/coach/coachCore.ts`:
1. `tryDeterministicBypass` descarta cualquier frase con palabras clave clínicas:
   ```typescript
   /\b(que|qué|como|cómo|por\s*que|por\s*qué|cuanto|cuánto|cuando|cuándo|cual|cuál|puedo|debo|recomiendas|consejo|dolor|molestia|rodilla|tendon|tendón)\b/i.test(lower)
   ```
2. La prueba `tests/performanceAndBypass.test.ts` (línea 56) exige explícitamente:
   ```typescript
   test('PERFORMANCE & BYPASS: Preguntas clínicas y dudas articulares NO hacen bypass (se derivan a IA)', async () => {
     const today = getSpainTodayStr();
     const consulta = '¿Qué me recomiendas para el dolor en la rodilla tras rodar?';
     const result = await tryDeterministicBypass(consulta, today);
     assert.strictEqual(result, null, 'Debe devolver null para que el Coach con Gemini responda');
   });
   ```
   **Regla de Oro**: Las preguntas con interrogantes (`?`, `¿`) o verbos de consulta (`recomiendas`, `consejo`) DEBEN seguir retornando `null` para no romper esta prueba existente.

### Propuesta de Integración en `coachCore.ts`
1. **Detección Determinista de Reportes Directos de Molestia**:
   En `tryDeterministicBypass` (o directamente al inicio de `executeCoachTurn`):
   - Si el texto NO contiene `?` ni `¿` ni `recomiendas`, y `DiscomfortManager.triageMessage(text)` retorna un reporte válido:
   - Generar `action: 'discomfort_report'`.
   - Evaluar la estrategia con `DiscomfortManager.evaluate(report)`.
   - Almacenar el reporte en `mockStore.discomfortReports` y `mockStore.activeDiscomfort`.
   - Si el nivel es >= 2, aplicar una sobreescritura de la rutina del día a través de `setDayRoutineOverride` en `scheduleManager`:
     - Nivel 2: marcar la sesión con nota de CaCo conservador.
     - Nivel 3: pautar ejercicios isométricos sustitutos (Wall-sits / prensa).
     - Nivel 4: suprimir carrera de impacto, pautar bici estática suave.
     - Nivel 5 y 6: pautar descanso total (`routine_key: 'rest'`) con nota clínica.
   - Si el nivel incluye ajuste hídrico (ej: +250ml o +500ml), reflejarlo en la meta del día.
   - Retornar respuesta enriquecida:
     ```typescript
     reply_text: `🩺 **Triage Articular Completado: Molestia ${nivelNombre} (Nivel ${report.level}/6)** en ${zonaNombre}.\n\n` +
                 `• **Ajuste de Carga:** Volumen ${strategy.training.volumeReductionPercent > 0 ? `-${strategy.training.volumeReductionPercent}%` : 'al 100%'}.\n` +
                 `• **Pauta Biomecánica:** ${strategy.recommendationsMarkdown}\n` +
                 `• **Nutrición & Hidratación:** +${strategy.nutrition.hydrationIncreaseMl} ml de agua hoy.`
     ```
2. **Re-export Proxy en `src/lib/coachCore.ts`**:
   Crear `src/lib/coachCore.ts`:
   ```typescript
   export * from '@/lib/coach/coachCore';
   ```
   Esto asegura compatibilidad absoluta tanto para imports `@/lib/coachCore` como `@/lib/coach/coachCore`.

---

## 4. Integración en la Interfaz: `DynamicIslandCoach` y `TodayView`

### 4.1. `src/components/dashboard/DynamicIslandCoach.tsx`
El componente debe evolucionar para actuar como el HUD clínico flotante:
- **Nuevas Props**:
  ```typescript
  interface DynamicIslandCoachProps {
    message: string;
    subtext?: string;
    statusType?: 'info' | 'success' | 'warning' | 'alert' | 'danger';
    discomfortLevel?: number | DiscomfortLevel;
    activeAdaptation?: string;
  }
  ```
- **Indicadores Visuales por Nivel**:
  - Nivel 1: Badge verde suave (`bg-emerald-500/15 text-emerald-500`) "Nivel 1 • Preventivo".
  - Nivel 2: Badge ámbar (`bg-amber-500/15 text-amber-500`) "Nivel 2 • CaCo (-18%)".
  - Nivel 3: Badge naranja (`bg-orange-500/15 text-orange-500`) "Nivel 3 • Isométricos (-35%)".
  - Nivel 4: Badge naranja intenso (`bg-orange-600/20 text-orange-600`) "Nivel 4 • Sin Impacto".
  - Nivel 5: Badge rojo (`bg-rose-500/20 text-rose-500`) "Nivel 5 • Descanso Zona".
  - Nivel 6: Badge rojo pulsante con icono de alerta (`bg-red-600/25 text-red-500 animate-pulse`) "🚨 Nivel 6 • ALERTA LESIÓN".
- **Despliegue Expandido**: Al pulsar la isla, mostrar la tarjeta con la pauta de rehabilitación (ej: protocolo PEACE & LOVE, series de Wall-sits, suplementación recomendada).

### 4.2. `src/components/dashboard/TodayView.tsx`
- **Banner de Adaptación Activa**:
  Si hay una molestia activa reportada para hoy (o `effectiveRoutine.isOverridden` por motivo articular), mostrar una tarjeta de alto impacto visual encima o debajo del Hero del Día:
  - Resumen del nivel (ej: "⚡ Rutina adaptada por Molestia Nivel 2 en Rodilla").
  - Botón para ver pauta o restablecer.
- **Acceso Rápido a Registro de Molestias**:
  Añadir un botón / widget accesible:
  - "🩺 Registrar Molestia / Estado Articular"
  - Modal o selector táctil 1-Tap con los 6 niveles y selector rápido de zona (Rodilla, Gemelo, Isquios, Hombro, etc.).
  - Al confirmar, invoca el triage o envía el mensaje al coach actualizando la vista en tiempo real sin recargar la página.

---

## 5. Modelado de Datos y Persistencia

### Tipos en `src/types/database.ts`
Re-exportar o incorporar las definiciones de `DiscomfortLevel`, `DiscomfortReport` y `AdaptationStrategy`.

### Almacén en Memoria (`src/lib/mockStore.ts`)
Añadir a la definición global de `__ironman_store`:
```typescript
discomfortReports: DiscomfortReport[];
activeDiscomfort: DiscomfortReport | null;
```
Inicializar con array vacío `discomfortReports: []` y `activeDiscomfort: null`.

### Esquema SQL de Referencia (`supabase/schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS discomfort_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'alvaro-main',
    body_part_id TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
    notes TEXT,
    reported_at TIMESTAMPTZ DEFAULT now(),
    strategy JSONB
);

CREATE INDEX IF NOT EXISTS idx_discomfort_reports_date ON discomfort_reports (reported_at DESC);
ALTER TABLE discomfort_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all_discomfort ON discomfort_reports FOR ALL USING (true);
```

---

## 6. Verificación y Resultados de Tests

1. `tests/discomfort-adaptation.test.ts`:
   - 8 tests ejecutados con `npx tsx --test tests/discomfort-adaptation.test.ts`.
   - **Resultado: 8 pasados, 0 fallados (174ms)**.
2. `tests/performanceAndBypass.test.ts`:
   - 5 tests ejecutados.
   - **Resultado: 5 pasados, 0 fallados**. Confirma que las preguntas clínicas con `?` no deben ser absorbidas por el bypass sin IA.
3. `tests/routineAndSchedule.test.ts`:
   - 5 tests ejecutados.
   - **Resultado: 5 pasados, 0 fallados**. Confirma la inmutabilidad y cálculo de microciclo de 22 semanas.
4. `npm test` global:
   - Los 23 tests de la suite original pasan en verde.
   - Los 8 tests de `discomfort-adaptation` están verdes.
   - (Nota: `gym-overload` y `nutrition-presets` están fallando actualmente únicamente porque sus respectivos módulos P1.2 y P1.3 están siendo implementados por los compañeros de equipo).
5. TypeScript Typecheck:
   - `npx tsc --noEmit` ejecuta limpio con 0 errores para los módulos existentes.

---

## 7. Plan de Acción Recomendado para Implementación

1. **Paso 1 (Compatibilidad de Rutas)**: Crear `src/lib/coachCore.ts` como re-export de `src/lib/coach/coachCore.ts`.
2. **Paso 2 (Triage en Coach)**: Integrar `DiscomfortManager.triageMessage` y `DiscomfortManager.evaluate` en `src/lib/coach/coachCore.ts`, asegurando que `clean.includes('?')` siga yendo a Gemini, pero las afirmaciones de molestia nivel 1-6 ejecuten la acción `'discomfort_report'`.
3. **Paso 3 (Persistencia MockStore)**: Extender `mockStore.ts` con `discomfortReports: []` y `activeDiscomfort: null`.
4. **Paso 4 (UI DynamicIsland)**: Enriquecer `DynamicIslandCoach.tsx` con badges visuales para los 6 niveles y alertas clínicas (PEACE & LOVE / RICE).
5. **Paso 5 (UI TodayView)**: Enriquecer `TodayView.tsx` con un selector rápido de molestias 1-Tap (niveles 1 a 6) y banner de adaptación activa.
6. **Paso 6 (Verificación)**: Ejecutar `npx tsx --test tests/discomfort-adaptation.test.ts` y verificar que los 23+ tests se mantengan en verde.
