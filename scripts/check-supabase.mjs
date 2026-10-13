import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parsear .env.local manualmente
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [key, ...vals] = line.trim().split('=');
  if (key && vals.length > 0) {
    env[key] = vals.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenciales de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Comprobando conexión a Supabase:', supabaseUrl);
  
  const tables = [
    'profiles',
    'groups',
    'group_members',
    'checkins',
    'checkin_reactions',
    'badges',
    'user_badges',
    'daily_health_metrics',
    'strava_activities',
    'gym_workout_logs',
    'nutrition_logs',
    'water_logs',
    'weight_logs'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Tabla '${table}': ERROR - ${error.message} (code: ${error.code})`);
    } else {
      console.log(`✅ Tabla '${table}': EXISTE (${data.length} filas leídas)`);
    }
  }
}

check().catch(console.error);
