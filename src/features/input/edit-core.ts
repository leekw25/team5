// A-F13 기록 수정·삭제의 핵심 로직. 화면(CardEditor)과 분리해 node:test 로 검사한다.
// 수정·삭제가 성공한 뒤에만 '기록이 바뀌었다' 이벤트를 보낸다(실패하면 이벤트 없음).
import type { HealthRecord, NewHealthRecord, RecordsRepo } from '../../shared/types/contract.ts';
import type { EmitFn } from './save-core.ts';

// 'HH:MM', 'H:MM', 'HHMM' → 시·분. 올바르지 않은 값이면 null
export function parseTimeInput(text: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour > 23 || minute > 59 ? null : { hour, minute };
}

// 같은 날(dayKey)의 한국 시각 'HH:MM' → ISO. 올바르지 않으면 null
export function buildOccurredAt(dayKey: string, timeText: string): string | null {
  const time = parseTimeInput(timeText);
  if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const hh = String(time.hour).padStart(2, '0');
  const mm = String(time.minute).padStart(2, '0');
  return new Date(dayKey + 'T' + hh + ':' + mm + ':00+09:00').toISOString();
}

// 기록의 항목(음식 또는 운동) 수. 물 기록은 0
export function itemCount(record: HealthRecord): number {
  return record.kind === 'meal' ? record.foods.length : record.kind === 'exercise' ? record.exercises.length : 0;
}

// 기록 일부를 고친다. 성공하면 updated 이벤트를 1번 보낸다(날짜가 바뀌었다면 옛 날짜에도 보낸다).
export async function updateRecord(repo: RecordsRepo, emit: EmitFn, record: HealthRecord, patch: Partial<NewHealthRecord>): Promise<HealthRecord> {
  const updated = await repo.update(record.id, patch);
  emit({ day_key: updated.day_key, reason: 'updated', record_ids: [updated.id] });
  if (record.day_key !== updated.day_key) emit({ day_key: record.day_key, reason: 'updated', record_ids: [updated.id] });
  return updated;
}

// 기록 하나를 지운다. 성공하면 deleted 이벤트를 1번 보낸다.
export async function deleteRecord(repo: RecordsRepo, emit: EmitFn, record: HealthRecord): Promise<void> {
  await repo.remove(record.id);
  emit({ day_key: record.day_key, reason: 'deleted', record_ids: [record.id] });
}

// 기록에서 항목(음식 또는 운동) 하나만 지운다. 항목이 1개뿐이면 기록이 비게 되므로 하지 않고 null (기록 삭제를 쓰게 한다).
export async function removeItem(repo: RecordsRepo, emit: EmitFn, record: HealthRecord, index: number): Promise<HealthRecord | null> {
  if (itemCount(record) < 2 || index < 0 || index >= itemCount(record)) return null;
  if (record.kind === 'meal') return updateRecord(repo, emit, record, { foods: record.foods.filter((_, i) => i !== index) });
  return updateRecord(repo, emit, record, { exercises: record.exercises.filter((_, i) => i !== index) });
}
