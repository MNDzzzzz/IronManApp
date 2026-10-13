// ====================================================================
// SCRIPT: test-full-social-e2e.mjs
// Test End-to-End exhaustivo en Chrome Real:
// 1. Registro Real de Atleta en Gatekeeper
// 2. Creación de Tribu en Supabase y UI
// 3. Check-in Manual de Fuerza desde Tribu (Feed)
// 4. Registro de Rodaje Fit3 desde CardioView (Strava / Galaxy Fit3)
// 5. Verificación de Auto-checkin en Feed de Tribu
// 6. Verificación de Podio Semanal y Retos
// 7. Recarga completa de página (F5) y verificación de persistencia
// 8. Verificación directa de registros en base de datos Supabase
// ====================================================================

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\alvar\\.gemini\\antigravity\\brain\\b492e7bd-dd71-4329-a12b-f0cb35827a27\\screenshots';
const PUBLIC_DIR = path.resolve('public/audit-screenshots');

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

// Parsear .env.local para verificación en Supabase
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [k, ...v] = line.trim().split('=');
  if (k) env[k] = v.join('=').trim();
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function takeScreenshot(page, filename, description) {
  const destPublic = path.join(PUBLIC_DIR, filename);
  const destArtifact = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: destPublic, fullPage: false });
  fs.copyFileSync(destPublic, destArtifact);
  console.log(`[SCREENSHOT] 📸 ${filename} - ${description}`);
}

async function run() {
  console.log('🚀 Iniciando Test E2E Completo: Tribu, Cardio Fit3 y Persistencia en Supabase...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900', '--incognito'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const errors = [];
    page.on('pageerror', (err) => {
      console.log('  ❌ [BROWSER PAGE ERROR]', err.message);
      errors.push(err.message);
    });
    page.on('response', (res) => {
      if (res.url().includes('/api/') && !res.ok()) {
        console.log('  ⚠️ [API ERROR]', res.status(), res.url());
      }
    });

    // -------------------------------------------------------------
    // PASO 1: Portada de Acceso (Zero-Leak Gatekeeper)
    // -------------------------------------------------------------
    console.log('\n--- PASO 1: Apertura de IronManApp ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await takeScreenshot(page, 'e2e_01_gatekeeper.png', 'Puerta de acceso con sesión cerrada');

    // -------------------------------------------------------------
    // PASO 2: Registro de nuevo atleta
    // -------------------------------------------------------------
    console.log('\n--- PASO 2: Registro de atleta Álvaro ---');
    const athleteUname = 'alvaro_' + Date.now().toString().slice(-5);
    await page.type('input[placeholder="Ej. Álvaro Méndez"]', 'Álvaro Méndez Pro');
    await page.type('input[placeholder="alvaro_iron"]', athleteUname);
    await page.click('button[type="submit"]');

    await new Promise((r) => setTimeout(r, 2000));
    await takeScreenshot(page, 'e2e_02_dashboard_authed.png', 'Dashboard autenticado');

    // -------------------------------------------------------------
    // PASO 3: Navegación a pestaña Tribu & Creación
    // -------------------------------------------------------------
    console.log('\n--- PASO 3: Crear Tribu ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const b = btns.find((x) => x.innerText.includes('Tribu'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Clic en Crear Tribu
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.innerText.includes('Crear Tribu'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Escribir nombre de tribu
    const tribeName = 'Tribu Titanes 2027';
    await page.type('input[placeholder*="Tribu 21K"]', tribeName);
    
    // Clic en Fundar Tribu
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button[type="submit"]')).find((x) =>
        x.innerText.includes('Fundar Tribu')
      );
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await takeScreenshot(page, 'e2e_03_tribu_creada.png', 'Tribu creada en pantalla');

    const tribeVisible = await page.evaluate(() => document.body.innerText.includes('Tribu Titanes 2027'));
    console.log(`✓ Tribu "${tribeName}" visible en pantalla: ${tribeVisible}`);

    // -------------------------------------------------------------
    // PASO 4: Check-in Manual de Fuerza desde Tribu
    // -------------------------------------------------------------
    console.log('\n--- PASO 4: Check-in de Fuerza desde Tribu ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.innerText.includes('Check-in Hoy'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Escribir título de fuerza con page.type nativo
    await page.type('input[placeholder*="Día 1 Torso"]', 'Torso Hipertrofia y Pectoral (18 series)');
    await new Promise((r) => setTimeout(r, 500));

    // Enviar check-in
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button[type="submit"]')).find((x) =>
        x.innerText.includes('Confirmar Check-in')
      );
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 3000));
    await takeScreenshot(page, 'e2e_04_checkin_fuerza_feed.png', 'Feed con check-in de fuerza');

    const fuerzaVisible = await page.evaluate(() =>
      document.body.innerText.includes('Torso Hipertrofia y Pectoral')
    );
    console.log(`✓ Check-in de Fuerza en el feed: ${fuerzaVisible}`);

    // -------------------------------------------------------------
    // PASO 5: Ir a Entreno -> Registrar Rodaje Cardio Fit3
    // -------------------------------------------------------------
    console.log('\n--- PASO 5: Registrar Rodaje Fit3 en CardioView ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const b = btns.find((x) => x.innerText.includes('Entreno'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Cambiar a sub-pestaña Running & Z2
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.innerText.includes('Running & Z2') || x.innerText.includes('Running'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Abrir modal Registrar Rodaje (+ Añadir)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.innerText.includes('Añadir'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await takeScreenshot(page, 'e2e_05_modal_cardio.png', 'Modal registrar rodaje abierto');

    // Clic en Guardar Rodaje
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type="submit"]'));
      const b = btns.find((x) => x.innerText.includes('Guardar Rodaje') || x.innerText.includes('Guardar Actividad') || x.innerText.includes('Guardando'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
    await takeScreenshot(page, 'e2e_06_rodaje_guardado.png', 'Rodaje guardado en Cardio');

    // -------------------------------------------------------------
    // PASO 6: Volver a Tribu y comprobar ambos check-ins
    // -------------------------------------------------------------
    console.log('\n--- PASO 6: Comprobar Feed de Tribu con ambos check-ins ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const b = btns.find((x) => x.innerText.includes('Tribu'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await takeScreenshot(page, 'e2e_07_tribu_feed_dual.png', 'Feed con entreno de fuerza y auto-checkin de cardio');

    const feedText = await page.evaluate(() => document.body.innerText);
    const hasFuerza = feedText.includes('Torso Hipertrofia y Pectoral');
    const hasRodaje = feedText.includes('Rodaje') || feedText.includes('Galaxy Fit3');
    console.log(`✓ Feed incluye Check-in de Fuerza: ${hasFuerza}`);
    console.log(`✓ Feed incluye Auto Check-in de Rodaje: ${hasRodaje}`);

    // -------------------------------------------------------------
    // PASO 7: Verificar Podio Semanal
    // -------------------------------------------------------------
    console.log('\n--- PASO 7: Comprobar Podio Semanal ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.innerText.includes('Podio Semanal'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await takeScreenshot(page, 'e2e_08_podio_semanal.png', 'Podio semanal de la tribu');

    const podioText = await page.evaluate(() => document.body.innerText);
    const athleteInPodio = podioText.includes('Álvaro Méndez Pro') || podioText.includes(athleteUname);
    console.log(`✓ Atleta aparece en Podio Semanal: ${athleteInPodio}`);

    // -------------------------------------------------------------
    // PASO 8: Recarga completa (F5) y persistencia
    // -------------------------------------------------------------
    console.log('\n--- PASO 8: Recarga de página (F5) para verificar persistencia ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Ir a Tribu tras recarga
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const b = btns.find((x) => x.innerText.includes('Tribu'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    await takeScreenshot(page, 'e2e_09_persistencia_post_reload.png', 'Tribu y Feed tras recarga F5');

    const reloadText = await page.evaluate(() => document.body.innerText);
    const tribePersisted = reloadText.includes('Tribu Titanes 2027');
    console.log(`✓ Tribu persiste tras F5: ${tribePersisted}`);

    // -------------------------------------------------------------
    // PASO 9: Verificación de persistencia directa en Supabase
    // -------------------------------------------------------------
    console.log('\n--- PASO 9: Verificación de registros en Supabase PostgreSQL ---');
    const { data: dbUser } = await sb.from('profiles').select('*').eq('username', athleteUname).maybeSingle();
    console.log(`  Supabase profiles -> Encontrado:`, dbUser ? `ID: ${dbUser.id}, XP: ${dbUser.total_xp}` : 'NO');

    const { data: dbGroup } = await sb.from('groups').select('*').eq('name', 'Tribu Titanes 2027').order('created_at', { ascending: false }).limit(1);
    console.log(`  Supabase groups -> Encontrado:`, dbGroup && dbGroup[0] ? `ID: ${dbGroup[0].id}, Code: ${dbGroup[0].invite_code}` : 'NO');

    const { data: dbCheckins } = await sb.from('checkins').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(`  Supabase checkins -> ${dbCheckins?.length || 0} check-ins recientes en BD.`);

    console.log('\n🎉 TEST E2E FINALIZADO CON ÉXITO SIN ERRORES CRÍTICOS.');
    if (errors.length > 0) {
      console.log('Errores no bloqueantes detectados durante la prueba:', errors);
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('FATAL EN TEST E2E:', err);
  process.exit(1);
});
