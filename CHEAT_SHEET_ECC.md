# Cheat Sheet de Prompts ECC para el Día a Día (IronManApp)

Esta hoja de referencia contiene los **prompts optimizados para copiar y pegar** que activan los agentes, skills y protocolos de calidad del repositorio **Everything Claude Code (ECC)** (`.agents/`).

---

## 🧭 Índice Rápido

1. [Diseño y Nuevas Funcionalidades (`architect`)](#1-diseño-y-nuevas-funcionalidades-architect)
2. [Code Review y Protección del Scope (`code-reviewer`)](#2-code-review-y-protección-del-scope-code-reviewer)
3. [Optimización de Supabase y Base de Datos (`database-reviewer`)](#3-optimización-de-supabase-y-base-de-datos-database-reviewer)
4. [Latencia y Rendimiento en Tiempo Real (`performance-optimizer`)](#4-latencia-y-rendimiento-en-tiempo-real-performance-optimizer)
5. [Pruebas End-to-End de Flujos Críticos (`e2e-runner`)](#5-pruebas-end-to-end-de-flujos-críticos-e2e-runner)
6. [Accesibilidad Móvil y Manejo a Una Mano (`a11y-architect`)](#6-accesibilidad-móvil-y-manejo-a-una-mano-a11y-architect)
7. [Daily Report y Priorización de Tareas Diarias](#7-daily-report-y-priorización-de-tareas-diarias)
8. [Consejo de Sabios y Brainstorming Crítico (`council`)](#8-consejo-de-sabios-y-brainstorming-crítico-council)
9. [Puerta de Calidad antes de Producción (`verification-loop`)](#9-puerta-de-calidad-antes-de-producción-verification-loop)

---

## 1. Diseño y Nuevas Funcionalidades (`architect`)

> **Objetivo:** Evitar código improvisado ("parches") y diseñar módulos robustos antes de tocar código.

### Prompt: Diseñar una nueva función desde cero
```text
Actúa como el agente ARCHITECT de ECC.
Quiero implementar la siguiente funcionalidad en IronManApp: [DESCRIBIR FUNCIONALIDAD, ej: Pantalla principal centralizada con chat y grabación de voz nativa en el navegador].

Analiza la infraestructura actual (Next.js 14, Supabase, Tailwind, Gemini y Webhooks) y genera:
1. Contrato de datos e interfaces TypeScript necesarias.
2. Flujo de datos desde la UI hasta la base de datos (con diagrama mermaid).
3. Módulos o servicios a crear/modificar, respetando Clean Architecture.
4. Estrategia de compatibilidad hacia atrás (asegurar que el bot de Telegram siga funcionando).
5. Plan de implementación por fases ordenadas.
No escribas código todavía; preséntame primero el diseño para validarlo.
```

### Prompt: Modularizar y mejorar código existente
```text
Actúa como el agente ARCHITECT de ECC.
Revisa el módulo [RUTA DEL ARCHIVO, ej: src/app/api/telegram/webhook/route.ts o src/lib/weeklyRoutine.ts].

Identifica:
1. Puntos donde se esté acumulando demasiada responsabilidad (violaciones de Single Responsibility).
2. Oportunidades para desacoplar lógica en servicios reutilizables en src/lib/.
3. Propuesta de refactorización paso a paso para hacer el código más modular y testeable sin romper la funcionalidad actual.
```

---

## 2. Code Review y Protección del Scope (`code-reviewer`)

> **Objetivo:** Impedir cambios "random", código basura, mutaciones globales o desvíos del objetivo del atleta (101 kg hacia 85 kg | Media Maratón 28-Feb-2027).

### Prompt: Auditoría estricta contra el Scope y Arquitectura
```text
Actúa como el agente CODE-REVIEWER de ECC.
Revisa exhaustivamente los últimos cambios en [ARCHIVOS MODIFICADOS o último commit].

Evalúa con rigor implacable:
1. ALINEACIÓN CON EL SCOPE: ¿El cambio responde exactamente a las necesidades de IronManApp (nutrición exacta, microciclos de fuerza/running, salud de rodilla) o introduce complejidad innecesaria?
2. REGLA DE NO-REGRESIÓN: ¿Hay riesgo de haber roto cálculos previos (mermas cocinadas, calorías de grasas/carnes, zonas de carrera)?
3. CLEAN CODE & DRY: ¿Hay duplicación de código que deba extraerse a helpers?
4. INMUTABILIDAD: ¿Se están mutando catálogos o estados globales por referencia?
5. GESTIÓN DE ERRORES: ¿Están tipados todos los errores sin "any" injustificados?

Clasifica tus hallazgos en CRITICAL, HIGH, MEDIUM o LOW y emite tu veredicto (PASS o NEEDS WORK).
```

---

## 3. Optimización de Supabase y Base de Datos (`database-reviewer`)

> **Objetivo:** Consultas ultra-rápidas, integridad referencial y cero problemas de cuota o bloqueos.

### Prompt: Auditoría y optimización de tablas
```text
Actúa como el agente DATABASE-REVIEWER de ECC.
Analiza la estructura de nuestras tablas en Supabase (especialmente nutrition_logs, gym_workout_logs, cardio_activities y daily_health_metrics).

Revisa:
1. ÍNDICES: ¿Existen índices adecuados en columnas de filtrado frecuente (date, timestamp, meal_type, athlete_id)?
2. TIPOS DE DATOS: ¿Hay columnas de texto plano que deberían ser JSONB estructurado o ENUMs?
3. CONSULTAS: Optimiza las consultas de agregación diaria y semanal en src/lib/reports/ para evitar sobrecarga y N+1.
4. Genera los scripts SQL listos para ejecutar en el editor de Supabase si se necesitan nuevos índices o políticas RLS.
```

---

## 4. Latencia y Rendimiento en Tiempo Real (`performance-optimizer`)

> **Objetivo:** Que el bot responda en menos de 1.5s y la web cargue instantáneamente en el móvil.

### Prompt: Optimización de latencia en webhooks y UI
```text
Actúa como el agente PERFORMANCE-OPTIMIZER de ECC.
Queremos optimizar la velocidad de respuesta de [SECCIÓN, ej: Webhook de Telegram / Carga inicial del Dashboard].

Analiza y optimiza:
1. Cuellos de botella en la cascada de llamadas a Gemini (timeout, modelos prioritarios vs fallback).
2. Procesado asíncrono: qué tareas pueden responder inmediatamente al usuario y procesar la telemetría en segundo plano.
3. Bundle size y re-renders innecesarios en componentes de React/Tailwind/Recharts.
4. Caché de catálogos estáticos (Mercadona/BEDCA) para que la búsqueda sea de 0 ms.
```

---

## 5. Pruebas End-to-End de Flujos Críticos (`e2e-runner`)

> **Objetivo:** Simular la experiencia real de Álvaro registrando comidas y entrenos en la app.

### Prompt: Diseñar y ejecutar test de flujo de usuario completo
```text
Actúa como el agente E2E-RUNNER de ECC.
Diseña un test automatizado (o harness con node:test / Playwright) para validar el siguiente flujo de usuario crítico:
[DESCRIPCIÓN DEL FLUJO, ej: Álvaro graba un audio dictando su almuerzo -> El sistema transcribe -> Calcula macros exactos con Mercadona -> Guarda en Supabase -> Actualiza las barras de proteína y calorías en la pantalla].

Verifica:
1. Que los datos finales coincidan exactamente con la matemática biológica (4*P + 4*C + 9*G).
2. Que si falla la red o Gemini, el sistema proporcione feedback claro y seguro sin colgar la UI.
```

---

## 6. Accesibilidad Móvil y Manejo a Una Mano (`a11y-architect`)

> **Objetivo:** Interfaz minimalista estilo Apple/Claude, utilizable con el pulgar mientras entrenas o cocinas.

### Prompt: Auditoría de diseño ergonómico móvil a una mano
```text
Actúa como el agente A11Y-ARCHITECT de ECC.
Revisa la vista [RUTA DEL COMPONENTE, ej: src/components/Dashboard.tsx o el nuevo chat centralizado].

Audita según los estándares ergonómicos y WCAG 2.2 AAA:
1. ZONA DEL PULGAR (Thumb Zone): ¿Los botones principales (micrófono, confirmar comida, cambiar día) están situados en la parte inferior de la pantalla para alcanzarlos con una sola mano?
2. TARGETS TÁCTILES: ¿Tienen todos los elementos interactivos un tamaño mínimo de 48x48 px con padding suficiente para evitar toques falsos?
3. TIPOGRAFÍA Y CONTRASTE: ¿Es legible en exteriores a plena luz del día durante un entrenamiento?
4. FEEDBACK HÁPTICO Y VISUAL: ¿La interfaz reacciona claramente al pulsar el botón de grabación de voz?
Propón las clases de Tailwind CSS exactas para corregir cualquier defecto.
```

---

## 7. Daily Report y Priorización de Tareas Diarias

> **Objetivo:** Saber exactamente en qué enfocarse hoy sin perder tiempo decidiendo tareas.

### Prompt: Reporte de situación y roadmap del día
```text
Actúa como el agente PLANNER y REPO-SCAN de ECC.
Analiza el estado actual del repositorio, los últimos commits en main, la base de datos de Supabase y los requisitos del proyecto (IronManApp: Media Maratón 28-Feb-2027, recomposición corporal 101 kg -> 85 kg, salud de rodilla).

Genera el DAILY REPORT de hoy con esta estructura:
1. 🟢 LO QUE YA ESTÁ BLINDADO Y FUNCIONANDO: (Últimos avances completados).
2. 🟡 DEUDA TÉCNICA O RIESGOS PENDIENTES: (Puntos frágiles a vigilar).
3. 🔴 TOP 3 TAREAS PRIORITARIAS PARA HOY: (Qué debemos construir o mejorar hoy, ordenado por impacto).
4. 💡 PROPUESTA CONCRETA DE EJECUCIÓN: (El primer paso exacto con el que empezar ahora mismo).
```

---

## 8. Consejo de Sabios y Brainstorming Crítico (`council`)

> **Objetivo:** No dar por buena la primera idea. Debatir alternativas desde 4 perspectivas complementarias.

### Prompt: Someter una idea a debate crítico multidisciplinar
```text
Actúa utilizando la skill COUNCIL de ECC.
Tengo la siguiente idea para IronManApp:
"[DESCRIBE TU IDEA, ej: Eliminar Telegram por completo y hacer que la PWA sea el único punto de entrada con un widget en la pantalla de inicio del iPhone / Android]".

Convoca al Consejo de las 4 Voces:
1. LA VOZ DEL FISIOTERAPEUTA Y ENTRENADOR: ¿Esto ayuda al atleta en su recuperación articular y adherencia a la Media Maratón, o añade fricción cuando está cansado tras rodar?
2. LA VOZ DEL ARQUITECTO DE SOFTWARE: ¿Cómo impacta en la complejidad, mantenimiento y consumo de APIs? ¿Es escalable?
3. LA VOZ DEL PRODUCT DESIGNER (Apple/Minimalismo): ¿Mejora la experiencia del usuario, reduce clics y se siente fluido a una mano?
4. LA VOZ DEL ABOGADO DEL DIABLO (Escéptico): ¿Qué podría salir mal? ¿Por qué esta idea podría fracasar en el uso diario?

Sintetiza el veredicto final: RECOMENDACIÓN CLARA (Adelante / Modificar / Descartar) y la mejor alternativa viable.
```

---

## 9. Puerta de Calidad antes de Producción (`verification-loop`)

> **Objetivo:** Jamás romper producción en Vercel ni subir código que no pase el ciclo completo.

### Prompt: Ejecución del Verification Loop
```text
Ejecuta el VERIFICATION-LOOP de ECC sobre todo el proyecto:
1. npm run build
2. npx tsc --noEmit
3. npm run test
4. npm run lint
5. Revisa el git diff para asegurar que no hay archivos temporales ni claves expuestas.

Si alguna fase falla, detente inmediatamente, explica la causa raíz y aplica la solución antes de continuar. Si todo pasa, dame el visto bueno para hacer commit en español.
```

---

## 💡 Reglas Rápidas para el Flujo Diario

1. **Si vas a crear algo grande:** Lanza primero el prompt del **Consejo de Sabios (`council`)** o el de **`architect`**.
2. **Si vas a tocar números, nutrición o entrenamientos:** Exige siempre **`tdd-workflow`** (test en `tests/` primero).
3. **Antes de hacer push:** Pide siempre el **`verification-loop`** y la revisión de **`code-reviewer`**.
