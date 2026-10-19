// B-F09 연속 달성(스트릭). 미션 3개를 모두 완수한 날이 끊김 없이 이어진 일수.
// 오늘이 아직 완수 전이면 어제부터 센다(하루가 끝나기 전에는 끊긴 것이 아니므로).
import { addDays } from '../../shared/date.ts';
import type { DayStatus } from '../../shared/types/contract.ts';

export const MISSIONS_PER_DAY = 3;
// 스트릭을 셀 때 거슬러 올라가 읽는 기간(일). 이보다 긴 연속 기록은 이 값까지만 센다.
export const STREAK_LOOKBACK_DAYS = 366;

export const isComplete = (successCount: number) => successCount >= MISSIONS_PER_DAY;

export function calcStreak(statuses: DayStatus[], todayKey: string): number {
  const completeDays = new Set(statuses.filter((s) => isComplete(s.success_count)).map((s) => s.day_key));
  let day = completeDays.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (completeDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
