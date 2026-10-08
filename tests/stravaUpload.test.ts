import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as stravaUploadGet, POST as stravaUploadPost } from '../src/app/api/activities/strava-upload/route';
import { GET as stravaAliasGet, POST as stravaAliasPost } from '../src/app/api/strava/upload/route';
import { GET as activityDetailGet } from '../src/app/api/activities/[id]/route';

test('STRAVA UPLOAD: GET /api/activities/strava-upload retorna estado online y nunca 404', async () => {
  const res = await stravaUploadGet();
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.status, 'online');
  assert.ok(Array.isArray(json.models));
  assert.ok(json.models.includes('gemini-3.5-flash'));
});

test('STRAVA UPLOAD: POST /api/activities/strava-upload valida cuerpo vacío sin retornar 404', async () => {
  const req = new NextRequest('http://localhost:3000/api/activities/strava-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await stravaUploadPost(req);
  assert.equal(res.status, 400);

  const json = await res.json();
  assert.equal(json.success, false);
  assert.ok(json.error.includes('base64'));
});

test('STRAVA UPLOAD ALIAS: GET y POST /api/strava/upload delegan correctamente sin 404', async () => {
  const reqGet = new NextRequest('http://localhost:3000/api/strava/upload');
  const resGet = await stravaAliasGet(reqGet);
  assert.equal(resGet.status, 200);

  const reqPost = new NextRequest('http://localhost:3000/api/strava/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: '' }),
  });
  const resPost = await stravaAliasPost(reqPost);
  assert.equal(resPost.status, 400);
});

test('STRAVA UPLOAD ROUTING: /api/activities/[id] no confunde strava-upload con un ID inexistente', async () => {
  const req = new NextRequest('http://localhost:3000/api/activities/strava-upload');
  const res = await activityDetailGet(req, { params: { id: 'strava-upload' } });

  // Debe retornar 405 Method Not Allowed en vez de 404
  assert.equal(res.status, 405);
});

test('BIOMETRIC FUSION: extractHeartRateFromText extrae pulsaciones medias de títulos en formatos variados', async () => {
  const { extractHeartRateFromText } = await import('../src/lib/merging/temporalAligner');

  assert.equal(extractHeartRateFromText('Rodaje suave 5k (142 bpm)'), 142);
  assert.equal(extractHeartRateFromText('Carrera matutina 140 ppm'), 140);
  assert.equal(extractHeartRateFromText('5km Z2 a 138 pulsaciones'), 138);
  assert.equal(extractHeartRateFromText('Rodaje FC: 145'), 145);
  assert.equal(extractHeartRateFromText('Rodaje sin pulso'), null);
});

test('BIOMETRIC FUSION: fuseStravaSplitsWithFit3 asigna pulso a cada kilómetro con muestras Fit3 o modelo fisiológico', async () => {
  const { fuseStravaSplitsWithFit3 } = await import('../src/lib/merging/temporalAligner');

  const baseActivity = {
    distance_km: 3,
    moving_time_seconds: 990,
    activity_date: '2026-10-08',
    splits: [
      { km: 1, pace: '5:35 /km' },
      { km: 2, pace: '5:30 /km' },
      { km: 3, pace: '5:25 /km' },
    ],
  };

  // Con pulso explícito en el título
  const fused = fuseStravaSplitsWithFit3(baseActivity, [], 'Rodaje 3k (142 bpm)');
  assert.equal(fused.avg_hr, 142);
  assert.equal(fused.splits.length, 3);
  assert.ok(fused.splits[0].avg_hr !== undefined && fused.splits[0].avg_hr > 0);
  assert.ok(fused.splits[2].avg_hr !== undefined && fused.splits[2].avg_hr > 0);

  // Con muestras de la Fit3
  const fit3Samples = [
    { timestamp: '2026-10-08T18:02:00Z', bpm: 135 },
    { timestamp: '2026-10-08T18:07:00Z', bpm: 142 },
    { timestamp: '2026-10-08T18:12:00Z', bpm: 149 },
  ];
  const fusedWithFit3 = fuseStravaSplitsWithFit3(baseActivity, fit3Samples, 'Rodaje 3k');
  assert.ok(fusedWithFit3.avg_hr >= 135 && fusedWithFit3.avg_hr <= 149);
  assert.equal(fusedWithFit3.source_applied, 'fit3_samples');
});

