# Skill Profesional: supabase-postgres-expert

## Descripción
Especialista senior en arquitectura de bases de datos PostgreSQL alojadas en Supabase (Free Tier), modelado relacional y de series temporales de alta resolución, políticas de seguridad RLS (Row Level Security) e indexación avanzada.

## Competencias Clave
1. **Modelado de Series Temporales:**
   - Estructuración de tablas para métricas de frecuencia cardíaca de alta frecuencia (`heart_rate_samples`) con marcas de tiempo normalizadas en UTC (`TIMESTAMPTZ`).
   - Índices B-Tree compuestos sobre `(timestamp DESC)` para optimizar búsquedas por rangos de tiempo e intervalos de actividades de Strava.
2. **Eficiencia en Free Tier de Supabase (Límite 500 MB):**
   - Selección estricta de tipos de datos (`INTEGER`, `SMALLINT`, `NUMERIC(4,1)` en lugar de `BIGINT` o `TEXT` innecesarios).
   - Separación entre métricas agregadas diarias (`daily_health_metrics`) y datos de alta resolución en ventanas de entreno.
3. **Seguridad y RLS:**
   - Configuración de políticas de seguridad a nivel de fila (RLS) habilitadas por defecto.
   - Acceso con Service Role Key en endpoints del servidor (API routes de Next.js) y lectura controlada.
4. **Esquema de Datos Completo:**
   - `daily_health_metrics`: Sueño, pasos, SpO2, FC reposo, calorías activas.
   - `heart_rate_samples`: Serie temporal de pulso de la Samsung Galaxy Fit3.
   - `strava_activities`: Entrenamientos con GPS, polilíneas, elevación y streams.
   - `gym_exercises` y `gym_workout_logs`: Rutinas de fuerza, ejercicios, pesos y repeticiones.
   - `nutrition_logs` y `water_logs`: Ingestas calóricas, macronutrientes e hidratación.
