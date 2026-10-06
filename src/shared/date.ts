// 날짜 계산은 이 파일로만 한다. 기준은 Asia/Seoul.
// ponytail: 한국은 서머타임이 없어 UTC+9 고정으로 계산한다. 다른 시간대를 지원하려면 Intl로 바꾼다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Date → 'YYYY-MM-DD' (한국 날짜)
export function toDayKey(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// '2026-10-06', -1 → '2026-10-05'
export function addDays(dayKey: string, days: number): string {
  return new Date(Date.parse(dayKey) + days * DAY_MS).toISOString().slice(0, 10);
}

// 한국 시각 기준 그날 0시를 ISO로 (DB 조회 범위 등에 사용)
export function startOfDayIso(dayKey: string): string {
  return new Date(Date.parse(dayKey) - KST_OFFSET_MS).toISOString();
}
