import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, toCardView } from './timeline-core.ts';
import type { HealthRecord } from '../../shared/types/contract.ts';

const common = { user_id: 'local-user', day_key: '2026-10-06', source: 'text' as const, raw_text: null, created_at: '2026-10-06T03:30:03.000Z' };

const lunch: HealthRecord = {
  ...common,
  id: 'a',
  occurred_at: '2026-10-06T03:30:00.000Z',
  kind: 'meal',
  foods: [
    { name: '싸이버거', quantity: 1, unit: '개', kcal: 560, carb_g: 48, protein_g: 24, fat_g: 30, tags: ['fried'] },
    { name: '감자튀김', quantity: 1, unit: '개', kcal: 300, carb_g: 38, protein_g: 4, fat_g: 15, tags: ['fried', 'snack'] },
    { name: '제로콜라', quantity: 1, unit: '잔', kcal: 0, carb_g: 0, protein_g: 0, fat_g: 0, tags: ['zero_sugar_drink', 'carbonated'] },
  ],
  exercises: [],
  water_ml: null,
  confidence: 0.9,
};

test('formatTime: 한국 시각 HH:MM, 자정 넘어가는 경우 포함', () => {
  assert.equal(formatTime('2026-10-06T03:30:00.000Z'), '12:30');
  assert.equal(formatTime('2026-10-05T23:10:00.000Z'), '08:10');
  assert.equal(formatTime('2026-10-06T15:05:00.000Z'), '00:05'); // KST 다음날 00:05
  assert.equal(formatTime('2026-10-06T14:59:00.000Z'), '23:59');
});

test('양을 말한 음식에만 양이 붙고, 말하지 않은 음식은 이름만 나온다', () => {
  const card = toCardView({
    ...lunch,
    foods: [
      { name: '닭가슴살스테이크', quantity: 100, unit: 'g', kcal: 180, carb_g: 2, protein_g: 26, fat_g: 7, tags: [] },
      { name: '찐양배추', quantity: 5, unit: '장', kcal: 30, carb_g: 6, protein_g: 2, fat_g: 0, tags: [] },
      { name: '사과', quantity: 0.5, unit: '개', kcal: 25, carb_g: 7, protein_g: 0, fat_g: 0, tags: [] },
      { name: '요거트', quantity: 0, unit: '', kcal: 100, carb_g: 12, protein_g: 5, fat_g: 3, tags: [] },
    ],
  });
  assert.equal(card.title, '닭가슴살스테이크 100g, 찐양배추 5장, 사과 0.5개, 요거트');
});

test('식사 카드: 음식명, 칼로리 합계, 단백질 합계', () => {
  const card = toCardView(lunch);
  assert.deepEqual(card, {
    id: 'a',
    time: '12:30',
    title: '싸이버거 1개, 감자튀김 1개, 제로콜라 1잔',
    kcalLabel: '860 kcal',
    proteinLabel: '단백질 28g',
    items: [
      { label: '싸이버거 1개', detail: '560 kcal · 단백질 24g' },
      { label: '감자튀김 1개', detail: '300 kcal · 단백질 4g' },
      { label: '제로콜라 1잔', detail: '0 kcal' }, // 단백질 0 은 붙이지 않는다
    ],
    needsCheck: false,
  });
});

test('항목별 줄: 양을 말한 음식에만 양이 붙고, 소수는 한 자리까지', () => {
  const card = toCardView({
    ...lunch,
    foods: [
      { name: '밥', quantity: 0.67, unit: '공기', kcal: 200.4, carb_g: 44, protein_g: 4.04, fat_g: 0.5, tags: [] },
      { name: '김치', quantity: 0, unit: '', kcal: 15, carb_g: 3, protein_g: 1, fat_g: 0.2, tags: [] },
    ],
  });
  assert.deepEqual(card.items, [
    { label: '밥 0.7공기', detail: '200 kcal · 단백질 4g' },
    { label: '김치', detail: '15 kcal · 단백질 1g' },
  ]);
});

test('운동·물 카드의 항목 줄: 운동은 항목별 소모 칼로리, 물은 항목 없음', () => {
  const exercise = toCardView({
    ...lunch,
    kind: 'exercise',
    foods: [],
    exercises: [
      { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 3, reps: 15, kcal_burned: 40 },
      { name: '걷기', code: 'walking', body_parts: [], duration_min: 30, kcal_burned: 100 },
    ],
  });
  assert.deepEqual(exercise.items, [
    { label: '스쿼트 3세트×15회', detail: '40 kcal 소모' },
    { label: '걷기 30분', detail: '100 kcal 소모' },
  ]);
  assert.deepEqual(toCardView({ ...lunch, kind: 'water', foods: [], water_ml: 300 }).items, []);
});

test('운동 카드: 세트×횟수, 소모 칼로리', () => {
  const card = toCardView({
    ...lunch,
    id: 'b',
    kind: 'exercise',
    foods: [],
    exercises: [
      { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 3, reps: 15, kcal_burned: 40 },
      { name: '걷기', code: 'walking', body_parts: [], duration_min: 30, kcal_burned: 100 },
    ],
  });
  assert.equal(card.title, '스쿼트 3세트×15회, 걷기 30분');
  assert.equal(card.kcalLabel, '140 kcal 소모');
  assert.equal(card.proteinLabel, '');
});

test('물 카드와 확인 필요 표시', () => {
  const card = toCardView({ ...lunch, id: 'c', kind: 'water', foods: [], water_ml: 500, confidence: 0.4 });
  assert.equal(card.title, '물 500ml');
  assert.equal(card.kcalLabel, '');
  assert.equal(card.needsCheck, true);
});
