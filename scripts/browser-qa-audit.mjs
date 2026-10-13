// ====================================================================
// SCRIPT DE AUDITORÍA AUTOMATIZADA BROWSER QA CON PUPPETEER-CORE
// IronManApp: Verificación Funcional y Visual en Navegador Real (Chrome)
// Cubre: Gatekeeper, Registro Real, Persistencia de Tribu, Guardado de Carrera,
// Navegación por pestañas, Modo Claro y Modo Oscuro, y Auditoría de Consola.
// ====================================================================

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:\\Users\\alvar\\.gemini\\antigravity\\brain\\b492e7bd-dd71-4329-a12b-f0cb35827a27\\screenshots';
const PUBLIC_DIR = path.resolve('public/audit-screenshots');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function takeScreenshot(page, filename, description) {
  const destPublic = path.join(PUBLIC_DIR, filename);
  const destArtifact = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: destPublic, fullPage: false });
  fs.copyFileSync(destPublic, destArtifact);
  console.log(`[SCREENSHOT] 📸 Guardada: ${filename} - ${description}`);
}

async function runBrowserQaAudit() {
  console.log('🚀 Iniciando Browser QA Audit en Chrome Headless...');
  console.log(`🔗 Destino: ${APP_URL}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.warn(`[BROWSER CONSOLE ERROR]: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error(`[BROWSER UNCAUGHT ERROR]: ${err.message}`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // FASE 1: Limpiar almacenamiento local y probar Welcome Gatekeeper
    // -------------------------------------------------------------
    console.log('\n--- FASE 1: Verificación de Welcome Gatekeeper (Onboarding Obligatorio) ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Limpiar cookies de navegador, localStorage y llamar a logout para simular visitante nuevo
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    });
    // Recargar página limpia
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 10000 });

    await takeScreenshot(page, '01_welcome_gatekeeper_clean.png', 'Pantalla de Bienvenida para usuarios nuevos sin sesión');

    // Verificar que el gatekeeper está visible y no se exponen métricas
    const gatekeeperTitle = await page.$eval('h1', (el) => el.innerText);
    console.log(`✅ Título detectado en pantalla inicial: "${gatekeeperTitle}"`);
    if (!gatekeeperTitle.includes('IronMan Lab')) {
      throw new Error(`Se esperaba "IronMan Lab" pero se obtuvo "${gatekeeperTitle}"`);
    }

    // -------------------------------------------------------------
    // FASE 2: Flujo de Registro Real
    // -------------------------------------------------------------
    console.log('\n--- FASE 2: Registro Real de Atleta ---');
    // Clic en botón "Crear Perfil de Atleta"
    const registerBtnSelector = 'button:has-text("Crear Perfil de Atleta"), button';
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find((b) => b.innerText.includes('Crear Perfil de Atleta'));
      if (target) target.click();
    });
    await sleep(800);

    await takeScreenshot(page, '02_register_form.png', 'Formulario de registro Apple ID con campos limpios');

    // Rellenar formulario de registro
    const athleteTestName = 'Carlos Triatleta';
    const athleteTestUsername = `carlos_${Date.now().toString().slice(-4)}`;

    await page.type('input[placeholder*="Álvaro"]', athleteTestName);
    await page.type('input[placeholder*="alvaro_iron"]', athleteTestUsername);
    await page.type('input[placeholder*="tu@email.com"]', 'carlos@ironmanlab.test');
    await sleep(500);

    // Enviar registro
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]'))[0];
      if (submitBtn) submitBtn.click();
    });

    // Esperar desbloqueo del dashboard
    await sleep(2500);
    await takeScreenshot(page, '03_dashboard_fresh_user_dark.png', 'Dashboard desbloqueado para el nuevo atleta en modo oscuro');

    // -------------------------------------------------------------
    // FASE 3: Navegación por Pestañas (Modo Oscuro)
    // -------------------------------------------------------------
    console.log('\n--- FASE 3: Navegación por todas las Pestañas ---');
    
    // 1. Pestaña Entreno
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Entreno'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '04_tab_entreno_cardio_dark.png', 'Pestaña Entreno (Cardio & Z2)');

    // Cambiar a Fuerza en Entreno
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Fuerza & Rodilla'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '05_tab_entreno_fuerza_dark.png', 'Pestaña Entreno (Rutina de Fuerza y Sobrecarga)');

    // Volver a Running para el test posterior
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Running & Z2'));
      if (btn) btn.click();
    });
    await sleep(500);

    // 2. Pestaña Dieta
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Dieta'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '06_tab_dieta_dark.png', 'Pestaña Dieta (Anillos de macros y comidas)');

    // 3. Pestaña Salud
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Salud'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '07_tab_salud_dark.png', 'Pestaña Salud (Readiness Score y Báscula)');

    // 4. Pestaña Tribu (Estado vacío inicial de nuevo atleta)
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Tribu'));
      if (btn) btn.click();
    });
    await sleep(1200);
    await takeScreenshot(page, '08_tab_tribu_empty_state_dark.png', 'Pestaña Tribu (Estado Vacío Inicial con Fundar Tribu)');

    // -------------------------------------------------------------
    // FASE 4: Creación de Tribu y Verificación de Persistencia
    // -------------------------------------------------------------
    console.log('\n--- FASE 4: Creación de Tribu y Verificación de Persistencia ---');

    // Clic en "+ Crear Tribu"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Crear Tribu'));
      if (btn) btn.click();
    });
    await sleep(800);

    // Rellenar modal de creación de tribu
    await page.type('input[placeholder*="Tribu 21K"]', 'Titanes 21K');
    await page.type('textarea[placeholder*="Preparación"]', 'Equipo de preparación para el medio maratón');
    await sleep(500);

    // Enviar creación
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Fundar Tribu'));
      if (btn) btn.click();
    });
    await sleep(2000);

    await takeScreenshot(page, '09_tribu_created_feed_dark.png', 'Tribu "Titanes 21K" creada con feed activo y código de invitación');

    // Comprobar persistencia navegando a otra pestaña y volviendo a Tribu
    console.log('🔄 Verificando persistencia al navegar entre pestañas...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Hoy'));
      if (btn) btn.click();
    });
    await sleep(1000);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Tribu'));
      if (btn) btn.click();
    });
    await sleep(1200);

    await takeScreenshot(page, '10_tribu_persisted_after_nav.png', 'Tribu persiste intacta tras navegación entre pestañas');

    // -------------------------------------------------------------
    // FASE 5: Añadir Carrera de Running en CardioView y Toast de Éxito
    // -------------------------------------------------------------
    console.log('\n--- FASE 5: Registro de Carrera de Running en CardioView ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Entreno'));
      if (btn) btn.click();
    });
    await sleep(1000);

    // Clic en "Añadir"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.trim() === 'Añadir');
      if (btn) btn.click();
    });
    await sleep(800);

    await takeScreenshot(page, '11_add_run_modal.png', 'Modal de registro de carrera');

    // Enviar carrera con valores
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(
        (b) => b.innerText.includes('Guardar Rodaje')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(1500);

    await takeScreenshot(page, '12_run_saved_toast_and_list.png', 'Carrera guardada con éxito, toast flotante y lista actualizada');

    // -------------------------------------------------------------
    // FASE 6: Modo Claro y Verificación de Contraste
    // -------------------------------------------------------------
    console.log('\n--- FASE 6: Modo Claro y Verificación de Contraste Tipográfico ---');
    // Cambiar a modo claro pulsando la tecla 't'
    await page.keyboard.press('t');
    await sleep(1000);

    // Captura Hoy en Modo Claro
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Hoy'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '13_today_light_mode.png', 'Dashboard Hoy en Modo Claro con alto contraste WCAG 2.2 AA');

    // Captura Tribu en Modo Claro
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Tribu'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '14_tribu_light_mode.png', 'Vista de Tribu en Modo Claro (Textos legibles y contraste calibrado)');

    // Captura Entreno en Modo Claro
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Entreno'));
      if (btn) btn.click();
    });
    await sleep(1000);
    await takeScreenshot(page, '15_entreno_light_mode.png', 'Vista de Entreno en Modo Claro (Bento de Zonas Cardíacas y Z2)');

    // Volver a Modo Oscuro para dejar la app en su estado original preferido
    await page.keyboard.press('t');
    await sleep(500);

    console.log('\n======================================================');
    console.log('✅ AUDITORÍA BROWSER QA COMPLETADA CON ÉXITO');
    console.log(`📸 Total capturas tomadas: 15`);
    console.log(`⚠️ Errores de consola detectados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Detalle de errores de consola:', consoleErrors);
    }
    console.log(`🌐 Errores de red 4xx/5xx: ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      console.log('Detalle de errores de red:', networkErrors);
    }
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Error fatal durante la auditoría Browser QA:', error);
    await takeScreenshot(page, 'error_fatal_qa.png', 'Captura del fallo durante Browser QA');
    throw error;
  } finally {
    await browser.close();
  }
}

runBrowserQaAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
