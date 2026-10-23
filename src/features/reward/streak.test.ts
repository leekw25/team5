import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../../shared/date.ts';
import type { DayStatus } from '../../shared/types/contract.ts';
import { calcStreak } from './streak.ts';

const TODAY = '2026-10-19';

// { 며칠 전: 성공 수 } → DayStatus 목록
function statuses(counts: Record<number, number>, today = TODAY): DayStatus[] {
  return Object.entries(counts).map(([daysAgo, success_count]) => ({
    user_id: 'local-user',
    day_key: addDays(today, -Number(daysAgo)),
    success_count,
  }));
}

test('오늘이 아직 미완료면 어제부터 센다', () => {
  assert.equal(calcStreak(statuses({ 0: 2, 1: 3, 2: 3, 3: 3 }), TODAY), 3);
});

test('오늘 완수하면 오늘까지 포함한다', () => {
  assert.equal(calcStreak(statuses({ 0: 3, 1: 3, 2: 3 }), TODAY), 3);
});

test('중간에 하루라도 3개 미만이면 거기서 끊긴다', () => {
  assert.equal(calcStreak(statuses({ 1: 3, 2: 3, 3: 2, 4: 3, 5: 3 }), TODAY), 2);
});

test('미션이 없던 날도 끊김으로 본다', () => {
  assert.equal(calcStreak(statuses({ 1: 3, 3: 3 }), TODAY), 1);
});

test('어제와 오늘 모두 미완료면 0', () => {
  assert.equal(calcStreak(statuses({ 0: 1, 1: 0, 2: 3 }), TODAY), 0);
  assert.equal(calcStreak([], TODAY), 0);
});

test('월 경계를 넘어 이어서 센다', () => {
  assert.equal(calcStreak(statuses({ 0: 0, 1: 3, 2: 3, 3: 3 }, '2026-10-02'), '2026-10-02'), 3);
});

test('시연: 어제까지 10일 연속, 오늘 3/3이 되면 11일', () => {
  const tenDays = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 3]));
  assert.equal(calcStreak(statuses({ ...tenDays, 0: 2 }), TODAY), 10);
  assert.equal(calcStreak(statuses({ ...tenDays, 0: 3 }), TODAY), 11);
});
