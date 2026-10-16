// A-F05: 타임라인 카드에 보여 줄 글자를 만드는 순수 함수. 화면(React)과 분리해 테스트한다.
import { startOfDayIso, toDayKey } from '../../shared/date.ts';
import type { ExerciseItem, FoodItem, HealthRecord } from '../../shared/types/contract.ts';
import { LOW_CONFIDENCE } from './parse-core.ts';

// 카드 안의 한 줄: 음식 하나 또는 운동 하나
export interface CardItem {
  label: string; // '싸이버거 1개' / '스쿼트 3세트×15회'
  detail: string; // '560 kcal · 단백질 24g' / '40 kcal 소모'. 값이 있는 것만 붙는다
}

export interface CardView {
  id: string;
  time: string; // 'HH:MM' (한국 시각)
  title: string; // 음식·운동명
  kcalLabel: string; // '860 kcal' / '40 kcal 소모' / ''
  proteinLabel: string; // '단백질 28g' / ''
  items: CardItem[]; // 항목별 한 줄(물 기록은 비어 있다). 2개 이상이면 화면이 항목별로 나눠 보여 준다
  needsCheck: boolean; // 확신도가 낮아 '확인 필요' 표시
}

// ISO 시각 → 한국 시각 'HH:MM'. 한국 날짜 0시부터 지난 분으로 계산해 시간대 계산을 date.ts 에 맡긴다.
export function formatTime(occurredAt: string): string {
  const dayKey = toDayKey(new Date(occurredAt));
  const minutes = Math.floor((Date.parse(occurredAt) - Date.parse(startOfDayIso(dayKey))) / 60000);
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

// 양을 말한 음식만 '이름 100g' 처럼 양을 붙인다. 양이 없으면(quantity 0) 이름만 보여 준다.
function foodTitle(item: FoodItem): string {
  return item.quantity > 0 ? item.name + ' ' + round(item.quantity, 1) + item.unit : item.name;
}

function exerciseTitle(item: ExerciseItem): string {
  if (item.sets && item.reps) return item.name + ' ' + item.sets + '세트×' + item.reps + '회';
  if (item.reps) return item.name + ' ' + item.reps + '회';
  if (item.duration_min) return item.name + ' ' + item.duration_min + '분';
  if (item.steps) return item.name + ' ' + item.steps + '걸음';
  return item.name;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// 음식 하나의 영양 글. 칼로리는 항상(0 이어도 의미가 있다), 단백질은 있을 때만 붙인다.
function foodDetail(item: FoodItem): string {
  return round(item.kcal) + ' kcal' + (item.protein_g > 0 ? ' · 단백질 ' + round(item.protein_g, 1) + 'g' : '');
}

export function toCardView(record: HealthRecord): CardView {
  let title = '';
  let kcalLabel = '';
  let proteinLabel = '';
  let items: CardItem[] = [];
  if (record.kind === 'meal') {
    title = record.foods.map(foodTitle).join(', ');
    kcalLabel = round(record.foods.reduce((sum, f) => sum + f.kcal, 0)) + ' kcal';
    proteinLabel = '단백질 ' + round(record.foods.reduce((sum, f) => sum + f.protein_g, 0), 1) + 'g';
    items = record.foods.map((f) => ({ label: foodTitle(f), detail: foodDetail(f) }));
  } else if (record.kind === 'exercise') {
    title = record.exercises.map(exerciseTitle).join(', ');
    kcalLabel = round(record.exercises.reduce((sum, e) => sum + e.kcal_burned, 0)) + ' kcal 소모';
    items = record.exercises.map((e) => ({ label: exerciseTitle(e), detail: round(e.kcal_burned) + ' kcal 소모' }));
  } else {
    title = '물 ' + (record.water_ml ?? 0) + 'ml';
  }
  return {
    id: record.id,
    time: formatTime(record.occurred_at),
    title,
    kcalLabel,
    proteinLabel,
    items,
    needsCheck: record.confidence < LOW_CONFIDENCE,
  };
}
