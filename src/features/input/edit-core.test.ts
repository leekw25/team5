import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildOccurredAt, deleteRecord, itemCount, parseTimeInput, removeItem, updateRecord } from './edit-core.ts';
import type { EmitFn } from './save-core.ts';
import { createRecordsRepo } from '../../data/local-records.ts';
import type { KeyValueStorage } from '../../data/local-records.ts';
import type { NewHealthRecord, RecordsRepo } from '../../shared/types/contract.ts';

const NOW = new Date('2026-10-13T03:00:00.000Z');

const meal: NewHealthRecord = {
  occurred_at: '2026-10-12T23:00:00.000Z', // KST 10-13 08:00
  kind: 'meal',
  source: 'voice',
  raw_text: '아침',
  foods: [
    { name: '밥', quantity: 1, unit: '공기', kcal: 300, carb_g: 65, protein_g: 6, fat_g: 1, tags: [] },
    { name: '김치', quantity: 0, unit: '', kcal: 15, carb_g: 3, protein_g: 1, fat_g: 0.2, tags: [] },
    { name: '국', quantity: 1, unit: '공기', kcal: 150, carb_g: 10, protein_g: 12, fat_g: 6, tags: [] },
  ],
  exercises: [],
  water_ml: null,
  confidence: 0.9,
};

function setup(failOn?: 'update' | 'remove') {
  const map = new Map<string, string>();
  const storage: KeyValueStorage = {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
  const real = createRecordsRepo({ storage, randomUUID, now: () => NOW });
  const repo: RecordsRepo = {
    ...real,
    async update(id, patch) {
      if (failOn === 'update') throw new Error('수정 실패');
      return real.update(id, patch);
    },
    async remove(id) {
      if (failOn === 'remove') throw new Error('삭제 실패');
      return real.remove(id);
    },
  };
  const events: Parameters<EmitFn>[0][] = [];
  return { repo, events, emit: ((event) => events.push(event)) as EmitFn };
}

test('parseTimeInput: HH:MM, H:MM, HHMM 만 받고 범위를 벗어나면 null', () => {
  assert.deepEqual(parseTimeInput('08:30'), { hour: 8, minute: 30 });
  assert.deepEqual(parseTimeInput(' 8:05 '), { hour: 8, minute: 5 });
  assert.deepEqual(parseTimeInput('0830'), { hour: 8, minute: 30 });
  assert.deepEqual(parseTimeInput('830'), { hour: 8, minute: 30 });
  assert.equal(parseTimeInput('24:00'), null);
  assert.equal(parseTimeInput('12:60'), null);
  assert.equal(parseTimeInput('8:3'), null);
  assert.equal(parseTimeInput('아침'), null);
  assert.equal(parseTimeInput(''), null);
});

test('buildOccurredAt: 같은 날의 한국 시각을 ISO 로, 잘못된 값은 null', () => {
  assert.equal(buildOccurredAt('2026-10-13', '08:30'), '2026-10-12T23:30:00.000Z');
  assert.equal(buildOccurredAt('2026-10-13', '00:05'), '2026-10-12T15:05:00.000Z');
  assert.equal(buildOccurredAt('2026-10-13', '25:00'), null);
  assert.equal(buildOccurredAt('2026-10', '08:30'), null);
});

test('시간 변경: 저장된 기록이 바뀌고 updated 이벤트 1번, 같은 날이다', async () => {
  const { repo, events, emit } = setup();
  const [saved] = await repo.insertMany([meal]);
  const newAt = buildOccurredAt(saved.day_key, '07:15');
  assert.ok(newAt);
  const updated = await updateRecord(repo, emit, saved, { occurred_at: newAt });
  assert.equal(updated.occurred_at, '2026-10-12T22:15:00.000Z');
  assert.equal(updated.day_key, '2026-10-13');
  assert.deepEqual(events, [{ day_key: '2026-10-13', reason: 'updated', record_ids: [saved.id] }]);
  assert.equal((await repo.listByDay('2026-10-13'))[0].occurred_at, '2026-10-12T22:15:00.000Z');
});

test('날짜가 바뀌는 수정은 옛 날짜와 새 날짜 둘 다 이벤트를 받는다', async () => {
  const { repo, events, emit } = setup();
  const [saved] = await repo.insertMany([meal]);
  await updateRecord(repo, emit, saved, { occurred_at: '2026-10-13T15:30:00.000Z' }); // KST 다음날 00:30
  assert.deepEqual(events.map((e) => e.day_key), ['2026-10-14', '2026-10-13']);
});

test('수정이 실패하면 이벤트가 없고 오류가 올라간다', async () => {
  const { repo, events, emit } = setup('update');
  const [saved] = await repo.insertMany([meal]);
  await assert.rejects(updateRecord(repo, emit, saved, { confidence: 1 }));
  assert.equal(events.length, 0);
});

test('기록 삭제: 목록에서 사라지고 deleted 이벤트 1번', async () => {
  const { repo, events, emit } = setup();
  const [saved, other] = await repo.insertMany([meal, { ...meal, raw_text: '다른 기록' }]);
  await deleteRecord(repo, emit, saved);
  assert.deepEqual((await repo.listByDay('2026-10-13')).map((r) => r.id), [other.id]);
  assert.deepEqual(events, [{ day_key: '2026-10-13', reason: 'deleted', record_ids: [saved.id] }]);
});

test('삭제가 실패하면 이벤트가 없다', async () => {
  const { repo, events, emit } = setup('remove');
  const [saved] = await repo.insertMany([meal]);
  await assert.rejects(deleteRecord(repo, emit, saved));
  assert.equal(events.length, 0);
});

test('항목 삭제: 음식 하나만 빠지고 나머지는 그대로, 마지막 하나는 지울 수 없다', async () => {
  const { repo, events, emit } = setup();
  const [saved] = await repo.insertMany([meal]);
  assert.equal(itemCount(saved), 3);
  const after = await removeItem(repo, emit, saved, 1);
  assert.deepEqual(after?.foods.map((f) => f.name), ['밥', '국']);
  assert.equal(events.length, 1);

  const twoLeft = after as NonNullable<typeof after>;
  const oneLeft = await removeItem(repo, emit, twoLeft, 0);
  assert.deepEqual(oneLeft?.foods.map((f) => f.name), ['국']);

  const last = oneLeft as NonNullable<typeof oneLeft>;
  assert.equal(await removeItem(repo, emit, last, 0), null); // 하나뿐이면 기록 삭제를 쓰게 한다
  assert.equal(events.length, 2); // 막힌 시도는 이벤트가 없다
  assert.equal(await removeItem(repo, emit, twoLeft, 9), null); // 범위 밖 번호
});

test('운동 기록의 항목 삭제도 된다, 물 기록은 항목이 없다', async () => {
  const { repo, emit } = setup();
  const [exercise] = await repo.insertMany([
    {
      ...meal,
      kind: 'exercise',
      foods: [],
      exercises: [
        { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 2, reps: 15, kcal_burned: 12 },
        { name: '걷기', code: 'walking', body_parts: [], duration_min: 30, kcal_burned: 100 },
      ],
    },
  ]);
  const after = await removeItem(repo, emit, exercise, 0);
  assert.deepEqual(after?.exercises.map((e) => e.name), ['걷기']);
  const [water] = await repo.insertMany([{ ...meal, kind: 'water', foods: [], water_ml: 300 }]);
  assert.equal(itemCount(water), 0);
  assert.equal(await removeItem(repo, emit, water, 0), null);
});
