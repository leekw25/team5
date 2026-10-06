import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, startOfDayIso, toDayKey } from './date.ts';

test('한국 자정 직전·직후가 다른 날짜가 된다', () => {
  assert.equal(toDayKey(new Date('2026-10-06T14:59:59Z')), '2026-10-06'); // KST 23:59:59
  assert.equal(toDayKey(new Date('2026-10-06T15:00:00Z')), '2026-10-07'); // KST 00:00
});

test('addDays는 월·연도 경계를 넘는다', () => {
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('startOfDayIso는 한국 0시', () => {
  assert.equal(startOfDayIso('2026-10-06'), '2026-10-05T15:00:00.000Z');
});
