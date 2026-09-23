# Skill Profesional: strava-healthconnect-integrator

## Descripción
Especialista senior en desarrollo backend con Next.js (App Router), diseño e implementación de APIs seguras, consumo de Webhooks externos (Strava API v3), ingesta de datos móviles desde Health Connect (Android SDK) y algoritmos de sincronización y cruce temporal de series de datos.

## Competencias Clave
1. **Webhooks de Strava (OAuth 2.0 y Callback Subscription):**
   - Implementación del handshake de verificación GET `hub.challenge` con respuesta en < 2 segundos.
   - Procesamiento asíncrono de eventos POST (`aspect_type: "create"`, `object_type: "activity"`).
   - Consulta a la API de Strava para descarga de streams de actividad (`time`, `distance`, `latlng`, `altitude`, `velocity_smooth`).
2. **Recepción desde Android Puente (Health Connect):**
   - Endpoint protegido `/api/bridge/sync` validando cabecera `x-bridge-token`.
   - Parsing, validación y sanitización de cargas útiles JSON (muestras de pulso, fases de sueño, SpO2 y métricas diarias).
   - Inserción en bloque (*batch upsert*) en Supabase para maximizar rendimiento.
3. **Algoritmo de Cruce y Fusión Temporal (Data Merging):**
   - Detección de la ventana temporal de la actividad de Strava `[start_date, start_date + elapsed_time]`.
   - Consulta de muestras de pulso de la Galaxy Fit3 correspondientes al intervalo.
   - Algoritmo de interpolación lineal y nearest-neighbor para asignar el pulso cardíaco exacto a cada coordenada y segundo de la ruta GPS.
   - Cálculo de zonas cardíacas (Z1 a Z5), frecuencia media, frecuencia máxima y tiempo en zona.
4. **Asistente de Nutrición por Voz (Telegram Bot API + Gemini Flash):**
   - Webhook para recibir mensajes de voz de Telegram (`/api/telegram/webhook`).
   - Descarga del archivo de audio y análisis semántico con la API de Gemini 1.5 Flash para extraer alimentos, macronutrientes (proteína, carbohidratos, grasas), calorías y agua.
   - Persistencia en Supabase y respuesta automatizada de confirmación.
