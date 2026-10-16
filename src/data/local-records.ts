// 로컬 JSON 저장소의 실제 로직 (요구사항 A-F03).
// 휴대폰 저장소(AsyncStorage)를 직접 부르지 않고 "storage"로 받아서 쓴다.
// 그래야 PC의 node:test 에서 가짜 저장소를 꽂아 테스트할 수 있다. 진짜 저장소는 index.ts 에서 꽂는다.
import { toDayKey } from '../shared/date.ts';
import { LOCAL_KEYS, LOCAL_USER_ID } from '../shared/types/contract.ts';
import type { HealthRecord, NewHealthRecord, RecordsRepo } from '../shared/types/contract.ts';

// AsyncStorage 와 같은 모양의 최소 저장소. 문자열 하나를 키로 저장·조회한다.
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LocalRecordsDeps {
  storage: KeyValueStorage;
  randomUUID: () => string; // 앱에서는 expo-crypto, 테스트에서는 node:crypto
  now?: () => Date; // created_at 용. 테스트에서 시각을 고정할 때 넣는다
}

// ── 순수 함수 (React·저장소와 무관, 테스트 대상) ──

// 저장된 JSON 문자열 → 기록 배열. 비어 있거나 깨져 있으면 빈 배열(앱이 멈추지 않게).
export function parseRecords(json: string | null): HealthRecord[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as HealthRecord[]) : [];
  } catch {
    return [];
  }
}

// occurred_at 오름차순(먹거나 운동한 시각 순)으로 정렬한 새 배열
export function sortByOccurredAt(records: HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

// 새 기록에 id·user_id·day_key·created_at 을 채워 완성한다
export function buildRecord(input: NewHealthRecord, id: string, createdAt: Date): HealthRecord {
  return {
    ...input,
    id,
    user_id: LOCAL_USER_ID,
    day_key: toDayKey(new Date(input.occurred_at)),
    created_at: createdAt.toISOString(),
  };
}

// 기록 일부를 바꾼다. occurred_at 이 바뀌면 day_key 도 다시 계산한다.
export function applyPatch(record: HealthRecord, patch: Partial<NewHealthRecord>): HealthRecord {
  const next: HealthRecord = { ...record, ...patch };
  if (patch.occurred_at !== undefined) {
    next.day_key = toDayKey(new Date(patch.occurred_at));
  }
  return next;
}

// ── 저장소 만들기 ──

export function createRecordsRepo(deps: LocalRecordsDeps): RecordsRepo {
  const { storage, randomUUID } = deps;
  const now = deps.now ?? (() => new Date());

  async function readAll(): Promise<HealthRecord[]> {
    return parseRecords(await storage.getItem(LOCAL_KEYS.records));
  }

  async function writeAll(records: HealthRecord[]): Promise<void> {
    await storage.setItem(LOCAL_KEYS.records, JSON.stringify(records));
  }

  return {
    async listByDay(dayKey) {
      const all = await readAll();
      return sortByOccurredAt(all.filter((r) => r.day_key === dayKey));
    },

    async insertMany(records) {
      const createdAt = now();
      const built = records.map((r) => buildRecord(r, randomUUID(), createdAt));
      const all = await readAll();
      await writeAll([...all, ...built]);
      return built;
    },

    async update(id, patch) {
      const all = await readAll();
      const index = all.findIndex((r) => r.id === id);
      if (index < 0) throw new Error('기록을 찾을 수 없습니다: ' + id);
      const updated = applyPatch(all[index], patch);
      all[index] = updated;
      await writeAll(all);
      return updated;
    },

    async remove(id) {
      const all = await readAll();
      await writeAll(all.filter((r) => r.id !== id));
    },
  };
}
