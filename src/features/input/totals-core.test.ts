import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, toTotalCells } from './totals-core.ts';
import type { HealthRecord } from '../../shared/types/contract.ts';

const base = { user_id: 'local-user', day_key: '2026-10-13', source: 'text' as const, raw_text: null, created_at: '2026-10-13T03:00:00.000Z', occurred_at: '2026-10-13T03:00:00.000Z', confidence: 0.9, water_ml: null };

const breakfast: HealthRecord = {
  ...base,
  id: 'a',
  kind: 'meal',
  foods: [
    { name: '밥', quantity: 1, unit: '공기', kcal: 300, carb_g: 65, protein_g: 6, fat_g: 1, tags: [] },
    { name: '계란', quantity: 2, unit: '개', kcal: 155.4, carb_g: 1, protein_g: 12.64, fat_g: 10.6, tags: [] },
  ],
  exercises: [],
};
const lunch: HealthRecord = {
  ...base,
  id: 'b',
  kind: 'meal',
  foods: [{ name: '샐러드', quantity: 0, unit: '', kcal: 120, carb_g: 10, protein_g: 4.1, fat_g: 6, tags: [] }],
  exercises: [],
};
const workout: HealthRecord = {
  ...base,
  id: 'c',
  kind: 'exercise',
  foods: [],
  exercises: [
    { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 2, reps: 15, kcal_burned: 12 },
    { name: '걷기', code: 'walking', body_parts: [], duration_min: 30, kcal_burned: 100.4 },
  ],
};
const water: HealthRecord = { ...base, id: 'd', kind: 'water', foods: [], exercises: [], water_ml: 500 };

test('식사는 모두 더하고(칼로리는 정수, 단백질은 한 자리), 운동은 소모 칼로리를 더한다', () => {
  assert.deepEqual(computeTotals([breakfast, lunch, workout, water]), { intakeKcal: 575, proteinG: 22.7, burnedKcal: 112 });
});

test('식사만 있으면 소모 칼로리는 null, 운동만 있으면 섭취와 단백질이 null', () => {
  assert.deepEqual(computeTotals([breakfast]), { intakeKcal: 455, proteinG: 18.6, burnedKcal: null });
  assert.deepEqual(computeTotals([workout]), { intakeKcal: null, proteinG: null, burnedKcal: 112 });
});

test('기록이 없거나 물 기록뿐이면 모두 null', () => {
  assert.deepEqual(computeTotals([]), { intakeKcal: null, proteinG: null, burnedKcal: null });
  assert.deepEqual(computeTotals([water]), { intakeKcal: null, proteinG: null, burnedKcal: null });
});

test('칼로리가 0인 식사만 있어도 섭취 0 은 정보라서 보여 준다', () => {
  const zero: HealthRecord = { ...breakfast, id: 'z', foods: [{ name: '제로콜라', quantity: 1, unit: '잔', kcal: 0, carb_g: 0, protein_g: 0, fat_g: 0, tags: [] }] };
  assert.deepEqual(computeTotals([zero]), { intakeKcal: 0, proteinG: 0, burnedKcal: null });
});

test('toTotalCells: 값이 있는 칸만, 순서는 섭취·단백질·소모', () => {
  assert.deepEqual(toTotalCells({ intakeKcal: 575, proteinG: 22.7, burnedKcal: 112 }), [
    { label: '섭취 칼로리', value: '575', unit: 'kcal' },
    { label: '단백질', value: '22.7', unit: 'g' },
    { label: '운동 소모', value: '112', unit: 'kcal' },
  ]);
  assert.deepEqual(toTotalCells({ intakeKcal: null, proteinG: null, burnedKcal: 112 }), [{ label: '운동 소모', value: '112', unit: 'kcal' }]);
  assert.deepEqual(toTotalCells({ intakeKcal: null, proteinG: null, burnedKcal: null }), []);
});
