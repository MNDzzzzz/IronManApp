# Skill Profesional: webhook-tester-automation

## Descripción
Especialista senior en aseguramiento de calidad (QA), automatización de pruebas y desarrollo de herramientas de simulación de cargas útiles (payloads) para arquitecturas dirigidas por eventos y webhooks en tiempo real.

## Competencias Clave
1. **Simulador de Salud Galaxy Fit3 / Health Connect:**
   - Script ejecutable (`npm run mock:fit3`) que genera datos realistas con curvas circadianas de pulso cardíaco, fases completas de sueño nocturno, registros de SpO2 y recuentos de pasos, enviándolos al endpoint `/api/bridge/sync`.
2. **Simulador de Actividades Strava:**
   - Script ejecutable (`npm run mock:strava`) que emula tanto el handshake GET de verificación (`hub.challenge`), como el evento POST de una nueva carrera real con coordenadas GPS reales (lat/lng, elevación, velocidad) durante el mismo intervalo de tiempo en que la Fit3 registró pulso elevado (140 - 175 bpm).
3. **Simulador de Mensajes de Voz de Telegram:**
   - Script ejecutable (`npm run mock:telegram`) que emula la entrada de un mensaje o nota de voz de nutrición e hidratación.
4. **Validación End-to-End y CI:**
   - Comprobación de integridad de tipos en TypeScript (`tsc --noEmit`).
   - Verificación de compilación de producción de Next.js (`npm run build`).
