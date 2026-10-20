// 다음 끼니 추천(순수 함수). 키가 없어도 동작하도록 기본 메뉴표에서 오늘 남은 단백질을 잘 채우는 메뉴를 고른다.
import type { FoodItem, FoodTag, HealthRecord } from '../shared/types/contract.ts';

export interface Suggestion {
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  tags: FoodTag[];
  reason: string;
}

// 영양값은 1인분 기준 대략치(식약처 영양성분 DB 수준의 흔한 값)
export const MENU: Omit<Suggestion, 'reason'>[] = [
  { name: '닭가슴살 샐러드', quantity: 1, unit: '그릇', kcal: 320, carb_g: 14, protein_g: 32, fat_g: 14, tags: [] },
  { name: '연어 포케', quantity: 1, unit: '그릇', kcal: 520, carb_g: 58, protein_g: 28, fat_g: 18, tags: [] },
  { name: '두부 김치찌개와 현미밥', quantity: 1, unit: '인분', kcal: 560, carb_g: 72, protein_g: 26, fat_g: 16, tags: [] },
  { name: '소고기 미역국과 잡곡밥', quantity: 1, unit: '인분', kcal: 520, carb_g: 70, protein_g: 24, fat_g: 12, tags: [] },
  { name: '그릭요거트와 견과류', quantity: 1, unit: '컵', kcal: 260, carb_g: 16, protein_g: 18, fat_g: 14, tags: ['snack'] },
  { name: '계란 2개와 고구마', quantity: 1, unit: '접시', kcal: 300, carb_g: 32, protein_g: 14, fat_g: 10, tags: [] },
  { name: '고등어구이 정식', quantity: 1, unit: '인분', kcal: 620, carb_g: 70, protein_g: 30, fat_g: 22, tags: [] },
  { name: '닭가슴살 포케', quantity: 1, unit: '그릇', kcal: 480, carb_g: 55, protein_g: 35, fat_g: 10, tags: [] },
  { name: '순두부찌개', quantity: 1, unit: '인분', kcal: 450, carb_g: 55, protein_g: 20, fat_g: 15, tags: [] },
  { name: '프로틴 쉐이크', quantity: 1, unit: '잔', kcal: 160, carb_g: 6, protein_g: 25, fat_g: 3, tags: [] },
  { name: '비빔밥', quantity: 1, unit: '그릇', kcal: 600, carb_g: 90, protein_g: 18, fat_g: 16, tags: [] },
  { name: '훈제오리 샐러드', quantity: 1, unit: '그릇', kcal: 420, carb_g: 16, protein_g: 26, fat_g: 28, tags: [] },
];

export const PROTEIN_GOAL_G = 30; // 기본 단백질 미션 목표(30g)와 맞춘다

export function todayTotals(records: HealthRecord[]) {
  const foods: FoodItem[] = records.flatMap((r) => r.foods);
  return {
    kcal: Math.round(foods.reduce((s, f) => s + f.kcal, 0)),
    protein_g: Math.round(foods.reduce((s, f) => s + f.protein_g, 0)),
    fried: foods.some((f) => f.tags.includes('fried')),
  };
}

// 남은 단백질을 채우면서 칼로리 대비 단백질이 높은 순으로 3개. 이미 단백질을 다 채웠으면 가벼운 메뉴 위주.
export function pickSuggestions(records: HealthRecord[], avoidTags: FoodTag[] = []): Suggestion[] {
  const t = todayTotals(records);
  const need = Math.max(0, PROTEIN_GOAL_G - t.protein_g);
  const pool = MENU.filter((m) => !m.tags.some((tag) => avoidTags.includes(tag)));
  const score = (m: (typeof MENU)[number]) => (need > 0 ? Math.min(m.protein_g, need) * 10 - m.kcal / 20 : -m.kcal);
  return [...pool]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .map((m) => ({
      ...m,
      reason: need > 0 ? `단백질 ${m.protein_g}g으로 남은 ${need}g을 ${m.protein_g >= need ? '한 번에 채워요' : '많이 채워요'}` : `오늘 단백질은 충분해요. ${m.kcal}kcal로 가볍게 먹어요`,
    }));
}

export function suggestPrompt(records: HealthRecord[]): string {
  const t = todayTotals(records);
  return [
    "너는 건강 기록 앱 '핏로그'의 코치 '지유'다. 사용자의 다음 끼니로 한국에서 쉽게 먹을 수 있는 메뉴 3개를 추천한다.",
    `오늘 지금까지: ${t.kcal}kcal, 단백질 ${t.protein_g}g. 하루 단백질 목표는 ${PROTEIN_GOAL_G}g.`,
    '각 메뉴는 1인분 기준 영양 추정치(kcal, carb_g, protein_g, fat_g)와 추천 이유(해요체 25자 이내)를 적는다. 튀김·가당 음료는 피한다.',
  ].join('\n');
}

export const SUGGEST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          kcal: { type: 'number' },
          carb_g: { type: 'number' },
          protein_g: { type: 'number' },
          fat_g: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['name', 'quantity', 'unit', 'kcal', 'carb_g', 'protein_g', 'fat_g', 'reason'],
      },
    },
  },
  required: ['items'],
};
