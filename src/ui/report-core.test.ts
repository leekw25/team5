import assert from 'node:assert/strict';
import test from 'node:test';
import type { DailyMission, HealthRecord, MissionSlot } from '@/shared/types/contract';
import { mondayOf, summarizeWeek, weekDays } from './report-core.ts';

const meal = (protein_g: number, carb_g: number, fat_g: number, kcal: number) =>
  ({ kind: 'meal', foods: [{ name: 'x', quantity: 1, unit: '개', kcal, carb_g, protein_g, fat_g, tags: [] }], exercises: [], water_ml: null }) as unknown as HealthRecord;
// 그날 성공한 슬롯만 success 로 둔 미션 3개
const missions = (...ok: MissionSlot[]) =>
  (['diet', 'life', 'exercise'] as MissionSlot[]).map((slot) => ({ slot, status: ok.includes(slot) ? 'success' : 'in_progress' }) as DailyMission);
const full = () => missions('diet', 'life', 'exercise');

test('mondayOf는 그 주 월요일, 일요일은 앞 주 월요일', () => {
  assert.equal(mondayOf('2026-10-16'), '2026-10-12'); // 금
  assert.equal(mondayOf('2026-10-12'), '2026-10-12'); // 월
  assert.equal(mondayOf('2026-10-18'), '2026-10-12'); // 일
  assert.deepEqual(weekDays('2026-10-12').at(-1), '2026-10-18');
});

test('오늘 이후 날짜는 미션 총수·연속에서 빠진다', () => {
  const days = weekDays('2026-10-12').map((dayKey, i) => ({ dayKey, records: [], missions: i < 3 ? full() : [] }));
  const w = summarizeWeek(days, '2026-10-14'); // 수요일까지
  assert.equal(w.total, 9);
  assert.equal(w.done, 9);
  assert.equal(w.rate, 100);
  assert.equal(w.streak, 3);
  assert.equal(w.days[5].counted, false);
});

test('연속은 3/3이 끊기면 다시 센다', () => {
  const pattern = [full(), full(), missions('life'), full(), full(), full(), []];
  const w = summarizeWeek(weekDays('2026-10-12').map((dayKey, i) => ({ dayKey, records: [], missions: pattern[i] })), '2026-10-18');
  assert.equal(w.streak, 3);
  assert.equal(w.done, 3 * 5 + 1);
  assert.deepEqual(w.missionDays.map((m) => m.days), [5, 6, 5]);
  assert.deepEqual(w.missionDays.map((m) => m.slot), ['식단', '생활', '운동']);
});

test('탄단지 비율은 칼로리 기준이고 합이 100', () => {
  const w = summarizeWeek([{ dayKey: '2026-10-12', records: [meal(25, 50, 10, 390)], missions: [] }], '2026-10-12');
  // 탄 200 · 단 100 · 지 90 kcal
  assert.deepEqual(w.macroPct, { carb: 51, protein: 26, fat: 23 });
  assert.equal(w.avgKcal, 390);
});

test('기록이 없으면 0으로 나누지 않는다', () => {
  const w = summarizeWeek([{ dayKey: '2026-10-12', records: [], missions: [] }], '2026-10-12');
  assert.deepEqual(w.macroPct, { carb: 0, protein: 0, fat: 0 });
  assert.equal(w.avgKcal, 0);
});
