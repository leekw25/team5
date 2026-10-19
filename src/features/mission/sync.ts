// B-F03 오늘의 미션 배정 + B-F05 재판정 저장.
// MissionCards가 처음 열릴 때와 onRecordsChanged 이벤트를 받을 때마다 부른다.
import type { DailyMission, MissionsRepo, RecordsRepo } from '../../shared/types/contract.ts';
import { TODAY_MISSION_SET } from './catalog.ts';
import { evaluateMissions, type MissionResult } from './evaluate.ts';
import { celebrate, emitMissionsUpdated, markCelebrated } from './missionEvents.ts';

export interface Repos {
  recordsRepo: RecordsRepo;
  missionsRepo: MissionsRepo;
}

export interface DaySnapshot {
  dayKey: string;
  missions: DailyMission[]; // 판정 결과를 저장한 뒤의 미션(식단·생활·운동 순)
  results: MissionResult[]; // 진행값이 담긴 판정 결과
  newlySucceeded: string[]; // 이번에 in_progress → success로 바뀐 미션 id
}

// 이벤트가 연달아 오거나 MissionCards가 두 개 떠 있어도 차례로 실행해, 같은 변화를 두 번 저장·연출하지 않는다.
let queue: Promise<unknown> = Promise.resolve();

export function syncDay(repos: Repos, dayKey: string, now?: Date): Promise<DaySnapshot> {
  const run = queue.then(() => syncDayNow(repos, dayKey, now ?? new Date()));
  queue = run.catch(() => undefined);
  return run;
}

async function syncDayNow({ recordsRepo, missionsRepo }: Repos, dayKey: string, now: Date): Promise<DaySnapshot> {
  const assigned = await missionsRepo.assignIfEmpty(dayKey, TODAY_MISSION_SET); // 이미 있으면 그대로 돌려준다
  markCelebrated(assigned.filter((mission) => mission.status === 'success').map((mission) => mission.id)); // 이미 성공한 미션은 연출 대상이 아니다
  const records = await recordsRepo.listByDay(dayKey);
  const results = evaluateMissions(assigned, records, now);

  const saved = new Map<string, DailyMission>();
  const newlySucceeded: string[] = [];
  for (const result of results) {
    if (result.status === result.mission.status) continue; // 바뀐 미션만 저장한다
    saved.set(result.mission.id, await missionsRepo.update(result.mission.id, { status: result.status, achieved_at: result.achieved_at }));
    if (result.status === 'success') newlySucceeded.push(result.mission.id);
  }

  if (saved.size > 0) emitMissionsUpdated(dayKey);
  celebrate(dayKey, newlySucceeded);
  return { dayKey, missions: assigned.map((mission) => saved.get(mission.id) ?? mission), results, newlySucceeded };
}
