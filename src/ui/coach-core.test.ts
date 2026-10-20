import assert from 'node:assert/strict';
import test from 'node:test';
import type { DailyMission, HealthRecord } from '../shared/types/contract.ts';
import { buildFacts, coachPrompt, fallbackLine } from './coach-core.ts';

const mission = (title: string, ok: boolean) => ({ mission_code: title, status: ok ? 'success' : 'in_progress' }) as DailyMission;
const titles = (m: DailyMission) => m.mission_code;
const meal = (protein_g: number, created_at: string, raw_text: string) =>
  ({ kind: 'meal', foods: [{ name: 'x', quantity: 1, unit: '개', kcal: 300, carb_g: 30, protein_g, fat_g: 10, tags: [] }], exercises: [], water_ml: null, created_at, raw_text }) as unknown as HealthRecord;

test('buildFacts: 오늘 합계와 방금 기록한 문장', () => {
  const f = buildFacts([meal(12.6, '2026-10-20T00:00:00Z', '아침'), meal(28, '2026-10-20T03:00:00Z', '점심 닭가슴살')], [mission('단백질', true), mission('물', false)], titles, 19);
  assert.equal(f.protein_g, 41);
  assert.equal(f.kcal, 600);
  assert.equal(f.done, 1);
  assert.equal(f.last, '점심 닭가슴살');
  assert.ok(coachPrompt(f).includes('"streak":19'));
});

test('fallbackLine: 다 했을 때 / 하나 남았을 때 / 처음', () => {
  const base = { total: 3, kcal: 0, protein_g: 0, water_ml: 0, burned: 0, last: null, streak: 20 };
  assert.match(fallbackLine({ ...base, done: 3, missions: [] }), /모두 완수! 연속 20일째/);
  assert.match(fallbackLine({ ...base, done: 2, missions: [{ title: '물 1.5L', done: false }] }), /「물 1.5L」만 하면/);
  assert.match(fallbackLine({ ...base, done: 0, missions: [{ title: 'a', done: false }] }), /하나씩 같이/);
});
