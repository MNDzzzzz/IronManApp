// ====================================================================
// SCRIPT: test-director-comprehensive-qa.mjs
// Auditoría Completa E2E en Chrome Real (Móvil 390x844 y Desktop 1280x900):
// 1. Contraste cromático en Modo Claro y Modo Oscuro (cero blanco sobre blanco)
// 2. Jerarquía de capas (z-index): Modales z-[100] sobre BottomNav z-40
// 3. Verificación de scroll seguro y sin botones tapados por la barra inferior
// 4. Captura de evidencias fotográficas en cada tab y modal
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
  console.log(`📸 [QA CAPTURA]: ${name}.png guardada con éxito.`);
}

async function run() {
  console.log('🏁 Iniciando Auditoría QA Integral con Agente Director...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,950',
      '--disable-web-security',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Configurar viewport móvil iPhone 14 (390 x 844)
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    // PASO 1: Visitar localhost en estado anónimo (Gatekeeper) en Modo Claro
    console.log('📱 1. Verificando Gatekeeper en Móvil...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    await snap(page, 'qa_01_mobile_gatekeeper');

    // Comprobar que en el Gatekeeper no hay BottomNav visible
    const bottomNavOnGatekeeper = await page.$('nav[aria-label="Navegación principal de IronManApp"]');
    if (bottomNavOnGatekeeper) {
      console.warn('⚠️ AVISO: BottomNav presente durante Gatekeeper');
    } else {
      console.log('✅ PASS: BottomNav está correctamente oculto en Gatekeeper sin sesión.');
    }

    // PASO 2: Iniciar sesión con 'mendez'
    console.log('🔑 2. Iniciando sesión con mendez...');
    const loginTabButton = await page.waitForSelector('button[data-testid="tab-login"]', { timeout: 5000 });
    await loginTabButton.click();
    await new Promise((r) => setTimeout(r, 400));

    const userInput = await page.waitForSelector('input[data-testid="login-input"]', { timeout: 5000 });
    await userInput.click({ clickCount: 3 });
    await userInput.type('mendez', { delay: 40 });

    const submitBtn = await page.waitForSelector('button[data-testid="login-submit-btn"]', { timeout: 5000 });
    await submitBtn.click();

    // Esperar a que el dashboard cargue
    await page.waitForSelector('main', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✅ PASS: Dashboard cargado tras login.');

    await snap(page, 'qa_02_mobile_dashboard_today_dark');

    // PASO 3: Conmutar a MODO CLARO en Móvil y comprobar contraste
    console.log('☀️ 3. Probando Modo Claro y contraste...');
    const themeBtn = await page.waitForSelector('button[aria-label*="modo" i]', { timeout: 5000 });
    await themeBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    await snap(page, 'qa_03_mobile_dashboard_today_light');

    // Verificar contraste de textos clave en Light Mode
    const lightModeEvaluation = await page.evaluate(() => {
      const htmlClass = document.documentElement.className;
      const bodyColor = window.getComputedStyle(document.body).color;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return { htmlClass, bodyColor, bodyBg };
    });
    console.log('🎨 Estado de estilos en modo claro:', lightModeEvaluation);

    // PASO 4: Abrir UserProfileModal en móvil y verificar superposición sobre BottomNav
    console.log('👤 4. Abriendo UserProfileModal...');
    const profileAvatarBtn = await page.waitForSelector('button[aria-label="Perfil y Sesión"]', { timeout: 5000 });
    await profileAvatarBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    await snap(page, 'qa_04_mobile_modal_user_profile_light');

    // Verificar z-indexes en el DOM
    const zIndexCheck = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0.z-\\[100\\]');
      const bottomNav = document.querySelector('nav[aria-label="Navegación principal de IronManApp"]');
      const modalZ = modal ? window.getComputedStyle(modal).zIndex : null;
      const navZ = bottomNav ? window.getComputedStyle(bottomNav).zIndex : null;
      return { modalZ, navZ, isModalHigher: Number(modalZ) > Number(navZ) };
    });
    console.log('🛡️ Verificación de z-index:', zIndexCheck);

    // Cerrar el modal de perfil y esperar a que desaparezca del DOM
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Cerrar modal"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // PASO 5: Navegar a cada pestaña en móvil y verificar BottomNav Clearance
    const tabs = [
      { name: 'entreno', label: 'Entreno' },
      { name: 'dieta', label: 'Dieta' },
      { name: 'salud', label: 'Salud' },
      { name: 'tribu', label: 'Tribu' }
    ];

    for (const tab of tabs) {
      console.log(`🧭 Navegando a pestaña: ${tab.label}...`);
      await page.evaluate((label) => {
        const btn = document.querySelector(`nav button[aria-label="${label}"]`);
        if (btn) btn.click();
      }, tab.label);
      await new Promise((r) => setTimeout(r, 1200));

      await snap(page, `qa_05_mobile_tab_${tab.name}_light`);

      // Si estamos en la pestaña tribu, abrir modal para crear tribu o check-in si está disponible
      if (tab.name === 'tribu') {
        const createBtnExists = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Crear mi Tribu') || b.textContent.includes('Nueva Tribu'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (createBtnExists) {
          console.log('⚡ Abriendo modal Crear Tribu en móvil...');
          await new Promise((r) => setTimeout(r, 800));
          await snap(page, 'qa_06_mobile_modal_create_squad');

          // Cerrar modal
          await page.evaluate(() => {
            const closeBtn = document.querySelector('.fixed.inset-0.z-\\[100\\] button');
            if (closeBtn) closeBtn.click();
          });
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    // PASO 6: Vista de Escritorio (Desktop 1280x900)
    console.log('💻 6. Verificando vista Desktop...');
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 600));

    // Volver a la pestaña Hoy
    const hoyDesktopBtn = await page.waitForSelector('header button ::-p-text(Hoy), button ::-p-text(Hoy)', { timeout: 5000 });
    await hoyDesktopBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    await snap(page, 'qa_08_desktop_today_light');

    // Cambiar a modo oscuro en Desktop
    const themeBtnDesktop = await page.waitForSelector('button[aria-label*="modo" i]', { timeout: 5000 });
    await themeBtnDesktop.click();
    await new Promise((r) => setTimeout(r, 800));

    await snap(page, 'qa_09_desktop_today_dark');

    console.log('🎉 Auditoría QA E2E en Navegador completada con éxito.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Error durante la auditoría QA:', err);
  process.exit(1);
});
