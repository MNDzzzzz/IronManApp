// ====================================================================
// SCRIPT: test-mendez-logout-login-cycle.mjs
// Prueba del ciclo completo de usuario en navegador real:
// 1. Login inicial con 'mendez'
// 2. Apertura del modal de perfil de atleta
// 3. Cierre de sesión real desde la UI
// 4. Verificación de Gatekeeper
// 5. Re-inicio de sesión con 'mendez'
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
  console.log('🚀 Probando ciclo interactivo de Logout y Re-Login...');

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

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Iniciar sesión
    await page.waitForSelector('[data-testid="login-input"]', { timeout: 10000 });
    const input = await page.$('[data-testid="login-input"]');
    await input.click({ clickCount: 3 });
    await input.type('mendez', { delay: 50 });
    await (await page.$('[data-testid="login-submit-btn"]')).click();

    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Abrir Modal de Perfil haciendo clic en el pill del usuario en TopBar
    console.log('👤 Abriendo ficha de perfil...');
    const profileBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Álvaro Méndez'));
    });
    if (profileBtn && profileBtn.asElement()) {
      await profileBtn.asElement().click();
    } else {
      throw new Error('No se encontró el botón de perfil en el TopBar');
    }

    await new Promise((r) => setTimeout(r, 1000));
    await snap(page, 'cycle_01_profile_modal');

    // 3. Hacer clic en "Cerrar Sesión en este Dispositivo"
    console.log('🔒 Cerrando sesión...');
    const logoutBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Cerrar Sesión'));
    });
    if (logoutBtn && logoutBtn.asElement()) {
      await logoutBtn.asElement().click();
    } else {
      throw new Error('No se encontró el botón de Cerrar Sesión en el modal');
    }

    await new Promise((r) => setTimeout(r, 1500));
    await snap(page, 'cycle_02_logged_out_gatekeeper');

    // 4. Re-iniciar sesión con 'mendez'
    console.log('🔑 Re-iniciando sesión con "mendez"...');
    await page.waitForSelector('[data-testid="login-input"]', { timeout: 10000 });
    const reInput = await page.$('[data-testid="login-input"]');
    await reInput.click({ clickCount: 3 });
    await reInput.type('mendez', { delay: 50 });
    await (await page.$('[data-testid="login-submit-btn"]')).click();

    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    await snap(page, 'cycle_03_logged_back_in');

    console.log('🎉 Ciclo interactivo superado con 100% de éxito.');
  } catch (err) {
    console.error('❌ Error en el ciclo:', err);
    await snap(page, 'cycle_error');
    throw err;
  } finally {
    await browser.close();
  }
}

run();
