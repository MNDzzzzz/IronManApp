# Informe de Exploración de Código: Característica P1.2 (IronManApp)
## Log de Entrenamiento de Fuerza a 1-Tap con Pre-llenado de Sobrecarga Progresiva y Selector de RPE Táctil

- **Fecha de investigación**: 2026-10-07
- **Investigador**: Gym Strength Log Explorer (`explorer_survey_p2`)
- **Objetivo**: Examinar la arquitectura actual de registro de fuerza en `IronManApp`, identificar las carencias respecto al requerimiento P1.2 y diseñar la solución técnica para el implementador.

---

## 1. Resumen Ejecutivo (Executive Summary)

El requerimiento **P1.2** exige un sistema de **registro a 1-tap** con **pre-llenado automático de sobrecarga progresiva** (`= Serie previa`, `+2.5 kg`, `+1 rep`) y un **selector de RPE táctil** ergonómico en la vista de gimnasio (`GymView.tsx`).

### Estado Actual:
1. **Ubicación de archivo**: La vista está en `src/components/gym/GymView.tsx` (730 líneas), instanciada en `src/components/workout/AdaptiveWorkoutView.tsx:100` y conectada a la página principal `src/app/page.tsx:326`.
2. **Lógica de pre-llenado existente**: En `GymView.tsx:115-148` (`preloadExerciseValues`), se busca la serie de mejor peso en sesiones pasadas o la última serie de hoy, pero **no existen botones rápidos ni atajos** para aplicar incrementos de sobrecarga progresiva (`= Serie previa`, `+2.5 kg`, `+1 rep`). El usuario debe pulsar repetidamente botones `+` o `-`.
3. **Selector de RPE actual**: En `GymView.tsx:426-444`, el selector de RPE está relegado a tres botones minúsculos (`[7, 8, 9]`) en un renglón inferior del control de repeticiones. No soporta decimales (8.5, 9.5), no cubre el rango 6-10, no tiene retroalimentación visual/táctil de RIR (repeticiones en recámara) y es muy difícil de presionar en pantalla móvil con sudor o fatiga.
4. **Infraestructura de pruebas**: El proyecto ejecuta tests con Node.js native test runner (`tsx --test tests/**/*.test.ts`). Existen 23 tests pasando al 100%. Falta implementar la suite `tests/gym-overload.test.ts`.

---

## 2. Mapa de Archivos Relevantes y Puntos de Integración

| Archivo | Rol en el Sistema | Líneas Clave | Observación |
|---|---|---|---|
| `src/components/gym/GymView.tsx` | Componente de UI principal de entrenamiento de fuerza | L37-42 (Props), L92-96 (State), L98-148 (Benchmark previo), L375-456 (Controles actuales) | Debe integrar la barra de 1-tap con pre-llenado (`= Serie previa`, `+2.5 kg`, `+1 rep`) y el selector de RPE táctil rediseñado. |
| `src/types/database.ts` | Definiciones de tipos del dominio | L83-94 (`GymExercise`), L96-106 (`GymWorkoutLog`) | `GymWorkoutLog` ya cuenta con `rpe?: number`. `GymExercise` cuenta con `target_reps?: string`, `current_weight_kg?: number`. |
| `src/lib/mockStore.ts` | Persistencia en memoria y fixtures iniciales | L21-295 (`initialGymExercises`), L297-356 (`initialGymLogs`), L745-779 (`mockStore`) | Contiene registros históricos con RPE decimal (`8.5`, `9.5`) y cargas reales que deben ser consumidos limpiamente. |
| `src/app/api/gym/route.ts` | Endpoint REST para GET, POST y DELETE de series | L57-92 (POST handler), L75-80 (actualización de `current_weight_kg`) | Valida y persiste `reps`, `weight_kg`, `rpe` tanto en Supabase como en `mockStore`. |
| `src/app/page.tsx` | Contenedor principal con mutaciones offline | L218-246 (`handleAddGymSet`), L248-254 (`handleDeleteGymSet`) | Utiliza mutaciones optimistas con `executeOptimisticMutation` hacia `/api/gym`. |
| `src/components/workout/AdaptiveWorkoutView.tsx` | Envoltorio adaptativo (Running vs Fuerza) | L11-27 (Props), L98-106 (Render de `GymView`) | Pasa las props `exercises`, `gymLogs`, `onAddSet`, `onDeleteSet` directamente. |
| `tests/gym-overload.test.ts` | **(Pendiente de creación)** Suite de tests requerida | Criterio de Aceptación | Validará la lógica pura de sobrecarga progresiva, resolución de series previas y escala RPE. |
| `src/lib/gymOverload.ts` | **(Nuevo módulo recomendado)** Lógica pura desacoplada | Nueva biblioteca | Centraliza el cálculo de referencia, sobrecarga progresiva y validaciones para garantizar 100% testabilidad sin mockear React DOM. |

---

## 3. Diagnóstico Detallado de la Situación Actual

### 3.1. Algoritmo Actual de Pre-carga en `GymView.tsx`
Actualmente, `GymView.tsx` cuenta con la función `preloadExerciseValues(exId: string)` (L115-148):
```typescript
const preloadExerciseValues = (exId: string) => {
  const prevLogs = logs
    .filter((l) => l.exercise_id === exId && l.date !== todayStr)
    .sort((a, b) => b.date.localeCompare(a.date) || b.set_number - a.set_number);

  if (prevLogs.length > 0) {
    const latestDate = prevLogs[0].date;
    const sessionSets = prevLogs.filter((l) => l.date === latestDate);
    const bestSet = [...sessionSets].sort((a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps)[0];
    if (bestSet) {
      setWeightKg(bestSet.weight_kg);
      setReps(bestSet.reps);
      if (bestSet.rpe) setRpe(bestSet.rpe);
      return;
    }
  }

  const todaySets = logs.filter((l) => l.exercise_id === exId && l.date === todayStr);
  if (todaySets.length > 0) {
    const lastToday = todaySets[todaySets.length - 1];
    setWeightKg(lastToday.weight_kg);
    setReps(lastToday.reps);
    if (lastToday.rpe) setRpe(lastToday.rpe);
    return;
  }
  // Fallback a ex.current_weight_kg...
};
```

**Problemas detectados:**
1. **Inversión de prioridad temporal**: Da preferencia a sesiones pasadas sobre las series realizadas *hoy*. Si el usuario hizo hoy la Serie 1 con 62.5 kg, al cambiar o refrescar la pre-carga busca la sesión pasada en vez de su última serie de hoy.
2. **Cero adaptabilidad de sobrecarga**: No hay forma de aplicar en un toque `= Serie previa`, `+2.5 kg`, o `+1 rep`.
3. **No existe estado desacoplado**: La lógica está embebida dentro del componente React, lo cual impide testearla limpiamente en `tests/gym-overload.test.ts` sin un entorno de renderizado DOM.

### 3.2. Controles de Entrada Numérica Actuales (L376-445)
- El usuario dispone de controles `-` y `+` para kg y reps.
- En peso hay botones auxiliares `[-5, 2.5, 5, 10]` que suman a la carga actual.
- Sin embargo, para registrar una serie completada replicando la anterior o progresando sobre ella, el usuario requiere entre 3 y 6 toques en pantalla.

### 3.3. Selector de RPE Actual (L426-444)
- Código actual:
```tsx
<div className="flex items-center justify-between mt-2 text-[9px] text-[var(--text-secondary)]">
  <span>RPE: {rpe}/10</span>
  <div className="flex gap-1">
    {[7, 8, 9].map((val) => (
      <button key={val} onClick={() => setRpe(val)}>...</button>
    ))}
  </div>
</div>
```
- Restringido exclusivamente a los enteros 7, 8 y 9.
- Ocupa un espacio residual de apenas 9px dentro de la columna de repeticiones.
- Carece de sentido táctil (botones microscópicos).
- No informa al atleta qué significa el RPE seleccionado (ej. RPE 8 = RIR 2, RPE 9 = RIR 1, RPE 10 = Fallo técnico).

---

## 4. Diseño Técnico Propuesto

Para cumplir rigurosamente con los principios de Clean Architecture y habilitar tests unitarios completos (Acceptance Criteria), se recomienda estructurar la solución en dos capas:
1. **Capa de Dominio**: `src/lib/gymOverload.ts` (lógica pura determinista, 0 dependencias DOM).
2. **Capa de Presentación**: `src/components/gym/GymView.tsx` (componente visual interactivo).

### 4.1. Módulo de Dominio: `src/lib/gymOverload.ts`

#### Tipos y Estructuras
```typescript
export interface OverloadReference {
  weight_kg: number;
  reps: number;
  rpe: number;
  source: 'today_previous_set' | 'last_session_benchmark' | 'exercise_target' | 'baseline_fallback';
  label: string; // ej: "Serie #1 realizada hoy", "Sesión anterior (2026-09-22)", "Carga base objetivo"
  isToday: boolean;
}

export type OverloadActionType = 'same' | 'weight_plus' | 'rep_plus';

export interface OverloadOption {
  action: OverloadActionType;
  label: string;          // "= Serie previa", "+2.5 kg", "+1 rep"
  weight_kg: number;
  reps: number;
  rpe: number;
  displayText: string;    // "60 kg × 8 reps", "62.5 kg × 8 reps", "60 kg × 9 reps"
  badgeText: string;      // "Repetir", "+Carga", "+Volumen"
}

export interface RpeOption {
  value: number;
  label: string;          // "6", "7", "7.5", "8", "8.5", "9", "9.5", "10"
  rirText: string;        // "RIR 4+", "RIR 3", "RIR 2-3", "RIR 2", "RIR 1-2", "RIR 1", "RIR 0.5", "Fallo"
  description: string;    // Explicación técnica para el atleta
  intensityLevel: 'easy' | 'optimal' | 'hard' | 'maximum'; // Para color y feedback táctil
}
```

#### Funciones Clave de la Biblioteca
1. `parseTargetReps(targetRepsStr?: string): number`:
   - Parsea strings como `'6-8 reps (RIR 1-2)'`, `'8-10'`, `'12-15 reps'`, `'60 seg'`, devolviendo un valor numérico seguro (ej. 8 o 10) con fallback a 8.
2. `getExerciseReferenceSet(exerciseId: string, exercise: GymExercise | undefined, logs: GymWorkoutLog[], todayDateStr: string): OverloadReference`:
   - **Regla 1 (Prioridad Hoy)**: Si existen series para este ejercicio con `date === todayDateStr`, toma la **última serie completada hoy** (mayor `set_number` o último elemento).
   - **Regla 2 (Sesión Previa)**: Si hoy no hay series registradas, filtra series con `date < todayDateStr`. Agrupa por la fecha más reciente y obtiene la mejor serie (mayor `weight_kg`, desempate por `reps`).
   - **Regla 3 (Objetivo de Ejercicio)**: Si no hay historial, toma `exercise.current_weight_kg || 0`, `reps = parseTargetReps(exercise.target_reps)`, `rpe = 8`.
   - **Regla 4 (Fallback)**: Si el ejercicio no existe en catálogo, retorna `0 kg`, `8 reps`, `rpe: 8`.
3. `calculateOverloadOptions(reference: OverloadReference): Record<OverloadActionType, OverloadOption>`:
   - **`same` (`= Serie previa`)**:
     - `weight_kg = reference.weight_kg`
     - `reps = reference.reps`
     - `rpe = reference.rpe`
   - **`weight_plus` (`+2.5 kg`)**:
     - `weight_kg = Math.round((reference.weight_kg + 2.5) * 10) / 10` (evita artefactos IEEE-754 como 62.50000000000001)
     - `reps = reference.reps`
     - `rpe = reference.rpe`
   - **`rep_plus` (`+1 rep`)**:
     - `weight_kg = reference.weight_kg`
     - `reps = reference.reps + 1`
     - `rpe = reference.rpe`
4. `RPE_SCALE: RpeOption[]`:
   - Array determinista de opciones: `[6, 7, 7.5, 8, 8.5, 9, 9.5, 10]`.
   - Asignación de clases de color Tailwind:
     - 6, 7: Emerald (controlado / RIR 3+)
     - 7.5, 8, 8.5: Azul eléctrico (rango óptimo de fuerza e hipertrofia / RIR 1-2)
     - 9, 9.5: Ámbar / Naranja (esfuerzo límite / RIR 0.5-1)
     - 10: Rojo / Carmesí (fallo concéntrico / RIR 0)

---

### 4.2. Diseño de Interfaz de Usuario en `GymView.tsx`

#### A. Barra Rápida de Sobrecarga Progresiva (1-Tap Bar)
Ubicada inmediatamente debajo del selector de ejercicio / tarjeta de especificación y antes de los controles manuales de peso y repeticiones.

**Componentes Visuales:**
1. **Cabecera contextual**: Muestra la referencia activa (ej: `Basado en: Serie #1 de hoy — 60 kg × 8 @ RPE 8` o `Sesión anterior: 22 Sept — 120 kg × 10`).
2. **Tres Botones de Sobrecarga a 1-Tap**:
   - `[ = Serie previa ]`: Icono de repetición o `=` + Carga y reps resultantes (`60 kg × 8`).
   - `[ +2.5 kg ]`: Icono de mancuerna/flecha arriba + Carga y reps (`62.5 kg × 8`).
   - `[ +1 rep ]`: Icono de adición/fuego + Carga y reps (`60 kg × 9`).
3. **Comportamiento al presionar**:
   - **1-Tap Pre-llenado**: Al pulsar cualquiera de los tres botones, actualiza instantáneamente los estados locales `setWeightKg`, `setReps` y `setRpe`, y activa un indicador visual en el botón seleccionado (`activeOverloadPreset`).
   - **Opción de Guardado Directo a 1-Tap**: Para atletas que buscan máxima velocidad, cada botón puede contar con un sub-botón de "⚡ Guardar en 1-tap" o un botón dedicado de registro rápido directo que guarda la serie con la sobrecarga seleccionada sin tocar nada más.

#### B. Selector Táctil de RPE Rediseñado (Tactile RPE Pad)
Ubicado como una sección de primera categoría en el formulario de serie (no como sub-texto en el contador de repeticiones).

**Componentes Visuales:**
1. **Encabezado interactivo**:
   - Etiqueta: `Esfuerzo Percibido (RPE)`.
   - Valor actual grande y visible: `RPE 8.5`.
   - Chip de RIR contextual: `RIR 1-2 • Cerca del fallo`.
2. **Banda de Botones Táctiles (8 posiciones)**:
   - Botones generosos de altura (40px) y espaciado táctil optimizado para dedos móviles.
   - Valores: `6`, `7`, `7.5`, `8`, `8.5`, `9`, `9.5`, `10`.
   - Retroalimentación haptic/visual: `active:scale-95`, bordes de color brillante según la zona de esfuerzo:
     - 6, 7: `border-emerald-500/40 bg-emerald-500/10 text-emerald-400`
     - 7.5, 8, 8.5: `border-blue-500/40 bg-[#2D68C4] text-white shadow-md shadow-blue-500/20`
     - 9, 9.5: `border-amber-500/40 bg-amber-500/15 text-amber-400`
     - 10: `border-rose-500/40 bg-rose-500/20 text-rose-400`
3. **Micro-explicación clínica/biomecánica**: Un texto conciso de una línea que orienta al atleta sobre la fatiga acumulada en la rodilla o sistema nervioso central (SNC).

---

## 5. Estrategia de Pruebas Unitarias (`tests/gym-overload.test.ts`)

La suite de pruebas debe ejecutarse directamente con el runner nativo de Node.js (`node:test` y `node:assert/strict`) para integrarse sin fricción en `npm test`.

### Casos de Prueba Propuestos:

| # | Caso de Prueba | Entrada | Salida Esperada |
|---|---|---|---|
| 1 | **Referencia de hoy prioritaria** | Ejercicio con 2 series previas hoy (Serie 1: 50kg×10, Serie 2: 52.5kg×8) | Retorna Serie 2 como referencia (`52.5 kg, 8 reps, isToday = true`). |
| 2 | **Referencia de sesión pasada cuando hoy no hay series** | Ejercicio sin series hoy, pero con sesiones el 2026-09-22 y 2026-09-15 | Selecciona la sesión más reciente (2026-09-22) y el benchmark más alto. |
| 3 | **Fallback a catálogo de ejercicio** | Ejercicio nuevo sin ninguna serie previa registrada | Retorna `current_weight_kg` del ejercicio, `parseTargetReps` y RPE 8. |
| 4 | **Pre-llenado: Acción `= Serie previa`** | Referencia: 80 kg × 8 reps, RPE 8.5 | Retorna `{ weight_kg: 80, reps: 8, rpe: 8.5 }`. |
| 5 | **Pre-llenado: Acción `+2.5 kg`** | Referencia: 80 kg × 8 reps, RPE 8.5 | Retorna `{ weight_kg: 82.5, reps: 8, rpe: 8.5 }` con precisión flotante limpia. |
| 6 | **Pre-llenado: Acción `+1 rep`** | Referencia: 80 kg × 8 reps, RPE 8.5 | Retorna `{ weight_kg: 80, reps: 9, rpe: 8.5 }`. |
| 7 | **Micro-carga en ejercicios de peso corporal (0 kg)** | Referencia: 0 kg (peso corporal) × 12 reps | `+2.5 kg` produce `2.5 kg × 12 reps` (lastre inicial). |
| 8 | **Parser de repeticiones de texto (`parseTargetReps`)** | Strings: `'6-8 reps'`, `'8-10 (RIR 1)'`, `'12'`, `'60 seg'` | Extrae los enteros correspondientes (6, 8, 12, 60) de forma determinista. |
| 9 | **Escala de RPE y descripciones RIR** | Valores 6 a 10 | Todos los valores de `RPE_SCALE` tienen etiquetas RIR y clasificaciones de intensidad válidas. |
| 10 | **Consistencia con `currentExerciseLogs` de hoy** | Sesión con 3 series completadas | `nextSetNumber` es 4 y la sobrecarga calcula respecto a la serie #3. |

---

## 6. Verificación de Compatibilidad y No Regresión

1. **Estado de Compilación**:
   - `npm test`: Los 23 tests existentes pasan en < 600ms.
   - `npx tsc --noEmit`: 0 errores de tipo TypeScript.
   - `npm run build`: Genera las 13 rutas estáticas/dinámicas sin errores (código de salida 0).
2. **Offline-First y Mutaciones Optimistas**:
   - El manejador `onAddSet` pasa `{ exercise_id, set_number, reps, weight_kg, rpe }` que es compatible con `executeOptimisticMutation('/api/gym', 'POST', ...)`.
   - No se requiere ningún cambio estructural en la base de datos de Supabase ni en la tabla `gym_workout_logs`, ya que los campos `reps`, `weight_kg`, y `rpe` ya están tipados en `GymWorkoutLog`.

---

## 7. Plan de Implementación Recomendado para el Agente Implementador

1. **Paso 1**: Crear `src/lib/gymOverload.ts` con la lógica de resolución de series, cálculo de sobrecarga progresiva y definiciones del selector de RPE táctil.
2. **Paso 2**: Crear la suite de pruebas unitarias `tests/gym-overload.test.ts` cubriendo los 10 casos de prueba especificados.
3. **Paso 3**: Ejecutar `npm test` para verificar que la suite pase limpiamente (23 tests existentes + nuevos tests de gym-overload verdes).
4. **Paso 4**: Integrar en `src/components/gym/GymView.tsx`:
   - Importar las funciones de `gymOverload.ts`.
   - Reemplazar la lógica manual de precarga con `getExerciseReferenceSet`.
   - Renderizar los botones rápidos de sobrecarga a 1-tap (`= Serie previa`, `+2.5 kg`, `+1 rep`).
   - Reemplazar el mini-selector de RPE por la banda táctil con rango 6-10 y badges RIR.
5. **Paso 5**: Validar con `npx tsc --noEmit` y `npm run build` para asegurar 0 regresiones.
