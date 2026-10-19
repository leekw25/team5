import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthGrid, shiftMonth } from './monthGrid.ts';

test('2026년 10월은 목요일에 시작하는 31일, 5주', () => {
  const grid = buildMonthGrid('2026-10');
  assert.equal(grid.first, '2026-10-01');
  assert.equal(grid.last, '2026-10-31');
  assert.equal(grid.weeks.length, 5);
  assert.deepEqual(grid.weeks[0], [null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(
    grid.weeks.every((week) => week.length === 7),
    true,
  );
  assert.equal(grid.weeks.flat().filter(Boolean).length, 31);
});

test('2026년 2월은 일요일 시작 28일이라 딱 4주, 2028년 2월은 29일', () => {
  const feb = buildMonthGrid('2026-02');
  assert.equal(feb.weeks.length, 4);
  assert.equal(feb.weeks[0][0], '2026-02-01');
  assert.equal(buildMonthGrid('2028-02').last, '2028-02-29');
});

test('shiftMonth는 연도 경계를 넘는다', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-10', 1), '2026-11');
});
