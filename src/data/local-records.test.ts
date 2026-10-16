import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyPatch, buildRecord, createRecordsRepo, parseRecords, sortByOccurredAt } from './local-records.ts';
import type { KeyValueStorage } from './local-records.ts';
import { LOCAL_KEYS, LOCAL_USER_ID } from '../shared/types/contract.ts';
import type { HealthRecord, NewHealthRecord } from '../shared/types/contract.ts';

// 테스트용 가짜 저장소. 휴대폰 AsyncStorage 대신 메모리(Map)에 저장한다.
function makeStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
}

const lunch: NewHealthRecord = {
  occurred_at: '2026-10-06T03:30:00.000Z', // KST 12:30
  kind: 'meal',
  source: 'text',
  raw_text: '점심에 싸이버거 세트',
  foods: [{ name: '싸이버거', quantity: 1, unit: '개', kcal: 560, carb_g: 48, protein_g: 24, fat_g: 30, tags: ['fried'] }],
  exercises: [],
  water_ml: null,
  confidence: 0.9,
};

const breakfast: NewHealthRecord = {
  ...lunch,
  occurred_at: '2026-10-05T23:10:00.000Z', // KST 08:10, 같은 날(2026-10-06)
  raw_text: '아침에 사과 반 개',
  foods: [{ name: '사과', quantity: 0.5, unit: '개', kcal: 48, carb_g: 13, protein_g: 0.3, fat_g: 0.2, tags: [] }],
};

const lateNight: NewHealthRecord = {
  ...lunch,
  occurred_at: '2026-10-06T15:30:00.000Z', // KST 다음날 00:30 → 2026-10-07
  raw_text: '야식',
};

function makeRepo(storage = makeStorage()) {
  const repo = createRecordsRepo({ storage, randomUUID, now: () => new Date('2026-10-06T03:30:03.000Z') });
  return { repo, storage };
}

// ── 순수 함수 ──

test('parseRecords: 비어 있거나 깨진 JSON이면 빈 배열', () => {
  assert.deepEqual(parseRecords(null), []);
  assert.deepEqual(parseRecords(''), []);
  assert.deepEqual(parseRecords('{깨진 json'), []);
  assert.deepEqual(parseRecords('{"not":"array"}'), []);
});

test('sortByOccurredAt: occurred_at 오름차순, 원본은 그대로', () => {
  const a = { occurred_at: '2026-10-06T03:00:00.000Z' } as HealthRecord;
  const b = { occurred_at: '2026-10-06T01:00:00.000Z' } as HealthRecord;
  const input = [a, b];
  assert.deepEqual(sortByOccurredAt(input), [b, a]);
  assert.deepEqual(input, [a, b]);
});

test('buildRecord: id·user_id·day_key(KST)·created_at 을 채운다', () => {
  const built = buildRecord(lunch, 'id-1', new Date('2026-10-06T03:30:03.000Z'));
  assert.equal(built.id, 'id-1');
  assert.equal(built.user_id, LOCAL_USER_ID);
  assert.equal(built.day_key, '2026-10-06');
  assert.equal(built.created_at, '2026-10-06T03:30:03.000Z');
  assert.equal(built.raw_text, lunch.raw_text);
});

test('applyPatch: occurred_at 이 바뀌면 day_key 도 다시 계산', () => {
  const rec = buildRecord(lunch, 'id-1', new Date());
  const same = applyPatch(rec, { confidence: 0.5 });
  assert.equal(same.day_key, '2026-10-06');
  assert.equal(same.confidence, 0.5);
  const moved = applyPatch(rec, { occurred_at: '2026-10-06T15:30:00.000Z' });
  assert.equal(moved.day_key, '2026-10-07');
});

// ── 저장소(RecordsRepo) ──

test('insertMany: 필드를 채워 돌려주고 LOCAL_KEYS.records 에 JSON 배열로 저장', async () => {
  const { repo, storage } = makeRepo();
  const saved = await repo.insertMany([lunch, breakfast]);
  assert.equal(saved.length, 2);
  for (const r of saved) {
    assert.ok(r.id.length > 0);
    assert.equal(r.user_id, LOCAL_USER_ID);
    assert.equal(r.day_key, '2026-10-06');
    assert.equal(r.created_at, '2026-10-06T03:30:03.000Z');
  }
  assert.notEqual(saved[0].id, saved[1].id);
  const stored = JSON.parse(storage.map.get(LOCAL_KEYS.records) ?? '[]');
  assert.equal(stored.length, 2);
  assert.equal(stored[0].raw_text, lunch.raw_text);
});

test('listByDay: 그날 기록만 occurred_at 오름차순으로', async () => {
  const { repo } = makeRepo();
  await repo.insertMany([lunch]);
  await repo.insertMany([lateNight, breakfast]);
  const day = await repo.listByDay('2026-10-06');
  assert.deepEqual(
    day.map((r) => r.raw_text),
    ['아침에 사과 반 개', '점심에 싸이버거 세트'],
  );
  const next = await repo.listByDay('2026-10-07');
  assert.deepEqual(next.map((r) => r.raw_text), ['야식']);
  assert.deepEqual(await repo.listByDay('2026-01-01'), []);
});

test('update: 일부 필드만 바꾸고, 날짜가 바뀌면 다른 날로 이동', async () => {
  const { repo } = makeRepo();
  const [saved] = await repo.insertMany([lunch]);
  const updated = await repo.update(saved.id, { confidence: 0.4 });
  assert.equal(updated.id, saved.id);
  assert.equal(updated.confidence, 0.4);
  assert.equal(updated.raw_text, lunch.raw_text);

  await repo.update(saved.id, { occurred_at: '2026-10-06T15:30:00.000Z' });
  assert.deepEqual(await repo.listByDay('2026-10-06'), []);
  assert.equal((await repo.listByDay('2026-10-07')).length, 1);
});

test('update: 없는 id 는 오류', async () => {
  const { repo } = makeRepo();
  await assert.rejects(repo.update('없는-id', { confidence: 1 }));
});

test('remove: 지운 기록은 목록에서 사라진다', async () => {
  const { repo } = makeRepo();
  const [a, b] = await repo.insertMany([lunch, breakfast]);
  await repo.remove(a.id);
  const day = await repo.listByDay('2026-10-06');
  assert.deepEqual(day.map((r) => r.id), [b.id]);
  await repo.remove('없는-id'); // 없는 id 는 조용히 무시
  assert.equal((await repo.listByDay('2026-10-06')).length, 1);
});

test('앱을 껐다 켜도 남는다: 같은 저장소로 새 repo 를 만들어도 기록이 보인다', async () => {
  const storage = makeStorage();
  const first = makeRepo(storage).repo;
  await first.insertMany([lunch]);
  const second = makeRepo(storage).repo; // 앱 재시작을 흉내
  assert.equal((await second.listByDay('2026-10-06')).length, 1);
});

test('깨진 저장 데이터가 있어도 insertMany 가 멈추지 않는다', async () => {
  const storage = makeStorage();
  storage.map.set(LOCAL_KEYS.records, '{깨짐');
  const { repo } = makeRepo(storage);
  const saved = await repo.insertMany([lunch]);
  assert.equal(saved.length, 1);
  assert.equal((await repo.listByDay('2026-10-06')).length, 1);
});
