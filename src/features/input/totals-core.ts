// "오늘의 합계" 카드의 계산 부분. 그날 기록을 모두 더해 총 섭취 칼로리, 총 단백질, 총 운동 소모 칼로리를 구한다.
// 화면(React)과 분리한 순수 함수라 node:test 로 검사한다. 값은 AI가 추정한 수치의 합이다.
import type { HealthRecord } from '../../shared/types/contract.ts';

export interface DayTotals {
  intakeKcal: number | null; // 식사 기록이 하나도 없으면 null (그 칸을 보여 주지 않는다)
  proteinG: number | null; // 식사 기록이 하나도 없으면 null
  burnedKcal: number | null; // 운동 기록이 하나도 없으면 null
}

export interface TotalCell {
  label: string;
  value: string;
  unit: string;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function computeTotals(records: HealthRecord[]): DayTotals {
  const meals = records.filter((r) => r.kind === 'meal');
  const exercises = records.filter((r) => r.kind === 'exercise');
  const foods = meals.flatMap((r) => r.foods);
  const items = exercises.flatMap((r) => r.exercises);
  return {
    intakeKcal: meals.length > 0 ? round(foods.reduce((sum, f) => sum + f.kcal, 0)) : null,
    proteinG: meals.length > 0 ? round(foods.reduce((sum, f) => sum + f.protein_g, 0), 1) : null,
    burnedKcal: exercises.length > 0 ? round(items.reduce((sum, e) => sum + e.kcal_burned, 0)) : null,
  };
}

// 화면에 그릴 칸 목록. 값이 있는 칸만 만든다(입력한 정보만 보여 주는 원칙). 하나도 없으면 빈 배열.
export function toTotalCells(totals: DayTotals): TotalCell[] {
  const cells: TotalCell[] = [];
  if (totals.intakeKcal !== null) cells.push({ label: '섭취 칼로리', value: String(totals.intakeKcal), unit: 'kcal' });
  if (totals.proteinG !== null) cells.push({ label: '단백질', value: String(totals.proteinG), unit: 'g' });
  if (totals.burnedKcal !== null) cells.push({ label: '운동 소모', value: String(totals.burnedKcal), unit: 'kcal' });
  return cells;
}
