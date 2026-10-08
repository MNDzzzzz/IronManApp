// ====================================================================
// SUITE DE TESTS: MÓDULO SOCIAL, TRIBUS, CHECK-INS Y GAMIFICACIÓN (100% REAL)
// Proyecto: IronManApp (Apple Design & Privacy-First Architecture)
// Validación completa del ciclo de vida desde Estado Cero (Zero-State)
// ====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  registerAthleteProfile,
  loginAthlete,
  getUserProfile,
  getUserProfileByUsername,
  createSquadGroup,
  joinGroupByInviteCode,
  getUserGroups,
  registerWorkoutCheckIn,
  toggleCheckInReaction,
  getSquadFeed,
  getSquadLeaderboard,
  getMemberPublicSummary,
  generateInviteCode,
  resetSocialStore,
} from '../src/lib/socialManager';

import { GET as getAuthMe, POST as postAuthMe } from '../src/app/api/auth/me/route';
import { GET as getGroups, POST as postGroups } from '../src/app/api/groups/route';
import { POST as postJoinGroup } from '../src/app/api/groups/join/route';
import { GET as getFeed } from '../src/app/api/groups/[id]/feed/route';
import { GET as getLeaderboard } from '../src/app/api/groups/[id]/leaderboard/route';
import { GET as getMemberSummary } from '../src/app/api/groups/[id]/members/[userId]/route';
import { POST as postCheckin } from '../src/app/api/checkins/route';
import { POST as postReaction } from '../src/app/api/checkins/reactions/route';
import { POST as postVerifyPhoto } from '../src/app/api/checkins/verify-photo/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  if (body) {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest(url, {
    method,
  });
}

// Variables compartidas para el flujo de prueba
let testMasterAthleteId: string;
let testFriendAthleteId: string;
let testSquadGroupId: string;
let testCheckInId: string;

test('ESTADO CERO & REGISTRO REAL: Comienza vacío y registra perfiles auténticos', () => {
  resetSocialStore();

  // 1. Registro del atleta principal
  const master = registerAthleteProfile({
    name: 'Álvaro',
    username: 'alvaro_ironman',
    bio: 'Objetivo: Media Maratón 21K 2027 sub-2h. Disciplina de hierro.',
    weeklyGoal: 5,
    targetRaceName: 'Media Maratón 21K 2027',
  });

  assert.ok(master.id.startsWith('usr-'));
  assert.equal(master.username, 'alvaro_ironman');
  assert.equal(master.display_name, 'Álvaro');
  assert.equal(master.current_level, 1);
  assert.equal(master.total_xp, 0);
  assert.equal(master.current_streak_days, 0);
  testMasterAthleteId = master.id;

  // 2. Registro del compañero
  const friend = registerAthleteProfile({
    name: 'Elena',
    username: 'elena_triatlon',
    bio: 'Entrenando para triatlón olímpico y fondos.',
    weeklyGoal: 4,
  });

  assert.ok(friend.id.startsWith('usr-'));
  assert.equal(friend.username, 'elena_triatlon');
  testFriendAthleteId = friend.id;

  // 3. Login por username
  const loggedIn = loginAthlete('alvaro_ironman');
  assert.ok(loggedIn);
  assert.equal(loggedIn?.id, master.id);

  // 4. Validación de username estricto
  assert.throws(() => {
    registerAthleteProfile({ name: 'Invalido', username: 'us er con espacios' });
  }, /nombre de usuario debe tener entre 3 y 20 caracteres/);
});

test('PRIVACIDAD ESTRICTA: getMemberPublicSummary NUNCA expone datos íntimos de báscula, calorías o salud médica', () => {
  const summary = getMemberPublicSummary(testMasterAthleteId);
  assert.ok(summary, 'Debe devolver el resumen del atleta maestro');

  // Propiedades públicas válidas
  assert.equal(summary.username, 'alvaro_ironman');
  assert.equal(typeof summary.current_streak_days, 'number');
  assert.equal(typeof summary.weekly_adherence_pct, 'number');
  assert.equal(typeof summary.weekly_km_total, 'number');
  assert.equal(typeof summary.weekly_strength_sets, 'number');
  assert.ok(Array.isArray(summary.badges));
  assert.ok(Array.isArray(summary.recent_checkins));

  // VERIFICACIÓN ZERO-LEAKAGE: Ninguna de las propiedades privadas debe existir en el objeto
  const summaryKeys = Object.keys(summary);
  const forbiddenKeys = [
    'weight_kg',
    'body_fat_pct',
    'calories',
    'calories_consumed',
    'nutrition_logs',
    'daily_meals',
    'spo2_avg',
    'spo2_min',
    'resting_hr',
    'sleep_score',
    'deep_sleep_minutes',
  ];

  forbiddenKeys.forEach((key) => {
    assert.equal(
      summaryKeys.includes(key),
      false,
      `VIOLACIÓN DE PRIVACIDAD: La clave prohibida '${key}' no debe existir en MemberPublicSummary`
    );
  });
});

test('TRIBUS & INVITACIONES: Creación de grupo, código único de 6 caracteres y canje de invitación', () => {
  const code = generateInviteCode('TR');
  assert.ok(code.startsWith('TR'), 'El código debe comenzar con el prefijo');
  assert.equal(code.length, 6, 'Código con prefijo de 2 letras y 4 caracteres aleatorios (6 total)');

  const groupName = 'Runners del Retiro 21K';
  const newGroup = createSquadGroup(groupName, testMasterAthleteId, 'Grupo de entreno matutino', '⚡');

  assert.ok(newGroup.id.startsWith('grp-'));
  assert.equal(newGroup.name, groupName);
  assert.equal(newGroup.invite_code.length, 6);
  assert.equal(newGroup.avatar_emoji, '⚡');
  testSquadGroupId = newGroup.id;

  // El creador debe pertenecer al grupo
  const masterGroups = getUserGroups(testMasterAthleteId);
  assert.equal(masterGroups.length, 1);
  assert.equal(masterGroups[0].id, newGroup.id);

  // Unirse al grupo recién creado con el segundo usuario (Elena)
  const joinResult = joinGroupByInviteCode(newGroup.invite_code, testFriendAthleteId);
  assert.equal(joinResult.success, true);
  assert.ok(joinResult.group);
  assert.equal(joinResult.group?.members_count, 2);

  // Idempotencia: unirse de nuevo con el mismo usuario debe ser exitoso sin duplicar miembros
  const repeatJoin = joinGroupByInviteCode(newGroup.invite_code, testFriendAthleteId);
  assert.equal(repeatJoin.success, true);

  // Código inexistente debe fallar elegantemente
  const invalidJoin = joinGroupByInviteCode('INVALID_CODE_XYZ', testFriendAthleteId);
  assert.equal(invalidJoin.success, false);
});

test('CHECK-IN DUAL & XP: Check-in base otorga 100 XP y Check-in de Oro con foto otorga 150 XP', () => {
  const initialProfile = getUserProfile(testMasterAthleteId);
  const initialXP = initialProfile?.total_xp || 0;
  const initialStreak = initialProfile?.current_streak_days || 0;

  // 1. Check-in Base (sin foto)
  const baseCheckin = registerWorkoutCheckIn({
    userId: testMasterAthleteId,
    activityType: 'running',
    title: 'Rodaje 6K Ritmo Cómodo Z2',
    metrics: { distance_km: 6.0, duration_min: 34, avg_pace: '5:40 /km' },
    hasPhoto: false,
    isGoldCheckin: false,
  });

  assert.equal(baseCheckin.xp_awarded, 100, 'Check-in base debe otorgar 100 XP');
  assert.equal(baseCheckin.is_gold_checkin, false);
  testCheckInId = baseCheckin.id;

  const updatedProfile1 = getUserProfile(testMasterAthleteId);
  assert.equal(updatedProfile1?.total_xp, initialXP + 100);
  assert.equal(updatedProfile1?.current_streak_days, initialStreak + 1);

  // 2. Check-in de Oro (con foto de máquina validada)
  const goldCheckin = registerWorkoutCheckIn({
    userId: testMasterAthleteId,
    activityType: 'strength',
    title: 'Día 2: Pierna y Prensa Inclinada',
    metrics: { volume_sets: 14, muscle_groups: ['Cuádriceps', 'Isquios'] },
    hasPhoto: true,
    photoUrl: 'data:image/jpeg;base64,mock_photo_data',
    isGoldCheckin: true,
    geminiDetectedEquipment: 'Prensa de piernas 45 grados',
  });

  assert.equal(goldCheckin.xp_awarded, 150, 'Check-in de oro debe otorgar 150 XP (100 base + 50 bonus)');
  assert.equal(goldCheckin.is_gold_checkin, true);
  assert.equal(goldCheckin.gemini_verification_status, 'verified');

  const updatedProfile2 = getUserProfile(testMasterAthleteId);
  assert.equal(updatedProfile2?.total_xp, initialXP + 100 + 150);
});

test('REACCIONES HÁPTICAS: Alternar (toggle) reacciones en tarjetas de check-in sin duplicados', () => {
  const checkins = getSquadFeed(testSquadGroupId);
  assert.ok(checkins.length > 0, 'Debe haber check-ins en la tribu');
  const targetCheckin = checkins[0];

  // 1. Añadir reacción '🔥' de Elena
  const result1 = toggleCheckInReaction(targetCheckin.id, testFriendAthleteId, '🔥');
  assert.equal(result1.added, true, 'Debe haber añadido la reacción');
  const foundReaction = result1.checkin.reactions?.find(
    (r) => r.user_id === testFriendAthleteId && r.emoji === '🔥'
  );
  assert.ok(foundReaction, 'La reacción debe estar presente en la lista');

  // 2. Pulsar de nuevo el mismo emoji debe retirarlo (toggle off)
  const result2 = toggleCheckInReaction(targetCheckin.id, testFriendAthleteId, '🔥');
  assert.equal(result2.added, false, 'Debe haber retirado la reacción al pulsar de nuevo');
  const notFound = result2.checkin.reactions?.find(
    (r) => r.user_id === testFriendAthleteId && r.emoji === '🔥'
  );
  assert.equal(notFound, undefined, 'La reacción no debe existir tras el toggle');
});

test('LEADERBOARD SEMANAL: Clasificación ordenada por XP semanal y formato de podio', () => {
  const leaderboard = getSquadLeaderboard(testSquadGroupId, testMasterAthleteId);
  assert.ok(leaderboard.length >= 2, 'Debe contener los miembros de la tribu');

  // Comprobar orden descendente de XP semanal
  for (let i = 0; i < leaderboard.length - 1; i++) {
    assert.ok(
      leaderboard[i].weekly_xp >= leaderboard[i + 1].weekly_xp,
      'Los miembros deben estar ordenados de mayor a menor XP semanal'
    );
    assert.equal(leaderboard[i].rank, i + 1, 'Los rangos deben ser correlativos 1, 2...');
  }

  // Comprobar que el usuario activo está correctamente señalado
  const currentUserEntry = leaderboard.find((e) => e.user_id === testMasterAthleteId);
  assert.ok(currentUserEntry);
  assert.equal(currentUserEntry?.is_current_user, true);
});

test('API ROUTES SOCIALES: Verificación de contratos HTTP 200 y DTOs seguros', async () => {
  // 1. GET /api/auth/me (con ID explícito)
  const reqAuth = createMockRequest(`http://localhost:3000/api/auth/me?userId=${testMasterAthleteId}`);
  const resAuth = await getAuthMe(reqAuth);
  const dataAuth = await resAuth.json();
  assert.equal(resAuth.status, 200);
  assert.equal(dataAuth.success, true);
  assert.equal(dataAuth.data.username, 'alvaro_ironman');

  // 2. POST /api/auth/me (Registro de nuevo atleta vía API)
  const reqPostAuth = createMockRequest('http://localhost:3000/api/auth/me', 'POST', {
    name: 'Carlos Runner',
    username: 'carlos_speed',
    bio: 'Fondista 10K',
    weeklyGoal: 4,
  });
  const resPostAuth = await postAuthMe(reqPostAuth);
  const dataPostAuth = await resPostAuth.json();
  assert.equal(resPostAuth.status, 201);
  assert.equal(dataPostAuth.data.username, 'carlos_speed');

  // 3. GET /api/groups
  const reqGroups = createMockRequest(`http://localhost:3000/api/groups?userId=${testMasterAthleteId}`);
  const resGroups = await getGroups(reqGroups);
  const dataGroups = await resGroups.json();
  assert.equal(resGroups.status, 200);
  assert.ok(Array.isArray(dataGroups.data));

  // 4. GET /api/groups/[id]/feed
  const reqFeed = createMockRequest(`http://localhost:3000/api/groups/${testSquadGroupId}/feed`);
  const resFeed = await getFeed(reqFeed, { params: { id: testSquadGroupId } });
  const dataFeed = await resFeed.json();
  assert.equal(resFeed.status, 200);
  assert.ok(Array.isArray(dataFeed.data));

  // 5. GET /api/groups/[id]/leaderboard
  const reqLead = createMockRequest(`http://localhost:3000/api/groups/${testSquadGroupId}/leaderboard?userId=${testMasterAthleteId}`);
  const resLead = await getLeaderboard(reqLead, { params: { id: testSquadGroupId } });
  const dataLead = await resLead.json();
  assert.equal(resLead.status, 200);
  assert.ok(Array.isArray(dataLead.data));

  // 6. GET /api/groups/[id]/members/[userId] (Perfil no intrusivo)
  const reqMember = createMockRequest(`http://localhost:3000/api/groups/${testSquadGroupId}/members/${testMasterAthleteId}`);
  const resMember = await getMemberSummary(reqMember, {
    params: { id: testSquadGroupId, userId: testMasterAthleteId },
  });
  const dataMember = await resMember.json();
  assert.equal(resMember.status, 200);
  assert.equal(dataMember.data.username, 'alvaro_ironman');
  assert.equal(dataMember.data.weight_kg, undefined);
  assert.equal(dataMember.data.calories, undefined);

  // 7. POST /api/checkins
  const reqPostCheckin = createMockRequest('http://localhost:3000/api/checkins', 'POST', {
    userId: testMasterAthleteId,
    activityType: 'strength',
    title: 'Test Workout API Series',
    metrics: { volume_sets: 12 },
  });
  const resPostCheckin = await postCheckin(reqPostCheckin);
  const dataPostCheckin = await resPostCheckin.json();
  assert.equal(resPostCheckin.status, 201);
  assert.equal(dataPostCheckin.success, true);

  // 8. POST /api/checkins/reactions
  const reqPostReac = createMockRequest('http://localhost:3000/api/checkins/reactions', 'POST', {
    checkinId: dataPostCheckin.data.id,
    userId: testMasterAthleteId,
    emoji: '💪',
  });
  const resPostReac = await postReaction(reqPostReac);
  const dataPostReac = await resPostReac.json();
  assert.equal(resPostReac.status, 200);
  assert.equal(dataPostReac.success, true);

  // 9. POST /api/checkins/verify-photo (Fallback / Mock dev)
  const reqVerifyPhoto = createMockRequest('http://localhost:3000/api/checkins/verify-photo', 'POST', {
    imageBase64: 'mock_base64_gym_photo_data',
    mimeType: 'image/jpeg',
  });
  const resVerifyPhoto = await postVerifyPhoto(reqVerifyPhoto);
  const dataVerifyPhoto = await resVerifyPhoto.json();
  assert.equal(resVerifyPhoto.status, 200);
  assert.equal(dataVerifyPhoto.success, true);
  assert.equal(typeof dataVerifyPhoto.data.is_gym_equipment, 'boolean');
});
