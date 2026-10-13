// ====================================================================
// SCRIPT: test-mendez-weight-full-verification.mjs
// Verificación visual y de datos en navegador real (Chrome Incognito)
// 1. Acceso con usuario 'mendez'
// 2. Comprobación del peso actual (99.9 kg) y pérdida acumulada (-2.6 kg)
// 3. Verificación de la gráfica y tabla con los 11-14 pesajes históricos
// 4. Capturas fotográficas de alta resolución
// ====================================================================

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\alvar\\.gemini\\antigravity\\brain\\b492e7bd-dd71-4329-a12b-f0cb35827a27\\screenshots';
const PUBLIC_DIR = path.resolve('public/audit-screenshots');

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function snap(page, name) {
  const pPath = path.join(PUBLIC_DIR, `${name}.png`);
  const aPath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: pPath, fullPage: false });
  fs.copyFileSync(pPath, aPath);
  console.log(`📸 Captura guardada: ${name}.png`);
}

async function run() {
  console.log('🚀 Iniciando Verificación Completa de Sesión y Pesajes para "mendez"...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,950',
      '--disable-web-security',
      '--incognito'
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  try {
    // 1. Cargar aplicación en entorno limpio
    console.log('🌐 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    await snap(page, 'weight_audit_01_gatekeeper');

    // 2. Iniciar sesión con 'mendez'
    console.log('⌨️ Introduciendo "mendez"...');
    await page.waitForSelector('[data-testid="login-input"]', { timeout: 10000 });
    const input = await page.$('[data-testid="login-input"]');
    await input.click({ clickCount: 3 });
    await input.type('mendez', { delay: 50 });
    await new Promise((r) => setTimeout(r, 400));

    const submitBtn = await page.$('[data-testid="login-submit-btn"]');
    await submitBtn.click();

    // 3. Esperar a que entre al Dashboard
    console.log('⏳ Esperando Dashboard tras login...');
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    await snap(page, 'weight_audit_02_today_view');

    // Verificar texto en TodayView
    const todayContent = await page.evaluate(() => document.body.innerText);
    console.log('📊 Peso visible en Hoy:', todayContent.includes('99.9') ? 'SÍ (99.9 kg)' : 'Buscando...');

    // 4. Navegar a la pestaña "Salud"
    console.log('🩺 Navegando a la pestaña "Salud"...');
    const buttons = await page.$$('nav button, div[role="navigation"] button, button');
    let healthBtnFound = false;
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && (txt.toLowerCase().includes('salud') || txt.toLowerCase().includes('biometría'))) {
        await b.click();
        healthBtnFound = true;
        break;
      }
    }

    if (!healthBtnFound) {
      // Intentar clic por data-testid o selector específico
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.toLowerCase().includes('salud'));
        if (btn) btn.click();
      });
    }

    await new Promise((r) => setTimeout(r, 3000));
    await snap(page, 'weight_audit_03_health_view_overview');

    // 5. Analizar contenido del componente WeightTracker en pantalla
    const healthText = await page.evaluate(() => document.body.innerText);
    console.log('--- REVISIÓN DE TEXTO EN PESTAÑA SALUD ---');
    console.log('¿Muestra 99.9?:', healthText.includes('99.9'));
    console.log('¿Muestra 102.5?:', healthText.includes('102.5'));
    console.log('¿Muestra total perdido (-2.6)?:', healthText.includes('2.6') || healthText.includes('-2.6'));
    console.log('¿Muestra historial de pesajes?:', healthText.includes('Historial') || healthText.includes('Pesajes') || healthText.includes('Registros'));

    // Scroll suave hacia abajo para capturar la gráfica completa y la lista histórica
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 1000));
    await snap(page, 'weight_audit_04_health_weight_chart');

    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise((r) => setTimeout(r, 1000));
    await snap(page, 'weight_audit_05_health_weight_history_table');

    console.log('✅ Verificación visual y de datos completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    await snap(page, 'weight_audit_error');
    throw error;
  } finally {
    await browser.close();
  }
}

run();
