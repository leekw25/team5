import assert from 'node:assert/strict';
import test from 'node:test';
import type { DailyMission } from '../shared/types/contract.ts';
import { buildAlerts, kstTime, unreadCount } from './alerts-core.ts';

const m = (id: string, slot: DailyMission['slot'], at: string | null) =>
  ({ id, slot, mission_code: id, status: at ? 'success' : 'in_progress', achieved_at: at }) as DailyMission;
const titleOf = (x: DailyMission) => `${x.mission_code} 미션`;

test('kstTime: UTC → 한국 시각 HH:MM', () => {
  assert.equal(kstTime('2026-10-29T00:00:00.000Z'), '09:00');
  assert.equal(kstTime('2026-10-28T15:30:00.000Z'), '00:30');
});

test('일부만 달성: 달성한 미션만, 최신이 위', () => {
  const list = buildAlerts([m('a', 'exercise', '2026-10-29T00:00:00Z'), m('b', 'life', '2026-10-29T01:00:00Z'), m('c', 'diet', null)], titleOf, 19);
  assert.deepEqual(list.map((x) => [x.time, x.title]), [['10:00', '생활 미션 달성'], ['09:00', '운동 미션 달성']]);
});

test('3개 모두 + 20일이면 완수·칭호 알림이 맨 위', () => {
  const list = buildAlerts([m('a', 'exercise', '2026-10-29T00:00:00Z'), m('b', 'life', '2026-10-29T01:00:00Z'), m('c', 'diet', '2026-10-29T03:30:00Z')], titleOf, 20);
  assert.deepEqual(list.slice(0, 3).map((x) => x.title), ['새 칭호 「루틴 비기너」 획득', '오늘 미션 모두 완수!', '식단 미션 달성']);
  assert.equal(list[0].time, '12:30');
  assert.equal(unreadCount(list, '2026-10-29T02:00:00Z'), 3);
  assert.equal(unreadCount(list, null), 5);
});
