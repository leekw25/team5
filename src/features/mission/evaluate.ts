// B-F02 판정 함수. React·저장소와 분리한 순수 함수라 테스트로 검증한다.
// 이전 판정에 더해 가지 않고, 매번 그날 기록 전체로 처음부터 계산한다(기록이 지워지면 다시 진행 중이 된다).
// 통합 때 미션 200개(rules.ts)와 직접 체크형·사용자 미션을 더했다. 기존 4개 코드(protein_min 등)는 그대로 판정한다.
import type { DailyMission, HealthRecord } from '../../shared/types/contract.ts';
import { getMissionDef } from './catalog.ts';
import { findBuiltIn } from './pool.ts';
import { measure, violations } from './rules.ts';

export interface MissionResult {
  mission: DailyMission; // 판정 전 저장돼 있던 미션
  status: 'in_progress' | 'success';
  achieved_at: string | null;
  current: number; // 진행값, 예: 12.9 (체크형은 0/1)
  target: number; // 목표값, 예: 30 (체크형은 1)
  mode: 'metric' | 'avoid' | 'check'; // 자동 판정 / 피하기(체크 + 위반 없음) / 직접 체크
  violations: number; // 피하기 미션에서 해당 음식을 먹은 횟수
}

export function evaluateMissions(missions: DailyMission[], records: HealthRecord[], now: Date): MissionResult[] {
  return missions.flatMap((mission): MissionResult[] => {
    const dayRecords = records.filter((record) => record.day_key === mission.day_key);
    const decide = (ok: boolean, current: number, target: number, mode: MissionResult['mode'], bad = 0): MissionResult => {
      const status = ok ? 'success' : 'in_progress';
      const keptAchievedAt = mission.status === 'success' ? mission.achieved_at : null;
      return { mission, status, achieved_at: ok ? (keptAchievedAt ?? now.toISOString()) : null, current, target, mode, violations: bad };
    };

    // 기존 4개(이미경님 카탈로그): params 의 목표값으로 판정
    const def = getMissionDef(mission.mission_code);
    if (def) {
      const target: number | undefined = mission.params[def.paramKey];
      if (target === undefined) return []; // 목표값이 없는 미션은 판정하지 않는다
      // 12.6 + 0.3 같은 소수 합의 오차로 목표 직전에 멈추지 않게 소수 첫째 자리로 맞춘다
      const current = Math.round(def.measure(dayRecords) * 10) / 10;
      return [decide(current >= target, current, target, 'metric')];
    }

    const checked = mission.checked_at !== null && mission.checked_at !== undefined;
    const builtIn = findBuiltIn(mission.mission_code);
    if (builtIn?.rule.type === 'metric') {
      const current = Math.round(measure(builtIn.rule.metric, dayRecords) * 10) / 10;
      return [decide(current >= builtIn.rule.min, current, builtIn.rule.min, 'metric')];
    }
    if (builtIn?.rule.type === 'avoid') {
      const bad = violations(builtIn.rule.tags, dayRecords);
      return [decide(checked && bad === 0, checked ? 1 : 0, 1, 'avoid', bad)];
    }
    if (builtIn || mission.title) return [decide(checked, checked ? 1 : 0, 1, 'check')]; // 직접 체크형·사용자 미션
    return []; // 카탈로그 밖 코드는 판정하지 않는다
  });
}
