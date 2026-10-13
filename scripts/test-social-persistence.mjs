import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [key, ...vals] = line.trim().split('=');
  if (key && vals.length > 0) {
    env[key] = vals.join('=').trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const BASE_URL = 'http://localhost:3000';

async function runSocialEndToEndTests() {
  console.log('🚀 INICIANDO BATERÍA DE PRUEBAS DE PERSISTENCIA REAL CON SUPABASE\n');

  // 1. REGISTRO DE USUARIO
  console.log('1️⃣ Probando Registro Real de Usuario (/api/auth/register)...');
  const testUsername = 'alvaro_' + Date.now().toString().slice(-4);
  const regPayload = {
    username: testUsername,
    name: 'Álvaro IronMan',
    email: `${testUsername}@ironman.test`,
    bio: 'Preparando 21K 2027 a ritmo sub 5:00',
    targetRaceName: 'Media Maratón 21K 2027',
    weeklyWorkoutGoal: 5
  };

  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Fallo en registro: ${JSON.stringify(regData)}`);
  }
  const user = regData.data;
  console.log(`   ✅ Usuario registrado con éxito: @${user.username} (ID: ${user.id})`);

  // 2. VERIFICACIÓN DIRECTA EN SUPABASE (PROFILES)
  console.log('\n2️⃣ Verificando perfil directamente en Supabase (public.profiles)...');
  const { data: dbProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileErr || !dbProfile) {
    throw new Error(`Perfil no encontrado en Supabase: ${profileErr?.message}`);
  }
  console.log(`   ✅ Perfil confirmado en Supabase: ${dbProfile.display_name} (@${dbProfile.username})`);

  // 3. CREACIÓN DE TRIBU
  console.log('\n3️⃣ Probando Creación de Tribu (/api/groups)...');
  const groupPayload = {
    name: 'Titanes 21K Test',
    description: 'Tribu de preparación real para media maratón',
    avatarEmoji: '⚡'
  };

  const groupRes = await fetch(`${BASE_URL}/api/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-athlete-id': user.id
    },
    body: JSON.stringify(groupPayload)
  });

  const groupData = await groupRes.json();
  if (!groupRes.ok || !groupData.success) {
    throw new Error(`Fallo al crear tribu: ${JSON.stringify(groupData)}`);
  }
  const group = groupData.data;
  console.log(`   ✅ Tribu creada con éxito: "${group.name}" (Código: ${group.invite_code}, ID: ${group.id})`);

  // 4. VERIFICACIÓN DIRECTA EN SUPABASE (GROUPS & GROUP_MEMBERS)
  console.log('\n4️⃣ Verificando tribu y membresía en Supabase (public.groups & public.group_members)...');
  const { data: dbGroup, error: groupErr } = await supabase
    .from('groups')
    .select('*')
    .eq('id', group.id)
    .single();

  if (groupErr || !dbGroup) {
    throw new Error(`Tribu no encontrada en Supabase: ${groupErr?.message}`);
  }
  console.log(`   ✅ Tribu confirmada en Supabase: ${dbGroup.name} (invite_code: ${dbGroup.invite_code})`);

  const { data: dbMembers, error: memErr } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id);

  if (memErr || !dbMembers || dbMembers.length === 0) {
    throw new Error(`Membresía no encontrada en Supabase: ${memErr?.message}`);
  }
  console.log(`   ✅ Creador registrado como miembro ('${dbMembers[0].role}') en group_members.`);

  // 5. PUBLICACIÓN DE CHECK-IN DIARIO
  console.log('\n5️⃣ Probando Publicación de Check-in Real (/api/checkins)...');
  const checkinPayload = {
    activityType: 'running',
    title: 'Rodaje Progresivo 8.5K (142 bpm)',
    metricsSummary: {
      distance_km: 8.5,
      pace: '4:58/km',
      avg_hr: 142,
      duration_minutes: 42.2
    },
    hasPhoto: false,
    isGoldCheckin: false
  };

  const checkinRes = await fetch(`${BASE_URL}/api/checkins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-athlete-id': user.id
    },
    body: JSON.stringify(checkinPayload)
  });

  const checkinData = await checkinRes.json();
  if (!checkinRes.ok || !checkinData.success) {
    throw new Error(`Fallo al publicar check-in: ${JSON.stringify(checkinData)}`);
  }
  const checkin = checkinData.data;
  console.log(`   ✅ Check-in guardado: "${checkin.title}" (+${checkin.xpAwarded} XP)`);

  // 6. VERIFICACIÓN DIRECTA EN SUPABASE (CHECKINS)
  console.log('\n6️⃣ Verificando check-in en Supabase (public.checkins)...');
  const { data: dbCheckin, error: checkErr } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', checkin.id)
    .single();

  if (checkErr || !dbCheckin) {
    throw new Error(`Check-in no encontrado en Supabase: ${checkErr?.message}`);
  }
  console.log(`   ✅ Check-in confirmado en Supabase: "${dbCheckin.title}" (Tipo: ${dbCheckin.activity_type})`);

  // 7. CONSULTA DEL FEED DE LA TRIBU
  console.log('\n7️⃣ Consultando Feed de la Tribu (/api/groups/[id]/feed)...');
  const feedRes = await fetch(`${BASE_URL}/api/groups/${group.id}/feed`, {
    headers: { 'x-athlete-id': user.id }
  });
  const feedData = await feedRes.json();
  if (!feedRes.ok || !feedData.success) {
    throw new Error(`Fallo al consultar feed: ${JSON.stringify(feedData)}`);
  }
  console.log(`   ✅ Feed consultado con éxito: ${feedData.data.length} check-in(s) en la tribu.`);
  console.log(`   Detalle: ${feedData.data[0]?.athleteName}: "${feedData.data[0]?.title}"`);

  // 8. LISTADO DE TRIBUS DEL USUARIO
  console.log('\n8️⃣ Comprobando persistencia del listado de tribus (/api/groups)...');
  const myGroupsRes = await fetch(`${BASE_URL}/api/groups`, {
    headers: { 'x-athlete-id': user.id }
  });
  const myGroupsData = await myGroupsRes.json();
  if (!myGroupsRes.ok || !myGroupsData.success) {
    throw new Error(`Fallo al listar tribus: ${JSON.stringify(myGroupsData)}`);
  }
  const found = myGroupsData.data.find(g => g.id === group.id);
  if (!found) {
    throw new Error('La tribu creada no aparece en la lista de tribus del usuario.');
  }
  console.log(`   ✅ Tribu "${found.name}" recuperada correctamente con ${found.memberCount} miembro(s).`);

  console.log('\n🎉 TODAS LAS PRUEBAS DE PERSISTENCIA EN SUPABASE HAN PASADO SATISFACTORIAMENTE (100% OK)');
}

runSocialEndToEndTests().catch(err => {
  console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err);
  process.exit(1);
});
