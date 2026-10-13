// ====================================================================
// SCRIPT: test-social-browser-flow.mjs
// Test automatizado completo de la experiencia social con Chrome real
// Registro -> Crear Tribu -> Verificar Visibilidad -> Check-in de entreno -> Recarga de página
// ====================================================================

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\alvar\\.gemini\\antigravity\\brain\\b492e7bd-dd71-4329-a12b-f0cb35827a27\\screenshots';
const PUBLIC_DIR = path.resolve('public/audit-screenshots');

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function takeScreenshot(page, filename, description) {
  const destPublic = path.join(PUBLIC_DIR, filename);
  const destArtifact = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: destPublic, fullPage: false });
  fs.copyFileSync(destPublic, destArtifact);
  console.log(`[SCREENSHOT] 📸 ${filename} - ${description}`);
}

async function run() {
  console.log('🚀 Lanzando Chrome para test end-to-end de Tribu y Check-in...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900', '--incognito'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('  [BROWSER ERROR]', err.message));
    page.on('response', (res) => {
      if (res.url().includes('/api/') && !res.ok()) {
        console.log('  [API ERROR RESPONSE]', res.status(), res.url());
      }
    });

    console.log('\n--- PASO 1: Cargar la aplicación ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'step1_gatekeeper.png', 'Pantalla de acceso inicial');

    console.log('\n--- PASO 2: Registro de nuevo atleta ---');
    const uname = 'alvqa_' + Date.now().toString().slice(-6);
    await page.type('input[placeholder="Ej. Álvaro Méndez"]', 'Álvaro Méndez QA');
    await page.type('input[placeholder="alvaro_iron"]', uname);
    await page.click('button[type="submit"]');

    await new Promise((r) => setTimeout(r, 2000));
    await takeScreenshot(page, 'step2_dashboard_ready.png', 'Dashboard tras registro exitoso');

    console.log('\n--- PASO 3: Navegación a la pestaña Tribu ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const tribuBtn = btns.find((b) => b.innerText.includes('Tribu'));
      if (tribuBtn) tribuBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1500));
    await takeScreenshot(page, 'step3_empty_squad_view.png', 'Vista inicial de Tribu sin grupos');

    console.log('\n--- PASO 4: Abrir modal Crear Tribu ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find((b) => b.innerText.includes('Crear Tribu'));
      if (createBtn) createBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1000));
    await takeScreenshot(page, 'step4_create_tribe_modal.png', 'Modal Crear Tribu abierto');

    console.log('\n--- PASO 5: Fundar Tribu ---');
    await page.type('input[placeholder*="Tribu 21K"]', 'Tribu Titanes 2027');
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
        b.innerText.includes('Fundar Tribu')
      );
      if (submitBtn) submitBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2500));
    await takeScreenshot(page, 'step5_tribe_created_feed.png', 'Tribu creada visible con su feed');

    const tribeTitleVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Tribu Titanes 2027');
    });
    console.log(`✓ Tribu "Tribu Titanes 2027" visible en la pantalla: ${tribeTitleVisible}`);

    console.log('\n--- PASO 6: Añadir Check-in de entreno ---');
    const clickedCheckin = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const checkinBtn = btns.find((b) => b.innerText.includes('Check-in Hoy'));
      if (checkinBtn) {
        checkinBtn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Botón Check-in Hoy clickeado: ${clickedCheckin}`);

    await new Promise((r) => setTimeout(r, 1000));
    await takeScreenshot(page, 'step6_checkin_sheet_open.png', 'Hoja de Check-in abierta');

    // Cambiar a Running
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const runningBtn = btns.find((b) => b.innerText.includes('Running'));
      if (runningBtn) runningBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Llenar datos de check-in
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const titleInput = inputs.find((i) => i.placeholder && i.placeholder.includes('título')) || inputs[0];
      if (titleInput) {
        titleInput.value = 'Rodaje Real 8K Ritmo Z2';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
        b.innerText.includes('Confirmar Check-in') || b.innerText.includes('Publicar') || b.innerText.includes('Registrar')
      );
      if (submitBtn) submitBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2500));
    await takeScreenshot(page, 'step7_checkin_posted_feed.png', 'Feed tras publicar check-in');

    const checkinVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Rodaje Real 8K Ritmo Z2');
    });
    console.log(`✓ Check-in visible en el feed de la tribu: ${checkinVisible}`);

    console.log('\n--- PASO 7: Navegación entre pestañas (Entreno -> Tribu) ---');
    // Ir a pestaña Entreno
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const entrenoBtn = btns.find((b) => b.innerText.includes('Entreno'));
      if (entrenoBtn) entrenoBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Volver a pestaña Tribu
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const tribuBtn = btns.find((b) => b.innerText.includes('Tribu'));
      if (tribuBtn) tribuBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await takeScreenshot(page, 'step8_tribu_persisted_after_nav.png', 'Tribu sigue presente tras navegar');

    const tribeStillVisible = await page.evaluate(() => {
      return document.body.innerText.includes('Tribu Titanes 2027');
    });
    console.log(`✓ Tribu sigue visible tras cambiar de pestaña: ${tribeStillVisible}`);

    console.log('\n--- PASO 8: Recarga total de la página (F5) ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Si recarga en Hoy, ir a Tribu
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const tribuBtn = btns.find((b) => b.innerText.includes('Tribu'));
      if (tribuBtn) tribuBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await takeScreenshot(page, 'step9_tribu_persisted_after_reload.png', 'Tribu tras recarga completa');

    const tribePersistedReload = await page.evaluate(() => {
      return document.body.innerText.includes('Tribu Titanes 2027');
    });
    const checkinPersistedReload = await page.evaluate(() => {
      return document.body.innerText.includes('Rodaje Real 8K Ritmo Z2');
    });
    console.log(`✓ Tribu persiste tras recarga: ${tribePersistedReload}`);
    console.log(`✓ Check-in persiste tras recarga: ${checkinPersistedReload}`);

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('ERROR EN TEST DE FLUJO SOCIAL:', err);
  process.exit(1);
});
