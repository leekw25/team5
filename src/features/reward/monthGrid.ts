// 월간 달력의 칸 배치. 날짜 이동은 shared/date.ts의 addDays만 쓴다.
import { addDays } from '../../shared/date.ts';

export interface MonthGrid {
  monthKey: string; // 'YYYY-MM'
  first: string; // 그달 1일 dayKey
  last: string; // 그달 마지막 날 dayKey
  weeks: (string | null)[][]; // 일요일 시작, 7칸씩. 그달이 아닌 칸은 null
}

export const monthOf = (dayKey: string) => dayKey.slice(0, 7);

export function buildMonthGrid(monthKey: string): MonthGrid {
  const first = `${monthKey}-01`;
  const days: string[] = [];
  for (let day = first; monthOf(day) === monthKey; day = addDays(day, 1)) days.push(day);

  // dayKey는 시간대가 없는 날짜라, UTC 기준 요일이 곧 그 날짜의 요일이다(0 = 일요일)
  const leading = new Date(Date.parse(first)).getUTCDay();
  const cells: (string | null)[] = [...Array.from({ length: leading }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { monthKey, first, last: days[days.length - 1], weeks };
}

// '2026-10', -1 → '2026-09'
export function shiftMonth(monthKey: string, delta: -1 | 1): string {
  const grid = buildMonthGrid(monthKey);
  return monthOf(delta < 0 ? addDays(grid.first, -1) : addDays(grid.last, 1));
}
