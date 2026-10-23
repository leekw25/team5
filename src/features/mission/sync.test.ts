import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, type KeyValueStorage } from '../../data/local.ts';
import { addDays } from '../../shared/date.ts';
import { calcStreak, STREAK_LOOKBACK_DAYS } from '../reward/streak.ts';
import { addMockMeal, mockMeal, removeLastRecord, seedDemo } from './demo.ts';
import { onCelebrate } from './missionEvents.ts';
import { syncDay, type DaySnapshot, type Repos } from './sync.ts';

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
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
function setup(): Repos {
  const { recordsRepo, missionsRepo } = createLocalStore(memoryStorage(), { newId: () => `id-${++idSeq}` });
  return { recordsRepo, missionsRepo };
}

function watchCelebrations() {
  const ids: string[] = [];
  const stop = onCelebrate((_day, missionIds) => ids.push(...missionIds));
  return { ids, stop };
}

const DAY = '2026-10-06';
const NOW = new Date('2026-10-06T03:30:05.000Z');
const done = (snapshot: DaySnapshot) => snapshot.missions.filter((m) => m.status === 'success').length;
const proteinOf = (snapshot: DaySnapshot) => snapshot.missions.find((m) => m.mission_code === 'protein_min');

test('처음 열면 고정 세트 3개를 배정하고, 동시에 여러 번 열어도 중복되지 않는다', async () => {
  const repos = setup();
  await Promise.all([syncDay(repos, DAY, NOW), syncDay(repos, DAY, NOW), syncDay(repos, DAY, NOW)]);
  const missions = await repos.missionsRepo.listByDay(DAY);
  assert.deepEqual(
    missions.map((m) => [m.mission_code, m.params]),
    [
      ['protein_min', { target_g: 30 }],
      ['water_min', { target_ml: 1500 }],
      ['squat_min', { target: 30 }],
    ],
  );
});

test('점심 기록 후 재판정하면 단백질만 성공으로 저장하고 폭죽은 한 번만', async () => {
  const repos = setup();
  const celebrations = watchCelebrations();
  await repos.recordsRepo.insertMany([mockMeal('morning', DAY)]);
  assert.equal(done(await syncDay(repos, DAY, NOW)), 0);

  let updates = 0;
  const update = repos.missionsRepo.update;
  repos.missionsRepo.update = (id, patch) => {
    updates += 1;
    return update(id, patch);
  };

  await repos.recordsRepo.insertMany([mockMeal('lunch', DAY)]);
  const after = await syncDay(repos, DAY, NOW);
  assert.equal(done(after), 1);
  assert.equal(updates, 1); // 바뀐 미션만 저장
  assert.deepEqual(after.newlySucceeded, [proteinOf(after)?.id]);
  assert.equal(proteinOf(after)?.achieved_at, NOW.toISOString());

  const again = await syncDay(repos, DAY, NOW); // 같은 기록으로 다시 판정
  assert.deepEqual(again.newlySucceeded, []);
  assert.equal(updates, 1);
  assert.deepEqual(celebrations.ids, after.newlySucceeded);
  celebrations.stop();
});

test('기록을 지우면 다시 진행 중으로 저장되고, 다시 성공해도 폭죽은 반복하지 않는다', async () => {
  const repos = setup();
  const celebrations = watchCelebrations();
  await repos.recordsRepo.insertMany([mockMeal('morning', DAY), mockMeal('lunch', DAY)]);
  const succeeded = await syncDay(repos, DAY, NOW);
  assert.equal(proteinOf(succeeded)?.status, 'success');

  await removeLastRecord(repos, DAY); // 점심 삭제
  const removed = await syncDay(repos, DAY, NOW);
  assert.equal(proteinOf(removed)?.status, 'in_progress');
  assert.equal(proteinOf(removed)?.achieved_at, null);

  await addMockMeal(repos, 'lunch', DAY);
  const readded = await syncDay(repos, DAY, NOW);
  assert.equal(proteinOf(readded)?.status, 'success');
  assert.equal(celebrations.ids.length, 1);
  celebrations.stop();
});

test('앱을 다시 켰을 때 이미 성공이던 미션은 지웠다 다시 성공해도 폭죽을 터뜨리지 않는다', async () => {
  const repos = setup();
  const celebrations = watchCelebrations();
  await repos.recordsRepo.insertMany([mockMeal('morning', DAY), mockMeal('lunch', DAY)]);
  // 이전 실행에서 이미 성공으로 저장된 상태(이번 실행에서는 아직 연출 기록이 없음)
  const [protein] = await repos.missionsRepo.assignIfEmpty(DAY, [{ slot: 'diet', mission_code: 'protein_min', params: { target_g: 30 } }]);
  await repos.missionsRepo.update(protein.id, { status: 'success', achieved_at: NOW.toISOString() });

  await syncDay(repos, DAY, NOW); // 앱을 켜고 처음 판정
  await removeLastRecord(repos, DAY);
  await syncDay(repos, DAY, NOW);
  await addMockMeal(repos, 'lunch', DAY);
  const readded = await syncDay(repos, DAY, NOW);
  assert.equal(proteinOf(readded)?.status, 'success');
  assert.deepEqual(celebrations.ids, []);
  celebrations.stop();
});

test('시연: 시드 → 점심 기록 한 번으로 2/3 → 3/3, 폭죽 1회, 연속 10일 → 11일', async () => {
  const repos = setup();
  const today = '2026-10-19';
  const now = new Date('2026-10-19T03:30:05.000Z');
  const streak = async () =>
    calcStreak(await repos.missionsRepo.listDayStatus(addDays(today, -STREAK_LOOKBACK_DAYS), today), today);
  const celebrations = watchCelebrations();

  await seedDemo(repos, today);
  const seeded = await syncDay(repos, today, now);
  assert.equal(done(seeded), 2);
  assert.deepEqual(seeded.newlySucceeded, []); // 시드 상태를 판정해도 바뀌는 것이 없다
  assert.deepEqual(
    seeded.results.map((r) => [r.mission.mission_code, r.current, r.status]),
    [
      ['protein_min', 12.9, 'in_progress'],
      ['water_min', 1500, 'success'],
      ['squat_min', 30, 'success'],
    ],
  );
  assert.equal(await streak(), 10);
  const older = await repos.missionsRepo.listDayStatus(addDays(today, -12), addDays(today, -11));
  assert.deepEqual(
    older.map((s) => s.success_count),
    [1, 2],
  );

  await addMockMeal(repos, 'lunch', today);
  const after = await syncDay(repos, today, now);
  assert.equal(done(after), 3);
  assert.deepEqual(celebrations.ids, [proteinOf(after)?.id]);
  assert.equal(await streak(), 11);
  celebrations.stop();
});

test('목업 기록은 같은 한국 시각으로 오늘 날짜에 옮겨진다', () => {
  assert.equal(mockMeal('lunch', '2026-10-19').occurred_at, '2026-10-19T03:30:00.000Z'); // KST 12:30
  assert.equal(mockMeal('morning', '2026-10-19').occurred_at, '2026-10-18T23:10:00.000Z'); // KST 08:10
});
