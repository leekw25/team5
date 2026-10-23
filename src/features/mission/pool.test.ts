import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morningRecord } from '../../shared/mocks/demo.ts';
import type { DailyMission, HealthRecord, UserMission } from '../../shared/types/contract.ts';
import { evaluateMissions } from './evaluate.ts';
import { MISSIONS_200 } from './missions200.ts';
import { candidates, describe, pickDailySet, pickReroll, rerollsLeft } from './pool.ts';

const NOW = new Date('2026-10-06T03:30:05.000Z');
const DAY = morningRecord.day_key;
const mission = (fields: Partial<DailyMission>): DailyMission => ({
  id: 'm',
  user_id: 'u',
  day_key: DAY,
  slot: 'exercise',
  mission_code: 'm001',
  params: {},
  status: 'in_progress',
  achieved_at: null,
  checked_at: null,
  reroll_count: 0,
  title: null,
  ...fields,
});
const record = (fields: Partial<HealthRecord>): HealthRecord => ({ ...morningRecord, foods: [], exercises: [], water_ml: null, ...fields });
const mine: UserMission = { id: 'abc', user_id: 'u', slot: 'life', title: '영양제 먹기', created_at: NOW.toISOString() };
const seq = (...values: number[]) => () => values.shift() ?? 0;

test('기본 미션은 200개, 코드가 겹치지 않고 슬롯 3곳에 나뉜다', () => {
  assert.equal(MISSIONS_200.length, 200);
  assert.equal(new Set(MISSIONS_200.map((m) => m.code)).size, 200);
  for (const slot of ['diet', 'life', 'exercise'] as const) assert.ok(candidates(slot).length >= 40);
});

test('pickDailySet: 식단·생활·운동에서 하나씩, 사용자 미션도 후보', () => {
  const set = pickDailySet([mine], seq(0, 0.9999, 0));
  assert.deepEqual(set.map((m) => m.slot), ['diet', 'life', 'exercise']);
  assert.equal(set[1].mission_code, 'user:abc'); // 생활 후보의 맨 끝 = 사용자 미션
  assert.equal(set[1].title, '영양제 먹기');
});

test('pickReroll: 오늘 있는 미션은 빼고, 하루 5회를 넘으면 null', () => {
  const today = [mission({ id: 'a', slot: 'exercise', mission_code: 'm001' }), mission({ id: 'b', slot: 'diet', mission_code: 'm121' })];
  const next = pickReroll(today[0], today, [], seq(0));
  assert.notEqual(next?.mission_code, 'm001');
  assert.equal(next?.slot, 'exercise');
  const tired = [mission({ reroll_count: 3 }), mission({ reroll_count: 2 })];
  assert.equal(rerollsLeft(tired), 0);
  assert.equal(pickReroll(tired[0], tired, [], seq(0)), null);
});

test('자동 판정: 걸음 수 6,000보 미션(m001)', () => {
  const walk = (steps: number) => record({ kind: 'exercise', exercises: [{ name: '걷기', code: 'walking', body_parts: [], steps, kcal_burned: 0 }] });
  assert.equal(evaluateMissions([mission({})], [walk(4000)], NOW)[0].status, 'in_progress');
  const done = evaluateMissions([mission({})], [walk(4000), walk(2500)], NOW)[0];
  assert.equal(done.status, 'success');
  assert.equal(done.current, 6500);
  assert.equal(describe(mission({})).unit, '보');
});

test('피하기(m132 튀김 0회): 직접 체크해야 성공, 튀김을 먹었으면 체크해도 실패', () => {
  const avoid = mission({ slot: 'diet', mission_code: 'm132' });
  assert.equal(evaluateMissions([avoid], [], NOW)[0].status, 'in_progress');
  assert.equal(evaluateMissions([{ ...avoid, checked_at: NOW.toISOString() }], [], NOW)[0].status, 'success');
  const fried = record({ kind: 'meal', foods: [{ name: '치킨', quantity: 1, unit: '조각', kcal: 300, carb_g: 10, protein_g: 20, fat_g: 20, tags: ['fried'] }] });
  const result = evaluateMissions([{ ...avoid, checked_at: NOW.toISOString() }], [fried], NOW)[0];
  assert.equal(result.status, 'in_progress');
  assert.equal(result.violations, 1);
});

test('직접 체크형·사용자 미션: 체크하면 성공, 취소하면 다시 진행 중', () => {
  const stretch = mission({ slot: 'life', mission_code: 'm090' });
  const user = mission({ slot: 'life', mission_code: 'user:abc', title: '영양제 먹기' });
  assert.equal(evaluateMissions([stretch], [], NOW)[0].mode, 'check');
  assert.equal(evaluateMissions([{ ...user, checked_at: NOW.toISOString() }], [], NOW)[0].status, 'success');
  assert.equal(evaluateMissions([{ ...user, status: 'success', checked_at: null }], [], NOW)[0].status, 'in_progress');
  assert.equal(describe(user).title, '영양제 먹기');
});

test('수면 7시간(m161)·자정 전 취침(m162)은 수면 기록으로 판정', () => {
  const sleep = record({ kind: 'sleep', details: { sleep_min: 430, bed_time: '23:20', wake_time: '06:30' } });
  const [hours, bed] = evaluateMissions([mission({ slot: 'life', mission_code: 'm161' }), mission({ slot: 'life', mission_code: 'm162' })], [sleep], NOW);
  assert.equal(hours.status, 'success');
  assert.equal(bed.status, 'success');
  const late = record({ kind: 'sleep', details: { sleep_min: 300, bed_time: '01:30' } });
  assert.equal(evaluateMissions([mission({ slot: 'life', mission_code: 'm162' })], [late], NOW)[0].status, 'in_progress');
});
