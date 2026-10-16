// A-F04: 기록을 저장하고, 저장이 성공한 뒤에만 '기록이 바뀌었다' 이벤트를 보낸다.
// 저장소와 이벤트 함수를 받아서 쓰기 때문에 PC에서 가짜로 꽂아 테스트할 수 있다.
import type { HealthRecord, NewHealthRecord, RecordsChangedEvent, RecordsRepo } from '../../shared/types/contract.ts';

export type EmitFn = (event: Omit<RecordsChangedEvent, 'type'>) => void;

// 기록을 저장하고 저장된 기록을 돌려준다.
// - 저장이 실패하면 오류가 그대로 올라가고 이벤트는 보내지 않는다.
// - 이벤트는 날짜(day_key)마다 1번 보낸다. 보통은 오늘 하루라 1번이다.
export async function saveRecords(repo: RecordsRepo, emit: EmitFn, records: NewHealthRecord[]): Promise<HealthRecord[]> {
  if (records.length === 0) return [];
  const saved = await repo.insertMany(records);
  const idsByDay = new Map<string, string[]>();
  for (const record of saved) {
    idsByDay.set(record.day_key, [...(idsByDay.get(record.day_key) ?? []), record.id]);
  }
  for (const [day_key, record_ids] of idsByDay) {
    emit({ day_key, reason: 'created', record_ids });
  }
  return saved;
}
