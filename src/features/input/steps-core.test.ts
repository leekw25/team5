import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildStepsRecord, syncSteps } from './steps-core.ts';
import type { EmitFn } from './save-core.ts';
import { createRecordsRepo } from '../../data/local-records.ts';
import type { KeyValueStorage } from '../../data/local-records.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 2026-10-06 12:40
const LATER = new Date('2026-10-06T10:00:00.000Z');

function setup() {
  const map = new Map<string, string>();
  const storage: KeyValueStorage = {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
  const repo = createRecordsRepo({ storage, randomUUID, now: () => NOW });
  const events: Parameters<EmitFn>[0][] = [];
  return { repo, events, emit: ((event) => events.push(event)) as EmitFn };
}

test('buildStepsRecord: walking, steps, source health, 소모 칼로리', () => {
  const record = buildStepsRecord(7000, NOW);
  assert.equal(record.source, 'health');
  assert.equal(record.exercises[0].code, 'walking');
  assert.equal(record.exercises[0].steps, 7000);
  assert.equal(record.exercises[0].kcal_burned, 280);
});

test('읽을 수 없는 환경(null)이나 0걸음은 아무것도 하지 않는다', async () => {
  const { repo, events, emit } = setup();
  assert.equal(await syncSteps(repo, emit, null, NOW), 'skipped');
  assert.equal(await syncSteps(repo, emit, 0, NOW), 'skipped');
  assert.equal(await syncSteps(repo, emit, Number.NaN, NOW), 'skipped');
  assert.deepEqual(await repo.listByDay('2026-10-06'), []);
  assert.equal(events.length, 0);
});

test('처음에는 만들고(created 이벤트), 걸음이 늘면 같은 기록을 덮어쓴다(updated 이벤트)', async () => {
  const { repo, events, emit } = setup();
  assert.equal(await syncSteps(repo, emit, 3000, NOW), 'created');
  assert.equal(await syncSteps(repo, emit, 5200, LATER), 'updated');
  const list = await repo.listByDay('2026-10-06');
  assert.equal(list.length, 1); // 하루 1개 유지
  assert.equal(list[0].exercises[0].steps, 5200);
  assert.deepEqual(events.map((e) => e.reason), ['created', 'updated']);
});

test('걸음 수가 같으면 바뀐 것이 없어 이벤트도 없다', async () => {
  const { repo, events, emit } = setup();
  await syncSteps(repo, emit, 3000, NOW);
  assert.equal(await syncSteps(repo, emit, 3000, LATER), 'unchanged');
  assert.equal(events.length, 1);
});

test('직접 입력한 걷기 기록(quick)은 건드리지 않는다', async () => {
  const { repo, emit } = setup();
  await repo.insertMany([{ ...buildStepsRecord(0, NOW), source: 'quick', exercises: [{ name: '걷기', code: 'walking', body_parts: [], duration_min: 30, kcal_burned: 100 }] }]);
  assert.equal(await syncSteps(repo, emit, 4000, NOW), 'created');
  assert.equal((await repo.listByDay('2026-10-06')).length, 2);
});

test('기록이 여러 개 생겨 있으면 하나만 남기고 정리한다', async () => {
  const { repo, events, emit } = setup();
  await repo.insertMany([buildStepsRecord(1000, NOW), buildStepsRecord(1500, NOW)]);
  assert.equal(await syncSteps(repo, emit, 2000, LATER), 'updated');
  const list = await repo.listByDay('2026-10-06');
  assert.equal(list.length, 1);
  assert.equal(list[0].exercises[0].steps, 2000);
  assert.deepEqual(events.map((e) => e.reason), ['deleted', 'updated']);
});
