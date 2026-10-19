import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lunchParsed } from '../shared/mocks/demo.ts';
import { LOCAL_KEYS, LOCAL_USER_ID } from '../shared/types/contract.ts';
import type { NewDailyMission } from '../shared/types/contract.ts';
import { createLocalStore, type KeyValueStorage } from './local.ts';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

let idSeq = 0;
function setup(storage = memoryStorage()) {
  const store = createLocalStore(storage, { newId: () => `id-${++idSeq}`, now: () => new Date('2026-10-06T04:00:00.000Z') });
  return { storage, ...store };
}

const MISSIONS: NewDailyMission[] = [
  { slot: 'exercise', mission_code: 'squat_min', params: { target: 30 } },
  { slot: 'diet', mission_code: 'protein_min', params: { target_g: 30 } },
  { slot: 'life', mission_code: 'water_min', params: { target_ml: 1500 } },
];

test('insertMany는 id·user_id·day_key(한국 날짜)·created_at을 채운다', async () => {
  const { recordsRepo } = setup();
  const [saved] = await recordsRepo.insertMany([{ ...lunchParsed, occurred_at: '2026-10-06T15:30:00.000Z' }]); // KST 10-07 00:30
  assert.equal(saved.id.startsWith('id-'), true);
  assert.equal(saved.user_id, LOCAL_USER_ID);
  assert.equal(saved.day_key, '2026-10-07');
  assert.equal(saved.created_at, '2026-10-06T04:00:00.000Z');
  assert.deepEqual(saved.foods, lunchParsed.foods);
});

test('listByDay는 그날 기록만 시각 오름차순으로 돌려준다', async () => {
  const { recordsRepo } = setup();
  await recordsRepo.insertMany([
    { ...lunchParsed, occurred_at: '2026-10-06T05:00:00.000Z' },
    { ...lunchParsed, occurred_at: '2026-10-05T23:00:00.000Z' },
    { ...lunchParsed, occurred_at: '2026-10-07T03:00:00.000Z' }, // 다른 날
  ]);
  const list = await recordsRepo.listByDay('2026-10-06');
  assert.deepEqual(
    list.map((r) => r.occurred_at),
    ['2026-10-05T23:00:00.000Z', '2026-10-06T05:00:00.000Z'],
  );
});

test('기록 update는 바뀐 시각으로 day_key를 다시 계산하고, 없는 id는 오류', async () => {
  const { recordsRepo } = setup();
  const [saved] = await recordsRepo.insertMany([lunchParsed]);
  const updated = await recordsRepo.update(saved.id, { occurred_at: '2026-10-07T01:00:00.000Z', water_ml: 200 });
  assert.equal(updated.day_key, '2026-10-07');
  assert.equal(updated.water_ml, 200);
  assert.equal(updated.id, saved.id);
  await assert.rejects(recordsRepo.update('none', { water_ml: 1 }));
});

test('remove 후에는 목록에서 빠진다', async () => {
  const { recordsRepo } = setup();
  const [a, b] = await recordsRepo.insertMany([lunchParsed, lunchParsed]);
  await recordsRepo.remove(a.id);
  assert.deepEqual(
    (await recordsRepo.listByDay('2026-10-06')).map((r) => r.id),
    [b.id],
  );
});

test('JSON 배열로 LOCAL_KEYS에 contract 필드 이름 그대로 저장한다', async () => {
  const { storage, recordsRepo, missionsRepo } = setup();
  await recordsRepo.insertMany([lunchParsed]);
  await missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  const records = JSON.parse(storage.data.get(LOCAL_KEYS.records) ?? '');
  const missions = JSON.parse(storage.data.get(LOCAL_KEYS.daily_missions) ?? '');
  assert.equal(Array.isArray(records) && Array.isArray(missions), true);
  assert.deepEqual(Object.keys(missions[0]).sort(), ['achieved_at', 'day_key', 'id', 'mission_code', 'params', 'slot', 'status', 'user_id']);
  assert.equal(records[0].day_key, '2026-10-06');
});

test('assignIfEmpty는 여러 번(동시에) 불러도 미션을 중복으로 만들지 않는다', async () => {
  const { missionsRepo } = setup();
  await Promise.all([
    missionsRepo.assignIfEmpty('2026-10-06', MISSIONS),
    missionsRepo.assignIfEmpty('2026-10-06', MISSIONS),
    missionsRepo.assignIfEmpty('2026-10-06', MISSIONS),
  ]);
  await missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  const list = await missionsRepo.listByDay('2026-10-06');
  assert.equal(list.length, 3);
  assert.deepEqual(
    list.map((m) => m.slot),
    ['diet', 'life', 'exercise'],
  );
  assert.equal(
    list.every((m) => m.status === 'in_progress' && m.achieved_at === null && m.user_id === LOCAL_USER_ID),
    true,
  );
});

test('assignIfEmpty는 이미 있는 미션(시드)을 덮어쓰지 않고 그대로 돌려준다', async () => {
  const { missionsRepo } = setup();
  const [first] = await missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  await missionsRepo.update(first.id, { status: 'success', achieved_at: '2026-10-06T01:00:00.000Z' });
  const again = await missionsRepo.assignIfEmpty('2026-10-06', [{ slot: 'diet', mission_code: 'protein_min', params: { target_g: 60 } }]);
  assert.equal(again.length, 3);
  assert.equal(again[0].id, first.id);
  assert.equal(again[0].status, 'success');
  assert.deepEqual(again[0].params, { target_g: 30 });
});

test('missionsRepo.update는 상태를 저장하고, 없는 id는 오류', async () => {
  const { missionsRepo } = setup();
  const [mission] = await missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  const updated = await missionsRepo.update(mission.id, { status: 'success', achieved_at: '2026-10-06T03:30:00.000Z' });
  assert.equal(updated.status, 'success');
  assert.equal((await missionsRepo.listByDay('2026-10-06'))[0].achieved_at, '2026-10-06T03:30:00.000Z');
  await assert.rejects(missionsRepo.update('none', { status: 'success', achieved_at: null }));
});

test('listDayStatus는 기간(양 끝 포함) 안 날짜별 성공 수를 센다', async () => {
  const { missionsRepo } = setup();
  for (const day of ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']) {
    await missionsRepo.assignIfEmpty(day, MISSIONS);
  }
  const oct5 = await missionsRepo.listByDay('2026-10-05');
  await missionsRepo.update(oct5[0].id, { status: 'success', achieved_at: null });
  await missionsRepo.update(oct5[1].id, { status: 'success', achieved_at: null });
  for (const mission of await missionsRepo.listByDay('2026-10-06')) {
    await missionsRepo.update(mission.id, { status: 'success', achieved_at: null });
  }
  assert.deepEqual(await missionsRepo.listDayStatus('2026-10-05', '2026-10-06'), [
    { user_id: LOCAL_USER_ID, day_key: '2026-10-05', success_count: 2 },
    { user_id: LOCAL_USER_ID, day_key: '2026-10-06', success_count: 3 },
  ]);
  assert.equal((await missionsRepo.listDayStatus('2026-10-07', '2026-10-07'))[0].success_count, 0);
});

test('앱을 껐다 켜도(저장소 새로 생성) 데이터가 유지된다', async () => {
  const first = setup();
  await first.recordsRepo.insertMany([lunchParsed]);
  await first.missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  const second = setup(first.storage);
  assert.equal((await second.recordsRepo.listByDay('2026-10-06')).length, 1);
  assert.equal((await second.missionsRepo.listByDay('2026-10-06')).length, 3);
});

test('clearAll은 두 키를 모두 지운다', async () => {
  const { storage, recordsRepo, missionsRepo, clearAll } = setup();
  await recordsRepo.insertMany([lunchParsed]);
  await missionsRepo.assignIfEmpty('2026-10-06', MISSIONS);
  await clearAll();
  assert.equal(storage.data.size, 0);
});
