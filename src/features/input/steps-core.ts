// A-F12 걸음 수 자동 반영의 계산 부분. 오늘 걸음 수를 '하루 기록 1개'로 유지한다(없으면 만들고, 있으면 덮어쓴다).
import { toDayKey } from '../../shared/date.ts';
import type { NewHealthRecord, RecordsRepo } from '../../shared/types/contract.ts';
import { saveRecords } from './save-core.ts';
import type { EmitFn } from './save-core.ts';

// 걸음당 소모 칼로리(대략값)
export const KCAL_PER_STEP = 0.04;

export function buildStepsRecord(steps: number, now: Date): NewHealthRecord {
  return {
    occurred_at: now.toISOString(),
    kind: 'exercise',
    source: 'health',
    raw_text: null,
    foods: [],
    exercises: [{ name: '걷기', code: 'walking', body_parts: ['하체'], steps, kcal_burned: Math.round(steps * KCAL_PER_STEP) }],
    water_ml: null,
    confidence: 1,
  };
}

export type SyncOutcome = 'created' | 'updated' | 'unchanged' | 'skipped';

// steps 가 null 이면(읽을 수 없는 환경) 아무것도 하지 않는다.
export async function syncSteps(repo: RecordsRepo, emit: EmitFn, steps: number | null, now: Date = new Date()): Promise<SyncOutcome> {
  if (steps === null || !Number.isFinite(steps) || steps <= 0) return 'skipped';
  const rounded = Math.round(steps);
  const existing = (await repo.listByDay(toDayKey(now))).filter((r) => r.source === 'health');
  const record = buildStepsRecord(rounded, now);

  if (existing.length === 0) {
    await saveRecords(repo, emit, [record]);
    return 'created';
  }

  const [first, ...extras] = existing;
  // 하루 1개만 유지한다. 혹시 여러 개가 생겼다면 나머지는 지운다.
  for (const extra of extras) await repo.remove(extra.id);
  if (extras.length > 0) emit({ day_key: first.day_key, reason: 'deleted', record_ids: extras.map((e) => e.id) });

  if (first.exercises[0]?.steps === rounded) return extras.length > 0 ? 'updated' : 'unchanged';
  await repo.update(first.id, { exercises: record.exercises });
  emit({ day_key: first.day_key, reason: 'updated', record_ids: [first.id] });
  return 'updated';
}
