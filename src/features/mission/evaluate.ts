// B-F02 판정 함수. React·저장소와 분리한 순수 함수라 테스트로 검증한다.
// 이전 판정에 더해 가지 않고, 매번 그날 기록 전체로 처음부터 계산한다(기록이 지워지면 다시 진행 중이 된다).
import type { DailyMission, HealthRecord } from '../../shared/types/contract.ts';
import { getMissionDef } from './catalog.ts';

export interface MissionResult {
  mission: DailyMission; // 판정 전 저장돼 있던 미션
  status: 'in_progress' | 'success';
  achieved_at: string | null;
  current: number; // 진행값, 예: 12.9
  target: number; // 목표값, 예: 30
}

export function evaluateMissions(missions: DailyMission[], records: HealthRecord[], now: Date): MissionResult[] {
  return missions.flatMap((mission) => {
    const def = getMissionDef(mission.mission_code);
    const target: number | undefined = def ? mission.params[def.paramKey] : undefined;
    if (!def || target === undefined) return []; // 카탈로그 밖 코드나 목표값이 없는 미션은 판정하지 않는다

    const dayRecords = records.filter((record) => record.day_key === mission.day_key);
    // 12.6 + 0.3 같은 소수 합의 오차로 목표 직전에 멈추지 않게 소수 첫째 자리로 맞춘다
    const current = Math.round(def.measure(dayRecords) * 10) / 10;
    const status = current >= target ? 'success' : 'in_progress';
    const keptAchievedAt = mission.status === 'success' ? mission.achieved_at : null;
    const achieved_at = status === 'success' ? (keptAchievedAt ?? now.toISOString()) : null;
    return [{ mission, status, achieved_at, current, target }];
  });
}
