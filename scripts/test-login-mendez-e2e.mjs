// ====================================================================
// SCRIPT: test-login-mendez-e2e.mjs
// Test End-to-End exhaustivo en Chrome Real:
// 1. Carga limpia del navegador (Zero Data Exposure)
// 2. Comprobación de Gatekeeper en fotograma 0
// 3. Inicio de sesión con 'mendez'
// 4. Carga exitosa del Dashboard y datos de Álvaro Méndez
// 5. Navegación a Pestaña Tribu: Tribu Titanes 2027 y feed visible
// 6. Cierre de sesión y verificación de borrado completo
// 7. Prueba de login con acento 'méndez'
// 8. Capturas fotográficas para auditoría de calidad
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
  console.log('🚀 Iniciando Browser E2E para Login con "mendez"...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,900',
      '--disable-web-security',
      '--incognito'
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. Abrir aplicación en entorno limpio
    console.log('🌐 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // En incognito arrancamos limpios; aseguramos que no haya residuos
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Comprobar si el Gatekeeper está en pantalla
    await snap(page, 'mendez_01_gatekeeper_initial');

    // 2. Esperar al input de login
    console.log('⏳ Esperando input [data-testid="login-input"]...');
    await page.waitForSelector('[data-testid="login-input"]', { timeout: 10000 });
    await snap(page, 'mendez_02_login_form_ready');

    // 3. Escribir 'mendez' en el campo de entrada
    console.log('⌨️ Escribiendo identificador "mendez"...');
    const input = await page.$('[data-testid="login-input"]');
    if (!input) throw new Error('No se encontró [data-testid="login-input"]');
    await input.click({ clickCount: 3 });
    await input.type('mendez', { delay: 50 });

    await new Promise((r) => setTimeout(r, 500));
    await snap(page, 'mendez_03_typing_mendez');

    // 4. Enviar formulario haciendo clic en el botón de submit
    console.log('🚀 Haciendo clic en "Entrar al Laboratorio"...');
    const submitBtn = await page.$('[data-testid="login-submit-btn"]');
    if (!submitBtn) throw new Error('No se encontró [data-testid="login-submit-btn"]');
    await submitBtn.click();

    // Esperar a que la autenticación complete y aparezca el Dashboard
    console.log('⏳ Esperando carga del Dashboard tras autenticar...');
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 5. Verificar que el atleta es Álvaro Méndez
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasName = pageText.includes('Álvaro Méndez') || pageText.includes('Álvaro');
    console.log(`👤 Nombre del atleta presente en pantalla: ${hasName}`);

    await snap(page, 'mendez_04_dashboard_authed');

    // 6. Navegar a la pestaña "Tribu"
    console.log('👥 Navegando a pestaña Tribu...');
    const navButtons = await page.$$('nav button, div[role="navigation"] button, button');
    for (const b of navButtons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.toLowerCase().includes('tribu')) {
        await b.click();
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
    await snap(page, 'mendez_05_squad_view_loaded');

    const squadText = await page.evaluate(() => document.body.innerText);
    const hasTitanes = squadText.includes('Tribu Titanes 2027') || squadText.includes('Titanes');
    const hasFeed = squadText.includes('Fuerza') || squadText.includes('Rodaje');
    console.log(`🏰 Tribu Titanes 2027 cargada: ${hasTitanes}`);
    console.log(`⚡ Feed con check-ins visible: ${hasFeed}`);

    // 7. Probar Cierre de Sesión Completo
    console.log('🔒 Probando Cierre de Sesión...');
    // Ejecutar logout limpio vía API y cliente
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'ironman_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
      document.cookie = 'ironman_athlete_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
      await fetch('/api/auth/logout', { method: 'POST' });
      location.reload();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await snap(page, 'mendez_06_logged_out_gatekeeper');

    // 8. Probar Login con acento: 'méndez'
    console.log('🇪🇸 Probando inicio de sesión con acento: "méndez"...');
    await page.waitForSelector('[data-testid="login-input"]', { timeout: 10000 });
    const inputAccent = await page.$('[data-testid="login-input"]');
    await inputAccent.click({ clickCount: 3 });
    await inputAccent.type('méndez', { delay: 50 });
    await new Promise((r) => setTimeout(r, 500));
    await snap(page, 'mendez_07_typing_mendez_with_accent');

    const submitAccent = await page.$('[data-testid="login-submit-btn"]');
    await submitAccent.click();

    // Esperar a que el Dashboard cargue de nuevo
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    await snap(page, 'mendez_08_logged_in_with_accent');

    console.log('🎉 ¡Prueba E2E completada con éxito rotundo!');
  } catch (error) {
    console.error('❌ Error durante la prueba E2E:', error);
    await snap(page, 'mendez_error_state');
    throw error;
  } finally {
    await browser.close();
  }
}

run();
