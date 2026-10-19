// 로컬 JSON 저장소 구현(B-F04). AsyncStorage 같은 키-값 저장소를 받아 recordsRepo, missionsRepo를 만든다.
// React Native를 import하지 않아 node:test로 검증할 수 있다. 앱에서는 index.ts가 AsyncStorage를 넣어 쓴다.
import { toDayKey } from '../shared/date.ts';
import { LOCAL_KEYS, LOCAL_USER_ID } from '../shared/types/contract.ts';
import type { DailyMission, DayStatus, HealthRecord, MissionSlot, MissionsRepo, RecordsRepo } from '../shared/types/contract.ts';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface Deps {
  newId: () => string;
  now?: () => Date;
}

const SLOT_ORDER: MissionSlot[] = ['diet', 'life', 'exercise'];
const bySlot = (a: DailyMission, b: DailyMission) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);

export function createLocalStore(storage: KeyValueStorage, { newId, now = () => new Date() }: Deps) {
  // 읽고-고치고-쓰는 작업이 겹치면 한쪽 변경이 사라진다. 모든 작업을 한 줄로 세워 차례로 실행한다.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function read<T>(key: string): Promise<T[]> {
    const raw = await storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  }
  const write = <T>(key: string, rows: T[]) => storage.setItem(key, JSON.stringify(rows));

  const recordsRepo: RecordsRepo = {
    listByDay: (dayKey) =>
      serial(async () =>
        (await read<HealthRecord>(LOCAL_KEYS.records))
          .filter((record) => record.day_key === dayKey)
          .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)),
      ),

    insertMany: (records) =>
      serial(async () => {
        const rows = await read<HealthRecord>(LOCAL_KEYS.records);
        const created_at = now().toISOString();
        const inserted: HealthRecord[] = records.map((record) => ({
          ...record,
          id: newId(),
          user_id: LOCAL_USER_ID,
          day_key: toDayKey(new Date(record.occurred_at)),
          created_at,
        }));
        await write(LOCAL_KEYS.records, [...rows, ...inserted]);
        return inserted;
      }),

    update: (id, patch) =>
      serial(async () => {
        const rows = await read<HealthRecord>(LOCAL_KEYS.records);
        const index = rows.findIndex((record) => record.id === id);
        if (index < 0) throw new Error(`기록을 찾을 수 없습니다: ${id}`);
        const merged = { ...rows[index], ...patch };
        rows[index] = { ...merged, day_key: toDayKey(new Date(merged.occurred_at)) }; // 시각이 바뀌면 날짜도 다시 계산
        await write(LOCAL_KEYS.records, rows);
        return rows[index];
      }),

    remove: (id) =>
      serial(async () => {
        const rows = await read<HealthRecord>(LOCAL_KEYS.records);
        await write(
          LOCAL_KEYS.records,
          rows.filter((record) => record.id !== id),
        );
      }),
  };

  const missionsRepo: MissionsRepo = {
    listByDay: (dayKey) =>
      serial(async () =>
        (await read<DailyMission>(LOCAL_KEYS.daily_missions)).filter((mission) => mission.day_key === dayKey).sort(bySlot),
      ),

    assignIfEmpty: (dayKey, missions) =>
      serial(async () => {
        const rows = await read<DailyMission>(LOCAL_KEYS.daily_missions);
        const existing = rows.filter((mission) => mission.day_key === dayKey);
        // DB의 (user_id, day_key, slot) 유일 제약과 같게, 이미 있는 슬롯은 만들지도 덮어쓰지도 않는다(시연 시드 보호)
        const taken = new Set(existing.map((mission) => mission.slot));
        const created: DailyMission[] = [];
        for (const mission of missions) {
          if (taken.has(mission.slot)) continue;
          taken.add(mission.slot);
          created.push({
            id: newId(),
            user_id: LOCAL_USER_ID,
            day_key: dayKey,
            slot: mission.slot,
            mission_code: mission.mission_code,
            params: { ...mission.params },
            status: 'in_progress',
            achieved_at: null,
          });
        }
        if (created.length > 0) await write(LOCAL_KEYS.daily_missions, [...rows, ...created]);
        return [...existing, ...created].sort(bySlot);
      }),

    update: (id, patch) =>
      serial(async () => {
        const rows = await read<DailyMission>(LOCAL_KEYS.daily_missions);
        const index = rows.findIndex((mission) => mission.id === id);
        if (index < 0) throw new Error(`미션을 찾을 수 없습니다: ${id}`);
        rows[index] = { ...rows[index], status: patch.status, achieved_at: patch.achieved_at };
        await write(LOCAL_KEYS.daily_missions, rows);
        return rows[index];
      }),

    listDayStatus: (fromDayKey, toDayKey) =>
      serial(async () => {
        const counts = new Map<string, number>();
        for (const mission of await read<DailyMission>(LOCAL_KEYS.daily_missions)) {
          if (mission.day_key < fromDayKey || mission.day_key > toDayKey) continue;
          counts.set(mission.day_key, (counts.get(mission.day_key) ?? 0) + (mission.status === 'success' ? 1 : 0));
        }
        return [...counts.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day_key, success_count]): DayStatus => ({ user_id: LOCAL_USER_ID, day_key, success_count }));
      }),
  };

  // 아래 두 함수는 개발 도구 화면 전용(전체 초기화, 저장된 JSON 보기)
  const clearAll = () =>
    serial(async () => {
      await storage.removeItem(LOCAL_KEYS.records);
      await storage.removeItem(LOCAL_KEYS.daily_missions);
    });
  const readAll = () =>
    serial(async () => ({
      [LOCAL_KEYS.records]: await read<HealthRecord>(LOCAL_KEYS.records),
      [LOCAL_KEYS.daily_missions]: await read<DailyMission>(LOCAL_KEYS.daily_missions),
    }));

  return { recordsRepo, missionsRepo, clearAll, readAll };
}
