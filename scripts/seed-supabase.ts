/**
 * SCRIPT PARA POBLAR SUPABASE CON DATOS REALES DE IRONMANAPP
 * Inserta:
 * 1. Rutina de ejercicios de Gimnasio (Torso, Pierna, Full Body, Estiramientos)
 * 2. Registros reales de entrenamientos (21 Sept Torso, 22 Sept Pierna)
 * 3. Registros de nutrición reales (22 y 23 Septiembre)
 * 4. Registros de hidratación reales (22 y 23 Septiembre)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import {
  initialGymExercises,
  initialGymLogs,
  initialNutritionLogs,
  initialWaterLogs,
} from '../src/lib/mockStore';

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=');
      if (key && val && !process.env[key.trim()]) {
        process.env[key.trim()] = val.trim();
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('🚀 Iniciando volcado de datos iniciales en Supabase...');
  console.log(`🔗 URL: ${supabaseUrl}`);

  // 1. gym_exercises
  console.log(`\n1️⃣  Insertando ${initialGymExercises.length} ejercicios de gimnasio...`);
  const { error: exErr } = await supabase
    .from('gym_exercises')
    .upsert(initialGymExercises, { onConflict: 'id' });

  if (exErr) {
    console.error('❌ Error insertando ejercicios:', exErr.message);
  } else {
    console.log(`✅ Ejercicios insertados correctamente.`);
  }

  // 2. gym_workout_logs
  console.log(`\n2️⃣  Insertando ${initialGymLogs.length} logs de entrenamiento de gimnasio...`);
  const { error: logErr } = await supabase
    .from('gym_workout_logs')
    .upsert(initialGymLogs, { onConflict: 'id' });

  if (logErr) {
    console.error('❌ Error insertando logs de gimnasio:', logErr.message);
  } else {
    console.log(`✅ Logs de entrenamiento insertados correctamente.`);
  }

  // 3. nutrition_logs
  console.log(`\n3️⃣  Insertando ${initialNutritionLogs.length} registros de nutrición...`);
  const { error: nutErr } = await supabase
    .from('nutrition_logs')
    .upsert(initialNutritionLogs, { onConflict: 'id' });

  if (nutErr) {
    console.error('❌ Error insertando logs de nutrición:', nutErr.message);
  } else {
    console.log(`✅ Logs de nutrición insertados correctamente.`);
  }

  // 4. water_logs
  console.log(`\n4️⃣  Insertando ${initialWaterLogs.length} registros de agua...`);
  const { error: watErr } = await supabase
    .from('water_logs')
    .upsert(initialWaterLogs, { onConflict: 'id' });

  if (watErr) {
    console.error('❌ Error insertando logs de agua:', watErr.message);
  } else {
    console.log(`✅ Logs de hidratación insertados correctamente.`);
  }

  // Comprobar recuentos en base de datos
  console.log('\n📊 VERIFICACIÓN DE RECUENTOS EN SUPABASE:');
  const { count: cEx } = await supabase.from('gym_exercises').select('*', { count: 'exact', head: true });
  const { count: cLogs } = await supabase.from('gym_workout_logs').select('*', { count: 'exact', head: true });
  const { count: cNut } = await supabase.from('nutrition_logs').select('*', { count: 'exact', head: true });
  const { count: cWat } = await supabase.from('water_logs').select('*', { count: 'exact', head: true });

  console.log(`- gym_exercises: ${cEx} filas`);
  console.log(`- gym_workout_logs: ${cLogs} filas`);
  console.log(`- nutrition_logs: ${cNut} filas`);
  console.log(`- water_logs: ${cWat} filas`);

  console.log('\n✨ ¡Volcado de datos en Supabase completado con éxito!');
}

seed().catch((e) => {
  console.error('Error fatal al sembrar Supabase:', e);
  process.exit(1);
});
