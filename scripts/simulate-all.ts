/**
 * SCRIPT QA & AUTOMATION: SIMULACIÓN END-TO-END DE WEBHOOKS Y PUENTE
 * Especialista: QA & Automation Specialist (Skill: webhook-tester-automation)
 * 
 * Ejecuta una simulación completa sin necesidad de dispositivos físicos:
 * 1. Simulación de datos pasivos de Galaxy Fit3 (Health Connect)
 * 2. Simulación de handshake GET de Strava (hub.challenge)
 * 3. Simulación de evento POST de carrera GPS de Strava y fusión de pulso
 * 4. Simulación de nota de voz de nutrición e hidratación por Telegram
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const BRIDGE_TOKEN = process.env.BRIDGE_API_KEY || 'ironman_secret_fit3_token_2026';
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'ironman_strava_webhook_token_secure';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS IRONMAN');
  console.log(`📡 URL Objetivo: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // ----------------------------------------------------
  // PRUEBA 1: Handshake GET de Strava (hub.challenge)
  // ----------------------------------------------------
  try {
    process.stdout.write('1. Strava Webhook Handshake (GET)... ');
    const challengeValue = 'test_challenge_abc_123';
    const res = await fetch(
      `${BASE_URL}/api/strava/webhook?hub.mode=subscribe&hub.verify_token=${STRAVA_VERIFY_TOKEN}&hub.challenge=${challengeValue}`
    );
    const data = await res.json();

    if (res.status === 200 && data['hub.challenge'] === challengeValue) {
      console.log('✅ OK (200, challenge devuelto exactamente)');
      passed++;
    } else {
      console.log(`❌ FALLÓ (Status ${res.status}):`, data);
      failed++;
    }
  } catch (err: any) {
    console.log('❌ ERROR DE RED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // PRUEBA 2: Envío de Métricas de Galaxy Fit3 (/api/bridge/sync)
  // ----------------------------------------------------
  try {
    process.stdout.write('2. Galaxy Fit3 Health Connect (POST /api/bridge/sync)... ');
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // Generar muestras de pulso para la última hora (para luego cruzar con Strava)
    const hrSamples = [];
    const oneHourAgoMs = Date.now() - 3600 * 1000;
    for (let i = 0; i < 360; i += 10) {
      hrSamples.push({
        timestamp: new Date(oneHourAgoMs + i * 1000).toISOString(),
        bpm: 140 + Math.round(Math.random() * 30),
      });
    }

    const fit3Payload = {
      device: 'Samsung Galaxy Fit3',
      synced_at: nowIso,
      daily_metric: {
        date: todayStr,
        resting_hr: 50,
        sleep_duration_minutes: 480,
        sleep_score: 92,
        deep_sleep_minutes: 105,
        rem_sleep_minutes: 120,
        light_sleep_minutes: 230,
        awake_minutes: 25,
        spo2_avg: 98.1,
        spo2_min: 95.0,
        total_steps: 12500,
        active_calories: 720,
      },
      heart_rate_samples: hrSamples,
    };

    const res = await fetch(`${BASE_URL}/api/bridge/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-token': BRIDGE_TOKEN,
      },
      body: JSON.stringify(fit3Payload),
    });
    const data = await res.json();

    if (res.status === 200 && data.success) {
      console.log(`✅ OK (${data.records_received.hr_samples} muestras registradas)`);
      passed++;
    } else {
      console.log(`❌ FALLÓ (Status ${res.status}):`, data);
      failed++;
    }
  } catch (err: any) {
    console.log('❌ ERROR DE RED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // PRUEBA 3: Evento de Nueva Carrera de Strava con Fusión de Pulso
  // ----------------------------------------------------
  try {
    process.stdout.write('3. Evento Strava & Cruce de Pulso Fit3 (POST /api/strava/webhook)... ');
    const oneHourAgoMs = Date.now() - 3600 * 1000;
    const runStartIso = new Date(oneHourAgoMs).toISOString();

    // Generar streams de ruta GPS
    const streams = [];
    for (let s = 0; s < 360; s += 10) {
      streams.push({
        time: s,
        altitude: 600 + Math.round(Math.sin(s / 60) * 30),
        velocity_smooth: 3.4,
      });
    }

    const stravaPayload = {
      aspect_type: 'create',
      event_time: Math.floor(oneHourAgoMs / 1000),
      object_id: 1122334455,
      object_type: 'activity',
      owner_id: 998877,
      subscription_id: 1,
      simulation_data: {
        name: 'Test Run 5K - QA Automated',
        type: 'Run',
        start_date: runStartIso,
        elapsed_time: 360,
        moving_time: 350,
        distance: 5000,
        total_elevation_gain: 45,
        streams_data: streams,
      },
    };

    const res = await fetch(`${BASE_URL}/api/strava/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stravaPayload),
    });
    const data = await res.json();

    if (res.status === 200 && data.acknowledged && data.avg_hr > 0) {
      console.log(`✅ OK (Fusión completada, Pulso Medio: ${data.avg_hr} bpm)`);
      passed++;
    } else {
      console.log(`❌ FALLÓ (Status ${res.status}):`, data);
      failed++;
    }
  } catch (err: any) {
    console.log('❌ ERROR DE RED:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // PRUEBA 4: Simulación de Audio/Texto de Nutrición por Telegram
  // ----------------------------------------------------
  try {
    process.stdout.write('4. Asistente de Nutrición por Telegram (POST /api/telegram/webhook)... ');
    const telegramPayload = {
      message: {
        chat: { id: 999999 },
        text: 'He comido 200g de pechuga de pollo con arroz blanco y ensalada, y he bebido dos vasos de agua.',
      },
    };

    const res = await fetch(`${BASE_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
    });
    const data = await res.json();

    if (res.status === 200 && data.success && data.meal_registered) {
      console.log(`✅ OK (Registrado: ${data.meal_registered.calories} kcal, +${data.water_added_ml}ml agua)`);
      passed++;
    } else {
      console.log(`❌ FALLÓ (Status ${res.status}):`, data);
      failed++;
    }
  } catch (err: any) {
    console.log('❌ ERROR DE RED:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL: ${passed} Pasadas | ${failed} Falladas`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
