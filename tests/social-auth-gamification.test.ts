// ====================================================================
// SUITE DE TESTS: MÓDULO SOCIAL, TRIBUS, CHECK-INS Y GAMIFICACIÓN
// Proyecto: IronManApp (Apple Design & Privacy-First Architecture)
// ====================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
  MASTER_ATHLETE_ID,
} from '../src/lib/socialManager';

import { GET as getAuthMe } from '../src/app/api/auth/me/route';
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

test('PRIVACIDAD ESTRICTA: getMemberPublicSummary NUNCA expone datos íntimos de báscula, calorías o salud médica', () => {
  const summary = getMemberPublicSummary(MASTER_ATHLETE_ID);
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
  assert.equal(code.length, 4, 'Código con prefijo de 2 letras y 2 caracteres aleatorios');

  const groupName = 'Runners del Retiro 21K';
  const newGroup = createSquadGroup(groupName, MASTER_ATHLETE_ID, 'Grupo de entreno matutino');

  assert.ok(newGroup.id.startsWith('grp-'));
  assert.equal(newGroup.name, groupName);
  assert.ok(newGroup.invite_code.length >= 4);

  // Unirse al grupo recién creado con otro usuario
  const testUserId = 'usr-test-runner-999';
  const joinResult = joinGroupByInviteCode(newGroup.invite_code, testUserId);

  assert.equal(joinResult.success, true);
  assert.ok(joinResult.group);

  // Idempotencia: unirse de nuevo con el mismo usuario debe ser exitoso sin duplicar
  const repeatJoin = joinGroupByInviteCode(newGroup.invite_code, testUserId);
  assert.equal(repeatJoin.success, true);

  // Código inexistente debe fallar elegantemente
  const invalidJoin = joinGroupByInviteCode('INVALID_CODE_XYZ', testUserId);
  assert.equal(invalidJoin.success, false);
});

test('CHECK-IN DUAL & XP: Check-in base otorga 100 XP y Check-in de Oro con foto otorga 150 XP', () => {
  const initialProfile = getUserProfile(MASTER_ATHLETE_ID);
  const initialXP = initialProfile?.total_xp || 0;
  const initialStreak = initialProfile?.current_streak_days || 0;

  // 1. Check-in Base (sin foto)
  const baseCheckin = registerWorkoutCheckIn({
    userId: MASTER_ATHLETE_ID,
    activityType: 'running',
    title: 'Rodaje 6K Ritmo Cómodo Z2',
    metrics: { distance_km: 6.0, duration_min: 34, avg_pace: '5:40 /km' },
    hasPhoto: false,
    isGoldCheckin: false,
  });

  assert.equal(baseCheckin.xp_awarded, 100, 'Check-in base debe otorgar 100 XP');
  assert.equal(baseCheckin.is_gold_checkin, false);

  const updatedProfile1 = getUserProfile(MASTER_ATHLETE_ID);
  assert.equal(updatedProfile1?.total_xp, initialXP + 100);
  assert.equal(updatedProfile1?.current_streak_days, initialStreak + 1);

  // 2. Check-in de Oro (con foto de máquina validada)
  const goldCheckin = registerWorkoutCheckIn({
    userId: MASTER_ATHLETE_ID,
    activityType: 'strength',
    title: 'Día 2: Pierna y Prensa Inclinada',
    metrics: { volume_sets: 14, muscle_groups: ['Cuádriceps', 'Isquios'] },
    hasPhoto: true,
    photoUrl: 'https://images.unsplash.com/gym-proof.jpg',
    isGoldCheckin: true,
    geminiDetectedEquipment: 'Prensa de piernas 45 grados',
  });

  assert.equal(goldCheckin.xp_awarded, 150, 'Check-in de oro debe otorgar 150 XP (100 base + 50 bonus)');
  assert.equal(goldCheckin.is_gold_checkin, true);
  assert.equal(goldCheckin.gemini_verification_status, 'verified');

  const updatedProfile2 = getUserProfile(MASTER_ATHLETE_ID);
  assert.equal(updatedProfile2?.total_xp, initialXP + 100 + 150);
});

test('REACCIONES HÁPTICAS: Alternar (toggle) reacciones en tarjetas de check-in sin duplicados', () => {
  const checkins = getSquadFeed('grp-ironman-21k-alpha');
  assert.ok(checkins.length > 0, 'Debe haber check-ins en la tribu');
  const targetCheckin = checkins[0];

  const testUser = 'usr-tester-react-01';

  // 1. Añadir reacción '🔥'
  const result1 = toggleCheckInReaction(targetCheckin.id, testUser, '🔥');
  assert.equal(result1.added, true, 'Debe haber añadido la reacción');
  const foundReaction = result1.checkin.reactions?.find(
    (r) => r.user_id === testUser && r.emoji === '🔥'
  );
  assert.ok(foundReaction, 'La reacción debe estar presente en la lista');

  // 2. Pulsar de nuevo el mismo emoji debe retirarlo (toggle off)
  const result2 = toggleCheckInReaction(targetCheckin.id, testUser, '🔥');
  assert.equal(result2.added, false, 'Debe haber retirado la reacción al pulsar de nuevo');
  const notFound = result2.checkin.reactions?.find(
    (r) => r.user_id === testUser && r.emoji === '🔥'
  );
  assert.equal(notFound, undefined, 'La reacción no debe existir tras el toggle');
});

test('LEADERBOARD SEMANAL: Clasificación ordenada por XP semanal y formato de podio', () => {
  const leaderboard = getSquadLeaderboard('grp-ironman-21k-alpha', MASTER_ATHLETE_ID);
  assert.ok(leaderboard.length >= 3, 'Debe contener los miembros de la tribu');

  // Comprobar orden descendente de XP semanal
  for (let i = 0; i < leaderboard.length - 1; i++) {
    assert.ok(
      leaderboard[i].weekly_xp >= leaderboard[i + 1].weekly_xp,
      'Los miembros deben estar ordenados de mayor a menor XP semanal'
    );
    assert.equal(leaderboard[i].rank, i + 1, 'Los rangos deben ser correlativos 1, 2, 3...');
  }

  // Comprobar que el usuario activo está correctamente señalado
  const currentUserEntry = leaderboard.find((e) => e.user_id === MASTER_ATHLETE_ID);
  assert.ok(currentUserEntry);
  assert.equal(currentUserEntry?.is_current_user, true);
});

test('API ROUTES SOCIALES: Verificación de contratos HTTP 200 y DTOs seguros', async () => {
  // 1. GET /api/auth/me
  const reqAuth = createMockRequest('http://localhost:3000/api/auth/me');
  const resAuth = await getAuthMe(reqAuth);
  const dataAuth = await resAuth.json();
  assert.equal(resAuth.status, 200);
  assert.equal(dataAuth.success, true);
  assert.equal(dataAuth.data.username, 'alvaro_ironman');

  // 2. GET /api/groups
  const reqGroups = createMockRequest('http://localhost:3000/api/groups');
  const resGroups = await getGroups(reqGroups);
  const dataGroups = await resGroups.json();
  assert.equal(resGroups.status, 200);
  assert.ok(Array.isArray(dataGroups.data));

  // 3. GET /api/groups/[id]/feed
  const reqFeed = createMockRequest('http://localhost:3000/api/groups/grp-ironman-21k-alpha/feed');
  const resFeed = await getFeed(reqFeed, { params: { id: 'grp-ironman-21k-alpha' } });
  const dataFeed = await resFeed.json();
  assert.equal(resFeed.status, 200);
  assert.ok(Array.isArray(dataFeed.data));

  // 4. GET /api/groups/[id]/leaderboard
  const reqLead = createMockRequest('http://localhost:3000/api/groups/grp-ironman-21k-alpha/leaderboard');
  const resLead = await getLeaderboard(reqLead, { params: { id: 'grp-ironman-21k-alpha' } });
  const dataLead = await resLead.json();
  assert.equal(resLead.status, 200);
  assert.ok(Array.isArray(dataLead.data));

  // 5. GET /api/groups/[id]/members/[userId] (Perfil no intrusivo)
  const reqMember = createMockRequest(`http://localhost:3000/api/groups/grp-ironman-21k-alpha/members/${MASTER_ATHLETE_ID}`);
  const resMember = await getMemberSummary(reqMember, {
    params: { id: 'grp-ironman-21k-alpha', userId: MASTER_ATHLETE_ID },
  });
  const dataMember = await resMember.json();
  assert.equal(resMember.status, 200);
  assert.equal(dataMember.data.username, 'alvaro_ironman');
  assert.equal(dataMember.data.weight_kg, undefined);
  assert.equal(dataMember.data.calories, undefined);

  // 6. POST /api/checkins
  const reqPostCheckin = createMockRequest('http://localhost:3000/api/checkins', 'POST', {
    activityType: 'strength',
    title: 'Test Workout API Series',
    metrics: { volume_sets: 12 },
  });
  const resPostCheckin = await postCheckin(reqPostCheckin);
  const dataPostCheckin = await resPostCheckin.json();
  assert.equal(resPostCheckin.status, 201);
  assert.equal(dataPostCheckin.success, true);

  // 7. POST /api/checkins/reactions
  const reqPostReac = createMockRequest('http://localhost:3000/api/checkins/reactions', 'POST', {
    checkinId: dataPostCheckin.data.id,
    userId: MASTER_ATHLETE_ID,
    emoji: '💪',
  });
  const resPostReac = await postReaction(reqPostReac);
  const dataPostReac = await resPostReac.json();
  assert.equal(resPostReac.status, 200);
  assert.equal(dataPostReac.success, true);

  // 8. POST /api/checkins/verify-photo (Fallback / Mock dev)
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
