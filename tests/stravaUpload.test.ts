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
