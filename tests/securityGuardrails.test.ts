import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { POST as coachPost } from '../src/app/api/coach/message/route';
import { GET as weatherGet } from '../src/app/api/weather/route';
import { POST as bridgePost } from '../src/app/api/bridge/sync/route';

describe('SUITE DE SEGURIDAD & HARDENING DE ENDPOINTS', () => {
  it('BRIDGE SYNC: Rechaza peticiones sin token o con token erróneo', async () => {
    // Configurar BRIDGE_API_KEY para la prueba
    process.env.BRIDGE_API_KEY = 'secret_test_token_123';

    // Petición sin token
    const reqNoToken = new NextRequest('http://localhost:3000/api/bridge/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const resNoToken = await bridgePost(reqNoToken);
    assert.strictEqual(resNoToken.status, 401, 'Debe devolver 401 Unauthorized sin token');

    // Petición con token incorrecto
    const reqBadToken = new NextRequest('http://localhost:3000/api/bridge/sync', {
      method: 'POST',
      headers: { 'x-bridge-token': 'token_falso_invalido' },
      body: JSON.stringify({}),
    });
    const resBadToken = await bridgePost(reqBadToken);
    assert.strictEqual(resBadToken.status, 401, 'Debe devolver 401 Unauthorized con token inválido');
  });

  it('COACH MESSAGE: Rechaza payloads excesivos que puedan agotar cuota o memoria', async () => {
    // Payload de texto excesivo (> 4000 caracteres)
    const longText = 'A'.repeat(5001);
    const reqLongText = new NextRequest('http://localhost:3000/api/coach/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: longText }),
    });
    const resLongText = await coachPost(reqLongText);
    assert.strictEqual(resLongText.status, 400, 'Debe rechazar textos que superen 4000 caracteres con 400');

    // Formato de audio malicioso/no permitido
    const reqBadMime = new NextRequest('http://localhost:3000/api/coach/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        audioBase64: 'SGVsbG8=',
        mimeType: 'application/x-executable',
      }),
    });
    const resBadMime = await coachPost(reqBadMime);
    assert.strictEqual(resBadMime.status, 400, 'Debe rechazar formatos MIME no de audio con 400');
  });

  it('WEATHER API: Rechaza coordenadas geográficas fuera de los límites planetarios', async () => {
    // Latitud imposible (> 90)
    const reqBadLat = new NextRequest('http://localhost:3000/api/weather?lat=150.0&lon=0.0');
    const resBadLat = await weatherGet(reqBadLat);
    assert.strictEqual(resBadLat.status, 400, 'Debe devolver 400 con latitud > 90');

    // Longitud imposible (< -180)
    const reqBadLon = new NextRequest('http://localhost:3000/api/weather?lat=40.0&lon=-200.0');
    const resBadLon = await weatherGet(reqBadLon);
    assert.strictEqual(resBadLon.status, 400, 'Debe devolver 400 con longitud < -180');
  });
});
