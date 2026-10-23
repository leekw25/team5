import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveRecords } from './save-core.ts';
import type { EmitFn } from './save-core.ts';
import type { HealthRecord, NewHealthRecord, RecordsRepo } from '../../shared/types/contract.ts';

const base: NewHealthRecord = {
  occurred_at: '2026-10-06T03:30:00.000Z',
  kind: 'water',
  source: 'text',
  raw_text: '물 한 병',
  foods: [],
  exercises: [],
  water_ml: 500,
  confidence: 0.9,
};

// 가짜 저장소: 넣은 기록에 id 와 day_key 만 붙여 돌려준다.
function fakeRepo(options: { fail?: boolean } = {}): RecordsRepo {
  let n = 0;
  return {
    async listByDay() {
      return [];
    },
    async insertMany(records) {
      if (options.fail) throw new Error('저장 실패');
      return records.map((r): HealthRecord => {
        n += 1;
        return { ...r, id: 'id-' + n, user_id: 'local-user', day_key: r.occurred_at.slice(0, 10), created_at: '2026-10-06T03:30:03.000Z' };
      });
    },
    async update() {
      throw new Error('사용 안 함');
    },
    async remove() {},
  };
}

function recorder() {
  const events: Parameters<EmitFn>[0][] = [];
  const emit: EmitFn = (event) => {
    events.push(event);
  };
  return { events, emit };
}

test('저장 1번에 이벤트 1번: created, 그 날짜, 저장된 id 들', async () => {
  const { events, emit } = recorder();
  const saved = await saveRecords(fakeRepo(), emit, [base, { ...base, raw_text: '또 물' }]);
  assert.equal(saved.length, 2);
  assert.deepEqual(events, [{ day_key: '2026-10-06', reason: 'created', record_ids: ['id-1', 'id-2'] }]);
});

test('저장이 실패하면 이벤트가 없고 오류가 올라간다', async () => {
  const { events, emit } = recorder();
  await assert.rejects(saveRecords(fakeRepo({ fail: true }), emit, [base]));
  assert.equal(events.length, 0);
});

test('저장할 기록이 없으면 저장도 이벤트도 없다', async () => {
  const { events, emit } = recorder();
  assert.deepEqual(await saveRecords(fakeRepo(), emit, []), []);
  assert.equal(events.length, 0);
});

test('날짜가 둘이면 날짜마다 이벤트 1번씩', async () => {
  const { events, emit } = recorder();
  await saveRecords(fakeRepo(), emit, [base, { ...base, occurred_at: '2026-10-05T03:30:00.000Z' }]);
  assert.deepEqual(events.map((e) => e.day_key), ['2026-10-06', '2026-10-05']);
});
