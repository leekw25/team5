import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildMorningRecord, clearAll, listRecent, scanDayKeys } from './dev-core.ts';
import type { EmitFn } from './save-core.ts';
import { createRecordsRepo } from '../../data/local-records.ts';
import type { KeyValueStorage } from '../../data/local-records.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 2026-10-06 12:40

function makeRepo() {
  const map = new Map<string, string>();
  const storage: KeyValueStorage = {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
  return createRecordsRepo({ storage, randomUUID, now: () => NOW });
}

test('scanDayKeys: 14일 전부터 내일까지 16일', () => {
  const keys = scanDayKeys(NOW);
  assert.equal(keys.length, 16);
  assert.equal(keys[0], '2026-09-22');
  assert.equal(keys[14], '2026-10-06');
  assert.equal(keys[15], '2026-10-07');
});

test('buildMorningRecord: 오늘 KST 08:10 의 아침 기록', () => {
  const record = buildMorningRecord(NOW);
  assert.equal(record.occurred_at, '2026-10-05T23:10:00.000Z');
  assert.equal(record.kind, 'meal');
  assert.deepEqual(record.foods.map((f) => f.name), ['사과', '삶은 계란']);
  assert.equal('id' in record, false);
});

test('listRecent: 최신 날짜 먼저, 같은 날은 시간순', async () => {
  const repo = makeRepo();
  const morning = buildMorningRecord(NOW);
  await repo.insertMany([{ ...morning, raw_text: '오늘 아침' }]);
  await repo.insertMany([{ ...morning, occurred_at: '2026-10-05T03:00:00.000Z', raw_text: '어제 점심' }]);
  const list = await listRecent(repo, NOW);
  assert.deepEqual(list.map((r) => r.raw_text), ['오늘 아침', '어제 점심']);
});

test('clearAll: 모두 지우고 날짜마다 deleted 이벤트 1번, 지운 개수를 돌려준다', async () => {
  const repo = makeRepo();
  const morning = buildMorningRecord(NOW);
  await repo.insertMany([morning, morning]);
  await repo.insertMany([{ ...morning, occurred_at: '2026-10-05T03:00:00.000Z' }]);
  const events: Parameters<EmitFn>[0][] = [];
  const removed = await clearAll(repo, (event) => events.push(event), NOW);
  assert.equal(removed, 3);
  assert.deepEqual((await listRecent(repo, NOW)), []);
  assert.deepEqual(events.map((e) => [e.day_key, e.reason, e.record_ids.length]), [
    ['2026-10-06', 'deleted', 2],
    ['2026-10-05', 'deleted', 1],
  ]);
});

test('clearAll: 지울 것이 없으면 이벤트도 없다', async () => {
  const events: Parameters<EmitFn>[0][] = [];
  assert.equal(await clearAll(makeRepo(), (event) => events.push(event), NOW), 0);
  assert.equal(events.length, 0);
});
