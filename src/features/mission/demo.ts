// B-F10 개발 도구용 시연 데이터. 저장소 약속(Repos)만 쓰므로 저장소가 Supabase로 바뀌어도 그대로 동작한다.
// 통합 앱에서는 멘토가 reset-demo.sql로 같은 상태를 만든다. 시드 내용은 docs/시연 시드.md에 적어 두었다.
import { addDays, startOfDayIso, toDayKey } from '../../shared/date.ts';
import { emitRecordsChanged } from '../../shared/events.ts';
import { demoMissions, lunchParsed, morningRecord } from '../../shared/mocks/demo.ts';
import type { HealthRecord, NewHealthRecord } from '../../shared/types/contract.ts';
import { TODAY_MISSION_SET } from './catalog.ts';
import { emitMissionsUpdated } from './missionEvents.ts';
import type { Repos } from './sync.ts';

export const DEMO_STREAK_DAYS = 10;
const HOUR_MS = 60 * 60 * 1000;

// 목업은 2026-10-06 기준이라, 같은 한국 시각 그대로 dayKey 날짜로 옮긴다.
function moveToDay(iso: string, dayKey: string): string {
  const sinceMidnight = Date.parse(iso) - Date.parse(startOfDayIso(toDayKey(new Date(iso))));
  return new Date(Date.parse(startOfDayIso(dayKey)) + sinceMidnight).toISOString();
}

// 한국 시각 hour시 정각
function atKstHour(dayKey: string, hour: number): string {
  return new Date(Date.parse(startOfDayIso(dayKey)) + hour * HOUR_MS).toISOString();
}

function toNew(record: HealthRecord): NewHealthRecord {
  const { occurred_at, kind, source, raw_text, foods, exercises, water_ml, confidence } = record;
  return { occurred_at, kind, source, raw_text, foods, exercises, water_ml, confidence };
}

export function mockMeal(which: 'morning' | 'lunch', dayKey: string): NewHealthRecord {
  const record = which === 'morning' ? toNew(morningRecord) : lunchParsed;
  return { ...record, occurred_at: moveToDay(record.occurred_at, dayKey) };
}

function quickRecord(mockIso: string, dayKey: string, fields: Pick<NewHealthRecord, 'kind' | 'exercises' | 'water_ml'>): NewHealthRecord {
  return { occurred_at: moveToDay(mockIso, dayKey), source: 'quick', raw_text: null, foods: [], confidence: 1, ...fields };
}

// 시드의 오늘 기록: 아침(단백질 12.9g) + 물 500ml + 스쿼트 15개×2세트 + 물 1,000ml.
// 시각은 demoMissions의 achieved_at(스쿼트 9시, 물 10시)과 맞춘다.
function seedTodayRecords(dayKey: string): NewHealthRecord[] {
  const squat = { name: '스쿼트', code: 'squat' as const, body_parts: ['하체'], sets: 2, reps: 15, kcal_burned: 15 };
  return [
    mockMeal('morning', dayKey), // 08:10
    quickRecord('2026-10-05T23:30:00.000Z', dayKey, { kind: 'water', exercises: [], water_ml: 500 }), // 08:30
    quickRecord('2026-10-06T00:00:00.000Z', dayKey, { kind: 'exercise', exercises: [squat], water_ml: null }), // 09:00
    quickRecord('2026-10-06T01:00:00.000Z', dayKey, { kind: 'water', exercises: [], water_ml: 1000 }), // 10:00
  ];
}

// 기록·미션이 한꺼번에 바뀌었음을 미션 카드와 달력에 알린다
export function announceDayChanged(dayKey: string, reason: 'created' | 'deleted', recordIds: string[]): void {
  emitRecordsChanged({ day_key: dayKey, reason, record_ids: recordIds });
  emitMissionsUpdated(dayKey);
}

// 빈 저장소에 시연 상태를 만든다: 어제까지 10일 연속 완수, 오늘 물·스쿼트 성공·단백질 진행 중(2/3).
// 그 이전 이틀은 1/3, 2/3으로 넣어 달력에서 링 상태를 모두 볼 수 있게 한다.
export async function seedDemo({ recordsRepo, missionsRepo }: Repos, todayKey: string): Promise<void> {
  // 날짜별 성공 수: 12일 전 1, 11일 전 2, 10일 전 ~ 어제 3
  const plan = [1, 2, ...Array.from({ length: DEMO_STREAK_DAYS }, () => 3)];
  for (const [index, successCount] of plan.entries()) {
    const day = addDays(todayKey, index - plan.length);
    const missions = await missionsRepo.assignIfEmpty(day, TODAY_MISSION_SET);
    for (const mission of missions.slice(0, successCount)) {
      await missionsRepo.update(mission.id, { status: 'success', achieved_at: atKstHour(day, 20) });
    }
  }

  const inserted = await recordsRepo.insertMany(seedTodayRecords(todayKey));
  const today = await missionsRepo.assignIfEmpty(todayKey, TODAY_MISSION_SET);
  for (const demo of demoMissions) {
    const mission = today.find((m) => m.slot === demo.slot);
    if (!mission || demo.status !== 'success' || !demo.achieved_at) continue;
    await missionsRepo.update(mission.id, { status: 'success', achieved_at: moveToDay(demo.achieved_at, todayKey) });
  }

  announceDayChanged(
    todayKey,
    'created',
    inserted.map((record) => record.id),
  );
}

// 목업 아침·점심 기록을 저장하고 이벤트를 보낸다(통합 후 입력 앱이 하는 일을 흉내 낸다)
export async function addMockMeal({ recordsRepo }: Repos, which: 'morning' | 'lunch', dayKey: string): Promise<HealthRecord> {
  const [record] = await recordsRepo.insertMany([mockMeal(which, dayKey)]);
  emitRecordsChanged({ day_key: dayKey, reason: 'created', record_ids: [record.id] });
  return record;
}

// 그날 가장 늦은 기록 하나를 지우고 이벤트를 보낸다. 지울 기록이 없으면 null.
export async function removeLastRecord({ recordsRepo }: Repos, dayKey: string): Promise<HealthRecord | null> {
  const records = await recordsRepo.listByDay(dayKey);
  const last = records.at(-1);
  if (!last) return null;
  await recordsRepo.remove(last.id);
  emitRecordsChanged({ day_key: dayKey, reason: 'deleted', record_ids: [last.id] });
  return last;
}
