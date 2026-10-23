// A-F09 개발 도구의 계산 부분. 화면과 분리해 테스트한다.
// 저장소는 recordsRepo 의 함수(listByDay, insertMany, remove)로만 만진다.
import { addDays, toDayKey } from '../../shared/date.ts';
import { morningRecord } from '../../shared/mocks/demo.ts';
import type { HealthRecord, NewHealthRecord, RecordsRepo } from '../../shared/types/contract.ts';
import { resolveOccurredAt } from './parse-core.ts';
import type { EmitFn } from './save-core.ts';

// 최근 며칠 + 내일까지 날짜 목록(오래된 날 → 최근). 저장소에 '전체 조회'가 없어서 날짜 범위로 훑는다.
export const SCAN_DAYS_BACK = 14;
export function scanDayKeys(now: Date = new Date()): string[] {
  const today = toDayKey(now);
  const keys: string[] = [];
  for (let offset = -SCAN_DAYS_BACK; offset <= 1; offset += 1) keys.push(addDays(today, offset));
  return keys;
}

// 최근 기록을 최신 날짜 먼저로 모아 돌려준다.
export async function listRecent(repo: RecordsRepo, now: Date = new Date()): Promise<HealthRecord[]> {
  const days = await Promise.all(scanDayKeys(now).map((key) => repo.listByDay(key)));
  return days.reverse().flat();
}

// 시연용 아침 기록(demo.ts 의 morningRecord)을 '오늘 08:10' 기록으로 만든다.
export function buildMorningRecord(now: Date = new Date()): NewHealthRecord {
  return {
    occurred_at: resolveOccurredAt('08:10', 0, now),
    kind: morningRecord.kind,
    source: morningRecord.source,
    raw_text: morningRecord.raw_text,
    foods: morningRecord.foods,
    exercises: morningRecord.exercises,
    water_ml: morningRecord.water_ml,
    confidence: morningRecord.confidence,
  };
}

// 전체 초기화. 지운 날짜마다 이벤트를 1번씩 보내 타임라인이 비워지게 한다. 지운 개수를 돌려준다.
export async function clearAll(repo: RecordsRepo, emit: EmitFn, now: Date = new Date()): Promise<number> {
  const records = await listRecent(repo, now);
  const idsByDay = new Map<string, string[]>();
  for (const record of records) {
    await repo.remove(record.id);
    idsByDay.set(record.day_key, [...(idsByDay.get(record.day_key) ?? []), record.id]);
  }
  for (const [day_key, record_ids] of idsByDay) emit({ day_key, reason: 'deleted', record_ids });
  return records.length;
}
