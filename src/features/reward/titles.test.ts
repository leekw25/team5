import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays } from '../../shared/date.ts';
import type { DayStatus } from '../../shared/types/contract.ts';
import { bestStreak, nextTitle, STREAK_TITLES, titleFor } from './titles.ts';

const day = (day_key: string, success_count: number): DayStatus => ({ user_id: 'u', day_key, success_count });
const run = (start: string, n: number, count = 3) => Array.from({ length: n }, (_, i) => day(addDays(start, i), count));

test('칭호는 10일마다 30개, 300일까지', () => {
  assert.equal(STREAK_TITLES.length, 30);
  assert.deepEqual(STREAK_TITLES.map((t) => t.days), Array.from({ length: 30 }, (_, i) => (i + 1) * 10));
});

test('titleFor: 10일 미만은 없음, 경계값에서 바뀐다', () => {
  assert.equal(titleFor(0), null);
  assert.equal(titleFor(9), null);
  assert.equal(titleFor(10)?.name, '점화자');
  assert.equal(titleFor(19)?.name, '점화자');
  assert.equal(titleFor(100)?.name, '백일의 신화');
  assert.equal(titleFor(999)?.name, '리빙 레전드');
});

test('nextTitle: 다음 목표, 300일 이후는 없음', () => {
  assert.equal(nextTitle(0)?.days, 10);
  assert.equal(nextTitle(10)?.days, 20);
  assert.equal(nextTitle(300), null);
});

test('bestStreak: 끊긴 구간 중 가장 긴 연속, 3/3 미만 날은 끊김', () => {
  const statuses = [...run('2026-09-01', 12), day('2026-09-13', 2), ...run('2026-09-14', 5)];
  assert.equal(bestStreak(statuses), 12);
  assert.equal(bestStreak([]), 0);
});
