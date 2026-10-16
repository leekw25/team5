import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QUICK_CHIPS } from './quick-core.ts';
import { saveRecords } from './save-core.ts';
import type { EmitFn } from './save-core.ts';
import { createRecordsRepo } from '../../data/local-records.ts';
import type { KeyValueStorage } from '../../data/local-records.ts';
import { toCardView } from './timeline-core.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 12:40

test('기본 칩 3개: 스쿼트, 푸시업, 걷기', () => {
  assert.deepEqual(QUICK_CHIPS.map((c) => c.label), ['스쿼트 15개×2세트', '푸시업 10개×2세트', '걷기 30분']);
});

test('칩이 만드는 기록: source quick, 운동 코드·세트·횟수, 지금 시각', () => {
  const [squat, pushup, walking] = QUICK_CHIPS.map((c) => c.build(NOW));
  for (const record of [squat, pushup, walking]) {
    assert.equal(record.source, 'quick');
    assert.equal(record.kind, 'exercise');
    assert.equal(record.occurred_at, NOW.toISOString());
    assert.equal(record.exercises.length, 1);
    assert.equal(record.confidence, 1);
  }
  assert.deepEqual([squat.exercises[0].code, squat.exercises[0].sets, squat.exercises[0].reps], ['squat', 2, 15]);
  assert.deepEqual([pushup.exercises[0].code, pushup.exercises[0].sets, pushup.exercises[0].reps], ['pushup', 2, 10]);
  assert.deepEqual([walking.exercises[0].code, walking.exercises[0].duration_min], ['walking', 30]);
});

test('칩 한 번 탭 = 저장 1번 + 이벤트 1번, 타임라인 카드로 보인다', async () => {
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
  await saveRecords(repo, (event) => events.push(event), [QUICK_CHIPS[0].build(NOW)]);
  assert.equal(events.length, 1);
  assert.equal(events[0].reason, 'created');
  const [saved] = await repo.listByDay(events[0].day_key);
  assert.equal(toCardView(saved).title, '스쿼트 2세트×15회');
});
