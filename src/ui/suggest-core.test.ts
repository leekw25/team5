import assert from 'node:assert/strict';
import test from 'node:test';
import type { HealthRecord } from '../shared/types/contract.ts';
import { pickSuggestions, todayTotals } from './suggest-core.ts';

const meal = (protein_g: number, kcal: number) =>
  ({ kind: 'meal', foods: [{ name: 'x', quantity: 1, unit: '개', kcal, carb_g: 10, protein_g, fat_g: 5, tags: [] }], exercises: [], water_ml: null }) as unknown as HealthRecord;

test('단백질이 모자라면 남은 양을 채우는 메뉴 3개', () => {
  const list = pickSuggestions([meal(12.9, 203)]);
  assert.equal(list.length, 3);
  assert.ok(list.every((m) => m.protein_g >= 17), JSON.stringify(list.map((m) => m.name)));
  assert.match(list[0].reason, /남은 17g/);
});

test('단백질을 다 채웠으면 가벼운(칼로리 낮은) 메뉴', () => {
  const list = pickSuggestions([meal(40, 600)]);
  assert.ok(list[0].kcal <= 300, list[0].name);
  assert.match(list[0].reason, /충분해요/);
});

test('피하기 태그(간식)는 빼고, 합계를 반올림해 센다', () => {
  assert.ok(pickSuggestions([], ['snack']).every((m) => !m.tags.includes('snack')));
  assert.deepEqual(todayTotals([meal(12.6, 203.4)]), { kcal: 203, protein_g: 13, fried: false });
});
