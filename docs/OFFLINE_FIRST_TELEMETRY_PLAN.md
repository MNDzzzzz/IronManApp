# 📋 PLAN DE IMPLEMENTACIÓN: ARQUITECTURA OFFLINE-FIRST & TELEMETRÍA DIRECTA WEB

**Equipo Técnico (ECC):** ARCHITECT, DATABASE-OPTIMIZER, BACKEND-ARCHITECT, UX-ARCHITECT, TDD-GUIDE  
**Fecha:** 7 de Octubre de 2026  
**Documento:** `docs/OFFLINE_FIRST_TELEMETRY_PLAN.md`  
**Estado:** 🎯 PROPUESTA DE ARQUITECTURA & PLAN DE SPRINT

---

## 1. Visión y Alineación Estratégica

### 🎯 Descarte Explícito y Centralización Web
- **Descarte de Telegram:** Siguiendo la directriz del atleta (Álvaro), **no invertiremos esfuerzo en modularizar o expandir el bot de Telegram**. El objetivo estratégico es que el 100% de la experiencia (voz, báscula, entrenos, telemetría y consultas) viva dentro de **IronManApp Web**.
- **Independencia de Red:** La aplicación debe ser completamente operativa en entornos hostiles de conectividad (sótanos de gimnasio sin cobertura, zonas de carrera periféricas o pasillos de supermercados).

---

## 2. Decisiones de Arquitectura Técnica (ADR)

### ADR-001: Almacenamiento Local Híbrido & Cola de Mutaciones (Mutation Queue)
- **Motor de persistencia local:** Capa de almacenamiento en navegador basada en **IndexedDB** (`IronManOfflineDB`) mediante una utilidad ultra-ligera sin dependencias pesadas:
  - Almacén `telemetry_cache`: Copia local de última lectura de comidas, series de gimnasio, actividades de carrera, peso y biometría.
  - Almacén `mutation_queue`: Registro de acciones pendientes de sincronización con estructura:
    ```typescript
    interface OfflineMutation {
      id: string; // UUID v4
      timestamp: number;
      endpoint: string; // ej: '/api/nutrition', '/api/gym'
      method: 'POST' | 'PUT' | 'DELETE';
      payload: any;
      retryCount: number;
      status: 'pending' | 'syncing' | 'failed';
    }
    ```
- **Estrategia de Actualización Optimista (0 ms):**
  - Cualquier acción del usuario (guardar comida, serie de pesas, peso o agua) actualiza **de inmediato** el estado de React y la base local en IndexedDB.
  - Se añade la tarea a `mutation_queue`.
  - Si hay conexión activa (`navigator.onLine === true`), se procesa la cola de inmediato en segundo plano. Si no, se procesa automáticamente al dispararse el evento `window.addEventListener('online')`.

### ADR-002: Ingesta Directa de Telemetría Strava & Sensores en la App Web
- **Problema actual:** Para analizar fotos de parciales (splits) o actividades de Strava se recurría a Telegram.
- **Solución Web Directa:**
  - Añadir en `AdaptiveWorkoutView` y `TodayView` un selector de archivo/cámara: **"Subir Captura de Strava / GPX"**.
  - La app envía la imagen directamente a `/api/activities/strava-upload` con el motor Gemini Vision ya optimizado (`gemini-2.0-flash`).
  - Los parciales km a km, cadencia y ritmo se incorporan al historial de carrera de Álvaro sin salir de la web.

---

## 3. Desglose de Fases y Asignación de Agentes ECC

```mermaid
flowchart TD
    subgraph Fase 1: Motor Local
        A1[DATABASE-OPTIMIZER: Crear IronManOfflineStore en IndexedDB] --> A2[ARCHITECT: Diseñar SyncMutationQueue con reintentos]
    end

    subgraph Fase 2: Integración Frontend
        B1[FRONTEND-DEVELOPER: Hook useOfflineSync y mutaciones optimistas] --> B2[UX-ARCHITECT: Indicador Liquid Glass de estado Online/Offline/Sync]
    end

    subgraph Fase 3: Ingesta Directa Telemetría
        C1[BACKEND-ARCHITECT: Endpoint /api/activities/strava-upload] --> C2[PRODUCT-LENS: Botón y flujo de subida directa en la Web]
    end

    subgraph Fase 4: Calidad y Despliegue
        D1[TDD-GUIDE: Tests unitarios de cola offline y resolución de conflictos] --> D2[CODE-REVIEWER: Auditoría de seguridad y Clean Code]
    end

    Fase 1 --> Fase 2
    Fase 2 --> Fase 3
    Fase 3 --> Fase 4
```

### 📌 FASE 1: Motor de Persistencia Local & Cola de Sincronización
*Agentes responsables:* `DATABASE-OPTIMIZER` & `ARCHITECT`
1. Crear `src/lib/offline/offlineStore.ts`:
   - Inicialización y versionado seguro de IndexedDB (`IronManOfflineDB`).
   - Métodos CRUD tipados: `saveLocalRecord`, `getLocalRecords`, `enqueueMutation`, `getPendingMutations`, `markMutationComplete`.
2. Crear `src/lib/offline/syncManager.ts`:
   - Gestor singleton de sincronización en segundo plano.
   - Manejo de reintentos exponenciales con límite de fallo y resolución de conflictos *Last-Write-Wins* con Supabase.

### 📌 FASE 2: Hooks de React & Actualización Optimista
*Agentes responsables:* `FRONTEND-DEVELOPER` & `BACKEND-ARCHITECT`
1. Crear `src/lib/offline/useOfflineSync.ts`:
   - Hook que monitoriza el estado de red (`isOnline`) y el número de mutaciones pendientes en la cola (`pendingCount`).
   - Función `mutateWithOfflineFallback(endpoint, method, payload, optimisticUpdateCallback)`.
2. Conectar las mutaciones clave de la aplicación:
   - Registro de alimentos en `NutritionView`.
   - Registro de series y RPE en `GymView`.
   - Registro de agua y peso en `TodayView`.

### 📌 FASE 3: Componente Visual Liquid Glass de Conectividad
*Agente responsable:* `UX-ARCHITECT`
1. Crear `src/components/common/SyncStatusPill.tsx`:
   - Píldora ultra-minimalista Liquid Glass en la cabecera `TopBar`:
     - 🟢 **Conectado:** Píldora oculta o punto verde tenue.
     - 🟡 **Sincronizando:** Animación de giro sutil con número de cambios (*"Sincronizando 2 datos..."*).
     - ⚪ **Sin conexión:** *"Modo Sin Conexión (Guardando localmente)"*.

### 📌 FASE 4: Ingesta Directa de Strava en la App Web
*Agente responsable:* `BACKEND-ARCHITECT` & `PRODUCT-LENS`
1. Crear endpoint `/api/activities/strava-upload`:
   - Recibe la imagen de la captura de Strava enviada desde la interfaz web (cámara o galería del móvil).
   - Analiza con `gemini-2.0-flash` y devuelve los datos estructurados para guardarlos de inmediato en Supabase y la base local.
2. Integrar botón en `AdaptiveWorkoutView` y `TodayView`:
   - *"Importar Carrera Strava"* con previsualización de splits y análisis del Coach.

### 📌 FASE 5: Pruebas Automatizadas & Verificación Implacable
*Agentes responsables:* `TDD-GUIDE` & `CODE-REVIEWER`
1. Crear `tests/offlineSync.test.ts`:
   - Simulación de peticiones fallidas y verificación de encolado correcto en la base local.
   - Verificación de que las mutaciones no pierden datos bromatológicos ni series de gimnasio.
2. Comprobar que los 18 tests actuales de `npm test` continúen en verde (0 regresiones).
3. Compilación limpia `npm run build`.

---

## 4. Criterios de Aceptación (Definition of Done)

1. **Test del Modo Avión:** Si el usuario activa el modo avión en el móvil y registra 200g de pollo, 3 series de press militar y 100.2 kg de peso:
   - La pantalla muestra los datos actualizados de inmediato sin ningún error en rojo.
   - Al desactivar el modo avión, la píldora indica sincronización y los datos quedan grabados en Supabase en menos de 2 segundos.
2. **Strava Web Direct:** Álvaro puede subir una captura de Strava desde la app web y obtener sus parciales y valoración para la rodilla en menos de 2.5 segundos sin abrir Telegram.
3. **Cero regresiones:** `npm test` al 100% y `npm run build` con código 0.
