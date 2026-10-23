// A-F07 빠른 기록 버튼: 한 번 누르면 AI 없이 바로 저장되는 기록(source: 'quick'). 운동·물·단백질 음식.
// 소모 칼로리는 대략적인 추정값이다. 판정에 쓰는 것은 name 이 아니라 code 와 sets, reps 이다.
import type { NewHealthRecord } from '../../shared/types/contract.ts';

export interface QuickChip {
  id: string;
  label: string;
  short: string; // 칩에 보이는 짧은 글
  build: (now: Date) => NewHealthRecord;
}

function waterRecord(label: string, now: Date, ml: number): NewHealthRecord {
  return { occurred_at: now.toISOString(), kind: 'water', source: 'quick', raw_text: label, foods: [], exercises: [], water_ml: ml, confidence: 1 };
}

// 영양값은 1회 제공량 대략치
function foodRecord(label: string, now: Date, food: NewHealthRecord['foods'][number]): NewHealthRecord {
  return { occurred_at: now.toISOString(), kind: 'meal', source: 'quick', raw_text: label, foods: [food], exercises: [], water_ml: null, confidence: 1 };
}

function exerciseRecord(label: string, now: Date, item: NewHealthRecord['exercises'][number]): NewHealthRecord {
  return {
    occurred_at: now.toISOString(),
    kind: 'exercise',
    source: 'quick',
    raw_text: label,
    foods: [],
    exercises: [item],
    water_ml: null,
    confidence: 1, // 사용자가 직접 고른 값이라 확실하다
  };
}

export const QUICK_CHIPS: QuickChip[] = [
  {
    id: 'squat',
    label: '스쿼트 15개×2세트',
    short: '스쿼트 15×2',
    build: (now) =>
      exerciseRecord('스쿼트 15개×2세트', now, { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 2, reps: 15, kcal_burned: 12 }),
  },
  {
    id: 'pushup',
    label: '푸시업 10개×2세트',
    short: '푸시업 10×2',
    build: (now) =>
      exerciseRecord('푸시업 10개×2세트', now, { name: '푸시업', code: 'pushup', body_parts: ['가슴', '팔'], sets: 2, reps: 10, kcal_burned: 10 }),
  },
  {
    id: 'walking',
    label: '걷기 30분',
    short: '걷기 30분',
    build: (now) =>
      exerciseRecord('걷기 30분', now, { name: '걷기', code: 'walking', body_parts: ['하체'], duration_min: 30, kcal_burned: 100 }),
  },
  // 미션 200개와 맞춘 추가 칩(가로로 밀어서 고른다)
  { id: 'water250', label: '물 한 컵(250ml)', short: '💧 물 250ml', build: (now) => waterRecord('물 한 컵', now, 250) },
  { id: 'water500', label: '물 한 병(500ml)', short: '💧 물 500ml', build: (now) => waterRecord('물 한 병', now, 500) },
  {
    id: 'protein_shake',
    label: '프로틴 쉐이크 한 잔',
    short: '🥤 프로틴 쉐이크',
    build: (now) => foodRecord('프로틴 쉐이크 한 잔', now, { name: '프로틴 쉐이크', quantity: 1, unit: '잔', kcal: 160, carb_g: 6, protein_g: 25, fat_g: 3, tags: [] }),
  },
  {
    id: 'eggs',
    label: '삶은 계란 2개',
    short: '🥚 계란 2개',
    build: (now) => foodRecord('삶은 계란 2개', now, { name: '삶은 계란', quantity: 2, unit: '개', kcal: 155, carb_g: 1, protein_g: 12.6, fat_g: 10.6, tags: [] }),
  },
  {
    id: 'chicken',
    label: '닭가슴살 100g',
    short: '🍗 닭가슴살 100g',
    build: (now) => foodRecord('닭가슴살 100g', now, { name: '닭가슴살', quantity: 100, unit: 'g', kcal: 110, carb_g: 0, protein_g: 23, fat_g: 1.2, tags: [] }),
  },
  {
    id: 'plank',
    label: '플랭크 1분',
    short: '플랭크 1분',
    build: (now) => exerciseRecord('플랭크 1분', now, { name: '플랭크', code: 'plank', body_parts: ['코어'], duration_min: 1, kcal_burned: 5 }),
  },
  {
    id: 'lunge',
    label: '런지 10개×2세트',
    short: '런지 10×2',
    build: (now) => exerciseRecord('런지 10개×2세트', now, { name: '런지', code: 'lunge', body_parts: ['하체'], sets: 2, reps: 10, kcal_burned: 10 }),
  },
  {
    id: 'stairs',
    label: '계단 5층 오르기',
    short: '계단 5층',
    build: (now) => exerciseRecord('계단 5층 오르기', now, { name: '계단 오르기', code: 'stairs', body_parts: ['하체'], sets: 1, reps: 5, kcal_burned: 15 }),
  },
  {
    id: 'jumping_jack',
    label: '팔벌려뛰기 20개×3세트',
    short: '팔벌려뛰기 20×3',
    build: (now) => exerciseRecord('팔벌려뛰기 20개×3세트', now, { name: '팔벌려뛰기', code: 'jumping_jack', body_parts: ['전신'], sets: 3, reps: 20, kcal_burned: 15 }),
  },
];
