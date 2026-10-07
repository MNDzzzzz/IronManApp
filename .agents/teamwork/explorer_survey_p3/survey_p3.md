# INFORME DE EXPLORACIÓN: FEATURE P1.3 & INFRAESTRUCTURA DE TESTING
**Fecha**: 2026-10-07 | **Explorador**: Teamwork Explorer (Nutrition & Infra)  
**Proyecto**: IronManApp (Next.js 14, Supabase, Tailwind CSS, TypeScript, Offline-First PWA)  
**Ruta de trabajo**: `.agents/teamwork/explorer_survey_p3/survey_p3.md`

---

## 1. RESUMEN EJECUTIVO & ESTADO BASE DEL PROYECTO

Se ha llevado a cabo una auditoría completa del entorno de compilación, ejecución de tests y arquitectura del módulo de Nutrición e Infraestructura de IronManApp.

### 1.1 Estado de Comandos Base (Línea Base 100% Limpia)
| Comando | Resultado | Métricas Clave |
|---|---|---|
| `npm test` | **EXIT 0 (PASS)** | **23 tests passing**, 0 failing, duración: ~514 ms |
| `npx tsc --noEmit` | **EXIT 0 (PASS)** | 0 errores de tipado TypeScript |
| `npm run build` | **EXIT 0 (PASS)** | Compilación Next.js 14.2.35 exitosa, 13 rutas estáticas/dinámicas generadas |

### 1.2 Infraestructura de Testing Descubierta
- **Runner**: Node.js Native Test Runner vía `tsx` (`"test": "tsx --test tests/**/*.test.ts"` en `package.json`).
- **Framework**: No se utiliza Vitest ni Jest. Se utiliza el motor nativo de Node.js: `node:test` y `node:assert/strict`.
- **Rendimiento**: Ejecución ultra-rápida en memoria (~514 ms para toda la suite), sin transpilaciones pesadas ni servidores de prueba lentos.
- **Suites de Tests Existentes (6 archivos, 23 tests)**:
  1. `tests/nutrition.test.ts` (5 tests): Pesaje y cálculo bromatológico Mercadona, despiece de audio por voz, inmutabilidad de catálogo ante menciones de aceite, desayuno con etiquetas nutricionales directas.
  2. `tests/offlineSync.test.ts` (4 tests): IndexedDB mockeada en Node, fallback SSR, caché local en 0 ms, orden FIFO de la cola de mutaciones, suscripciones de SyncManager.
  3. `tests/performanceAndBypass.test.ts` (5 tests): Búsqueda en memoria O(1) < 1ms, bypass de Gemini en comidas pesadas / agua / peso corporal, delegación a IA en preguntas clínicas.
  4. `tests/routineAndSchedule.test.ts` (5 tests): Definición de los 7 días de `WEEKLY_ROUTINE`, `getSpainDate`, `getTodayRoutine`, cuenta atrás Media Maratón, progresión CaCo.
  5. `tests/securityGuardrails.test.ts` (3 tests): Rechazo de peticiones bridge sin token, protección contra payloads de coach excesivos, límites geográficos de coordenadas meteorológicas.
  6. `tests/weather.test.ts` (1 test): `getLiveRunningWeather` y recomendación biomecánica para la rodilla.

---

## 2. ANÁLISIS DE LA ARQUITECTURA ACTUAL DE NUTRICIÓN

### 2.1 Vista Principal: `src/components/nutrition/NutritionView.tsx` (987 líneas)
- **Props actuales**:
  ```typescript
  interface NutritionViewProps {
    meals: NutritionLog[];
    waterLogs: WaterLog[];
    totals: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      water_ml: number;
    };
    onAddWater: (amountMl: number, date?: string) => Promise<void>;
    onDeleteWater?: (waterId: string) => Promise<void>;
    onAddMeal: (mealData: Partial<NutritionLog>) => Promise<void>;
    onDeleteMeal?: (mealId: string) => Promise<void>;
  }
  ```
- **Secciones visuales existentes**:
  1. **Cabecera**: Título "Dieta & Nutrición", peso del atleta (101 kg), botón de Ajustes de Protocolo (`showProtocolModal`) y botón Añadir Comida Manual (`showAddModal`).
  2. **Selector de Fecha Dinámico**: Tira deslizable de días con fecha seleccionada (`selectedDate`), badge de disciplina (`Fuerza`, `Cardio`, `Descanso/Refeed`) y punto indicador de registros existentes.
  3. **Ficha Oficial del Día (`currentRoutine`)**: Muestra estrategia nutricional del día (`nutritionStrategy.guidelines`), objetivos de Kcal, Proteína, Carbos, Agua, y un acordeón desplegable: *"Ver menú sugerido de 4 tomas"* (`showRecommendedMenu`).
     - **Observación clave**: Actualmente, las 4 tomas recomendadas (`slot: Desayuno, Almuerzo, Merienda, Cena`, `dish`, `details`) son puramente **informativas (texto plano de solo lectura)**. No disponen de ningún botón para registrar la comida de forma automática ni para registrar el día completo.
  4. **Pill de Creatina (5g)**: Alterna estado tomada/pendiente y sincroniza con `/api/protocol`.
  5. **Tarjeta de Calorías y Macronutrientes**: Barras de progreso de Proteína (meta: 202g), Carbos (meta: 230g), Grasas (meta: 75g).
  6. **Control de Agua**: Barra de hidratación (meta: 3.8L) con botones rápidos `-250 ml`, `+250 ml`, `+500 ml`, `+1.0L` y listado de tomas con eliminación.
  7. **Listado de Comidas Registradas**: Desglose de comidas filtradas para `selectedDate` con botón de eliminación (`Trash2`).
  8. **Base de Datos de Alimentos Habituales**: Acordeón informativo con los alimentos de `initialFrequentFoods`.
  9. **Modales**: Modal de Ajustes de Protocolo y Modal de Añadir Comida Manual (1 por 1).

### 2.2 Rutas y Endpoints API: `src/app/api/nutrition/route.ts` (207 líneas)
- **`GET`**: Devuelve `meals`, `water_logs`, `all_meals`, `all_water`, `protocol`, y `totals`.
- **`POST`**:
  - Si `body.type === 'water'`: maneja adición o resta de agua.
  - De lo contrario: asume un **único registro individual** (`newMeal: NutritionLog`) y lo inserta en Supabase / `mockStore.nutritionLogs`.
  - **Limitación crítica observada**: **NO existe soporte para inserción por lotes** (`batch_insert` o array de comidas). Si se intentaran insertar 4 comidas a la vez hoy, requeriría 4 llamadas HTTP secuenciales o concurrentes individuales.
- **`DELETE`**: Permite eliminar agua o comida por `id`.

### 2.3 Orquestación en Página: `src/app/page.tsx` (376 líneas)
- Almacena el estado global en cliente: `nutritionMeals`, `waterLogs`, `nutritionTotals`.
- `handleAddMeal(mealData)`: Llama a `POST /api/nutrition` con un único objeto de comida y refresca los datos con `loadAllData()`.
- Utiliza `executeOptimisticMutation` para mutaciones con persistencia local en `offlineStore` (IndexedDB) y actualización visual instantánea en 0 ms.

### 2.4 Modelos de Datos y Protocolo Nutricional
- `src/types/database.ts`:
  ```typescript
  export interface NutritionLog {
    id: string;
    timestamp: string;
    date: string;
    meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack' | 'PESO_CORPORAL';
    description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    raw_audio_transcription?: string;
  }
  ```
- `src/lib/nutritionProtocol.ts`:
  - Plan Oficial de Álvaro (101 kg, 2.400 kcal, 202g Proteína, 230g Carbohidratos, 75g Grasa, 3.8L Agua, 5g Creatina).
  - Define `scheduleTiming` con los 4 bloques principales (Desayuno, Almuerzo, Merienda, Cena).
- `src/lib/weeklyRoutine.ts`:
  - `WEEKLY_ROUTINE` define para cada día de la semana (`Lunes` a `Domingo`) un objeto `nutritionStrategy` que incluye `recommendedMeals` con 4 tomas exactas.

---

## 3. ESPECIFICACIÓN DETALLADA DE FEATURE P1.3

Feature P1.3 consta de tres pilares perfectamente articulados:
1. **Plantillas de Comidas Frecuentes en Bloque**.
2. **Modo "Día Típico Cumplido"**.
3. **Inserción por Lotes en Frontend y Backend**.

### 3.1 Pilar 1: Plantillas de Comidas Frecuentes en Bloque (Meal Block Presets)
Los atletas de fuerza y resistencia estructuran su nutrición en combinaciones fijas y predecibles ("bloques"). El sistema debe proporcionar un catálogo predefinido de bloques y permitir su inserción inmediata:

#### Catálogo Base de Plantillas de Bloque (Adaptadas al atleta Álvaro - 101 kg):
1. **Desayuno Fuerza & Energía (Base Atleta)**:
   - Tipo: `Desayuno`
   - Descripción: `3 huevos revueltos (195g) + 2 claras pasteurizadas (70g) + 70g copos de avena + 1 plátano de Canarias + café solo`
   - Macros: **580 kcal** | **38.0g P** | **60.0g C** | **21.0g G**
2. **Desayuno Rápido Tortilla & Pavo**:
   - Tipo: `Desayuno`
   - Descripción: `Tortilla francesa (2 huevos) + 50g pavo en lonchas 92% + 30g queso tierno + 2 tostadas pan integral`
   - Macros: **450 kcal** | **36.0g P** | **28.0g C** | **20.0g G**
3. **Almuerzo Atleta: Pollo, Arroz y AOVE**:
   - Tipo: `Almuerzo`
   - Descripción: `220g pechuga de pollo cocinada/plancha + 220g arroz blanco cocido + ensalada verde grande con 12g AOVE`
   - Macros: **670 kcal** | **60.0g P** | **68.0g C** | **17.0g G**
4. **Almuerzo Magro: Lomo, Patata y Verduras**:
   - Tipo: `Almuerzo`
   - Descripción: `200g lomo de cerdo cocinado + 250g patata cocida/asada + verduras al vapor + 10g AOVE`
   - Macros: **620 kcal** | **58.0g P** | **52.0g C** | **18.0g G**
5. **Merienda Pre/Post Entreno: Avena, Whey y Creatina**:
   - Tipo: `Snack` (o Merienda)
   - Descripción: `300g queso fresco batido 0% + 35g Impact Whey + 1 manzana grande + 20g nueces peladas + 5g creatina`
   - Macros: **510 kcal** | **54.0g P** | **40.0g C** | **15.0g G**
6. **Snack Rápido: Bol Avena, Leche y Whey**:
   - Tipo: `Snack`
   - Descripción: `50g copos de avena + 200ml leche desnatada + 30g proteína whey + 15g crema de cacahuete 100%`
   - Macros: **440 kcal** | **38.0g P** | **42.0g C** | **12.0g G**
7. **Cena Reparadora: Salmón, Patata y Brócoli**:
   - Tipo: `Cena`
   - Descripción: `220g salmón fresco a la plancha + 180g patata al vapor + plato de brócoli al vapor + 10g AOVE`
   - Macros: **540 kcal** | **50.0g P** | **35.0g C** | **22.0g G**
8. **Cena Ligera: Contramuslo, Calabacín y Mozzarella**:
   - Tipo: `Cena`
   - Descripción: `200g contramuslo de pollo deshuesado cocinado + 200g calabacín a la plancha + 60g mozzarella fresca + 10g AOVE`
   - Macros: **520 kcal** | **52.0g P** | **8.0g C** | **30.0g G**

### 3.2 Pilar 2: Modo "Día Típico Cumplido" (1-Tap Full Day Log)
- **Concepto**: Los días en que el atleta ha seguido estrictamente el plan nutricional estipulado para su rutina, no debe perder tiempo registrando manualmente las 4 tomas individuales.
- **Mecanismo**:
  - Al pulsar el botón **"⚡ Registrar Día Típico Cumplido"** en la fecha activa:
    1. Se consultan las 4 comidas pautadas para ese día (ya sea desde la rutina activa en `WEEKLY_ROUTINE` o desde el plan cuádruple canónico de 2.400 kcal).
    2. Se genera el lote de 4 registros:
       - `Desayuno` (~08:30)
       - `Almuerzo` (~14:00)
       - `Snack` / Merienda (~17:30)
       - `Cena` (~21:15)
    3. Si ya existen comidas en esa fecha, el sistema detecta colisión y ofrece confirmación ("Ya existen X comidas registradas hoy. ¿Añadir el día típico o sobrescribir?").
    4. Se realiza la **inserción por lotes en una sola operación atómica**.
    5. Los totales diarios saltan instantáneamente a ~2.300–2.400 kcal y ~202g de proteína, cumpliendo las metas al 100%.

### 3.3 Pilar 3: Inserción por Lotes (Batch Insertion Engine)
- **Backend (`src/app/api/nutrition/route.ts`)**:
  - Ampliación del handler `POST` para admitir payloads con `action: 'batch_insert'` o un array de comidas `meals: Partial<NutritionLog>[]`.
  - Inserción masiva en Supabase vía `supabaseAdmin.from('nutrition_logs').insert(createdMeals)`.
  - Inserción masiva en `mockStore.nutritionLogs.unshift(...createdMeals)`.
  - Retorno estructurado `{ success: true, count: number, meals: NutritionLog[] }`.
- **Frontend (`src/components/nutrition/NutritionView.tsx` & `src/app/page.tsx`)**:
  - Nuevo prop opcional: `onAddMealsBatch?: (mealsData: Partial<NutritionLog>[]) => Promise<void>`.
  - Soporte de fallback: Si `onAddMealsBatch` no se suministrase, `NutritionView` realiza un fallback seguro ejecutando `Promise.all(meals.map(m => onAddMeal(m)))`.
  - En `page.tsx`: integración de `handleAddMealsBatch` con `executeOptimisticMutation` para actualización de estado en 0 ms y encolado en IndexedDB si no hay conexión a internet (Offline-First).

---

## 4. PLAN DE ARQUITECTURA E IMPLEMENTACIÓN SUGERIDO

### 4.1 Nuevo Módulo de Dominio: `src/lib/nutritionPresets.ts`
Crear un archivo TypeScript puro con tipado estricto y sin dependencias de React:
- **Tipos**:
  ```typescript
  export interface MealBlockTemplate {
    id: string;
    name: string;
    meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
    description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    category?: 'fuerza' | 'running' | 'refeed' | 'general';
    isDefault?: boolean;
  }
  ```
- **Constantes**: `DEFAULT_MEAL_TEMPLATES` con los 8 bloques de alta densidad nutricional de Álvaro.
- **Funciones**:
  - `getDefaultMealTemplates(): MealBlockTemplate[]`
  - `getTypicalDayMeals(date: string, dayType?: DayType): Partial<NutritionLog>[]`
  - `calculateDayPlanTotals(meals: Partial<NutritionLog>[])`
  - `batchInsertMeals(meals: Partial<NutritionLog>[]): Promise<{ success: boolean; inserted: NutritionLog[] }>`

### 4.2 Actualización de `src/app/api/nutrition/route.ts`
Añadir soporte en `POST`:
```typescript
if (body.action === 'batch_insert' || Array.isArray(body.meals)) {
  const rawMeals: Partial<NutritionLog>[] = body.meals || [];
  const logDate = body.date || getSpainTodayStr();
  const createdMeals: NutritionLog[] = rawMeals.map((m, idx) => ({
    id: m.id || `nutri-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: m.timestamp || new Date().toISOString(),
    date: m.date || logDate,
    meal_type: m.meal_type || 'Snack',
    description: m.description || 'Comida en bloque',
    calories: Math.round(Number(m.calories) || 0),
    protein_g: Number((Number(m.protein_g) || 0).toFixed(1)),
    carbs_g: Number((Number(m.carbs_g) || 0).toFixed(1)),
    fat_g: Number((Number(m.fat_g) || 0).toFixed(1)),
    raw_audio_transcription: m.raw_audio_transcription,
  }));

  if (isSupabaseConfigured && supabaseAdmin && createdMeals.length > 0) {
    await supabaseAdmin.from('nutrition_logs').insert(createdMeals);
  }
  mockStore.nutritionLogs.unshift(...createdMeals);

  return NextResponse.json({
    success: true,
    action: 'batch_inserted',
    count: createdMeals.length,
    meals: createdMeals,
  });
}
```

### 4.3 Actualización de `src/components/nutrition/NutritionView.tsx`
1. Añadir prop `onAddMealsBatch?: (mealsData: Partial<NutritionLog>[]) => Promise<void>`.
2. Añadir botón / tarjeta de acción rápida **"⚡ Modo Día Típico Cumplido"** en la Ficha del Día o cabecera:
   - Botón visible con indicador de macros totales del plan (2.400 kcal, 202g Proteína).
   - Un solo toque inserta las 4 tomas del día para `selectedDate`.
   - Diálogo de confirmación accesible si ya existen comidas en la fecha seleccionada.
3. Añadir botón **"⚡ Plantillas en Bloque"** junto al botón "+ Añadir":
   - Abre un modal selector con pestañas (`Todos`, `Desayunos`, `Almuerzos`, `Meriendas`, `Cenas`).
   - Cada tarjeta muestra nombre, macros destacados en color, descripción y botón `+ Añadir a hoy`.
4. En el acordeón ya existente *"Ver menú sugerido de 4 tomas"*:
   - Añadir en cada una de las 4 tomas recomendadas un botón `[+ Registrar]` que inserta individualmente ese bloque sugerido para la fecha activa.

### 4.4 Actualización de `src/app/page.tsx`
Implementar `handleAddMealsBatch`:
```typescript
const handleAddMealsBatch = async (mealsData: Partial<NutritionLog>[]) => {
  await executeOptimisticMutation(
    '/api/nutrition',
    'POST',
    { action: 'batch_insert', meals: mealsData },
    () => {
      const optimisticMeals: NutritionLog[] = mealsData.map((m, idx) => ({
        id: `opt-nutri-${Date.now()}-${idx}`,
        timestamp: m.timestamp || new Date().toISOString(),
        date: m.date || new Date().toISOString().split('T')[0],
        meal_type: m.meal_type || 'Snack',
        description: m.description || '',
        calories: Number(m.calories) || 0,
        protein_g: Number(m.protein_g) || 0,
        carbs_g: Number(m.carbs_g) || 0,
        fat_g: Number(m.fat_g) || 0,
      }));
      setNutritionMeals((prev) => [...optimisticMeals, ...prev]);
    }
  );
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    loadAllData();
  }
};
```

---

## 5. DISEÑO DE LA SUITE DE TESTS: `tests/nutrition-presets.test.ts`

Siguiendo el estándar del proyecto (`node:test` y `node:assert/strict` ejecutado vía `tsx --test`), el nuevo archivo de test debe validar:

1. **Catálogo Canónico de Plantillas**:
   - Existencia de plantillas preconfiguradas para los 4 slots: Desayuno, Almuerzo, Snack/Merienda y Cena.
   - Verificación de consistencia macrobiótica: Cada plantilla posee valores positivos y coherentes de Kcal, Proteínas, Carbohidratos y Grasas.
2. **Generación de "Día Típico Cumplido"**:
   - `getTypicalDayMeals(date, dayType)` genera exactamente 4 comidas con la fecha especificada.
   - La suma de calorías de las 4 comidas se sitúa en el objetivo prescrito (~2.300–2.400 kcal).
   - La suma de proteínas se sitúa en el objetivo de protección muscular y tendinosa (~195–205g).
   - Los timestamps de las 4 tomas están espaciados temporalmente (mañana, mediodía, tarde, noche).
3. **Variación según Tipo de Día (`DayType`)**:
   - Días de Fuerza vs Carrera vs Refeed: Verificación de adaptación de hidratos de carbono.
4. **Inserción por Lotes en Almacén (`batchInsertMeals` / MockStore)**:
   - Inserción correcta de un array de 4 comidas en `mockStore.nutritionLogs`.
   - Verificación de que no mutan los registros existentes y se generan identificadores únicos.
   - Cálculo correcto de los nuevos totales acumulados para el día.
5. **Gestión de Duplicados y Confirmación**:
   - Detección de colisión cuando ya existen comidas en esa fecha.
   - Capacidad de añadir suplementariamente o reemplazar el día completo.
6. **Manejo de Casos Límite (Edge Cases)**:
   - Inserción de array vacío no corrompe el almacén ni lanza excepciones.
   - Preservación de macros explícitos y descripciones detalladas.

---

## 6. CRITERIOS DE VERIFICACIÓN INDEPENDIENTE

Para dar la tarea por completada en las fases subsiguientes, el implementador deberá verificar:
1. `npm test`: Los 23 tests existentes continúan en verde + todos los tests de `tests/nutrition-presets.test.ts` en verde. Total esperado: **30+ tests passing, 0 failing**.
2. `npx tsc --noEmit`: 0 errores de TypeScript en modo estricto.
3. `npm run build`: Next.js genera las rutas estáticas y dinámicas con código de salida 0.
4. Renderizado visual en navegador: Comprobar que en la pestaña "Dieta" aparecen los nuevos controles táctiles y funcionan tanto online como offline.
