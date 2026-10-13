import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:\\Users\\alvar\\.gemini\\antigravity\\brain\\b492e7bd-dd71-4329-a12b-f0cb35827a27\\screenshots';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDebug() {
  console.log('🚀 Iniciando Browser Debug Journey...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      try {
        const text = await res.text();
        console.log(`[NETWORK RESPONSE] ${res.status()} ${res.url()} -> ${text.slice(0, 150)}`);
      } catch {}
    }
  });

  // 1. Cargar la app
  console.log('1. Cargando app...');
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await sleep(1500);

  // 2. Ver estado actual (¿está en WelcomeGatekeeper o en el Dashboard?)
  const hasGatekeeper = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return Boolean(
      document.querySelector('input[placeholder*="Álvaro"]') ||
      buttons.find((b) => b.innerText.includes('Crear Perfil')) ||
      document.body.innerText.includes('Bienvenido a IronMan Lab')
    );
  });
  console.log('¿Está en WelcomeGatekeeper?:', hasGatekeeper);

  if (hasGatekeeper) {
    console.log('Registrando atleta en Gatekeeper...');
    // Clic en "Crear Perfil de Atleta" si está en vista welcome
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Crear Perfil'));
      if (btn) btn.click();
    });
    await sleep(800);

    // Rellenar formulario de registro
    const username = 'alvaro_' + Date.now().toString().slice(-4);
    await page.type('input[placeholder*="Méndez"]', 'Álvaro');
    await page.type('input[placeholder*="alvaro_iron"]', username);
    await page.type('input[type="email"]', `${username}@ironman.test`);
    await sleep(500);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Comenzar'));
      if (btn) btn.click();
    });
    await sleep(2500);
  }

  // 3. Ir a la pestaña Tribu
  console.log('3. Navegando a pestaña Tribu...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Tribu'));
    if (btn) btn.click();
  });
  await sleep(1500);

  // 4. Comprobar si está en EmptySquadView o en SquadView
  const tribeText = await page.evaluate(() => document.body.innerText);
  console.log('Texto en pantalla Tribu:', tribeText.slice(0, 300));

  const hasCrearTribu = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return Boolean(buttons.find(b => b.innerText.includes('Crear Tribu')));
  });
  console.log('¿Botón Crear Tribu visible?:', hasCrearTribu);

  if (hasCrearTribu) {
    console.log('Haciendo clic en Crear Tribu...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Crear Tribu'));
      if (btn) btn.click();
    });
    await sleep(1000);

    console.log('Escribiendo nombre de tribu...');
    await page.type('input[placeholder*="Tribu 21K"]', 'Tribu Titanes Test');
    await sleep(500);

    console.log('Enviando Fundar Tribu...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Fundar Tribu'));
      if (btn) btn.click();
    });
    await sleep(2500);
  }

  // 5. Comprobar si la tribu se creó y se muestra el feed
  const postCreateText = await page.evaluate(() => document.body.innerText);
  console.log('¿Aparece "Tribu Titanes Test"?:', postCreateText.includes('Tribu Titanes Test'));

  // 6. Probar Check-in Hoy
  console.log('6. Probando Check-in Hoy...');
  const hasCheckInBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return Boolean(buttons.find(b => b.innerText.includes('Check-in Hoy') || b.innerText.includes('Publicar mi Entreno')));
  });
  console.log('¿Botón de Check-in visible?:', hasCheckInBtn);

  if (hasCheckInBtn) {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Check-in Hoy') || b.innerText.includes('Publicar mi Entreno'));
      if (btn) btn.click();
    });
    await sleep(1000);

    console.log('Enviando Check-in...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Confirmar Check-in'));
      if (btn) btn.click();
    });
    await sleep(2500);
  }

  // 7. Comprobar si el Check-in aparece en el feed
  const finalFeedText = await page.evaluate(() => document.body.innerText);
  console.log('¿Aparece el check-in en el feed?:', finalFeedText.includes('Entreno de Fuerza en Sala') || finalFeedText.includes('Rodaje'));

  // 8. Recargar la página (F5) para probar persistencia total
  console.log('8. Recargando página (F5)...');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);

  // Volver a pestaña Tribu
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Tribu'));
    if (btn) btn.click();
  });
  await sleep(1500);

  const afterReloadText = await page.evaluate(() => document.body.innerText);
  console.log('DESPUÉS DE RECARGAR (F5):');
  console.log('¿Persiste la Tribu?:', afterReloadText.includes('Tribu Titanes Test'));
  console.log('¿Persiste el Check-in?:', afterReloadText.includes('Entreno de Fuerza en Sala') || afterReloadText.includes('Rodaje'));

  await browser.close();
  console.log('🎉 Browser Debug Journey completado.');
}

runDebug().catch((err) => {
  console.error('❌ Error en Browser Debug:', err);
  process.exit(1);
});
