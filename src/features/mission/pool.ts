// 미션 후보(기본 200개 + 사용자 미션)와 랜덤 배정·다시 뽑기(순수 함수, 난수는 밖에서 넣는다).
import type { DailyMission, MissionSlot, NewDailyMission, UserMission } from '../../shared/types/contract.ts';
import { getMissionDef } from './catalog.ts';
import { MISSIONS_200, type BuiltInMission } from './missions200.ts';
import { METRIC_UNITS } from './rules.ts';

export const MAX_REROLLS_PER_DAY = 5;
export const SLOTS: MissionSlot[] = ['diet', 'life', 'exercise'];
const USER_PREFIX = 'user:';

const BY_CODE = new Map(MISSIONS_200.map((m) => [m.code, m]));
export const findBuiltIn = (code: string): BuiltInMission | undefined => BY_CODE.get(code);

// 뽑기 후보 한 개 = 저장할 미션 모양
export function candidates(slot: MissionSlot, userMissions: UserMission[] = []): NewDailyMission[] {
  return [
    ...MISSIONS_200.filter((m) => m.slot === slot).map((m) => ({ slot, mission_code: m.code, params: {}, title: null })),
    ...userMissions.filter((u) => u.slot === slot).map((u) => ({ slot, mission_code: USER_PREFIX + u.id, params: {}, title: u.title })),
  ];
}

const pick = <T>(list: T[], random: () => number): T => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// 하루 미션 3개: 식단·생활·운동 슬롯에서 하나씩 랜덤
export function pickDailySet(userMissions: UserMission[], random: () => number = Math.random): NewDailyMission[] {
  return SLOTS.map((slot) => pick(candidates(slot, userMissions), random));
}

// 다시 뽑기: 같은 슬롯에서 오늘 이미 있는 미션은 빼고 랜덤. 하루 5회를 넘으면 null
export function pickReroll(target: DailyMission, today: DailyMission[], userMissions: UserMission[], random: () => number = Math.random): NewDailyMission | null {
  if (rerollsLeft(today) <= 0) return null;
  const taken = new Set(today.map((m) => m.mission_code));
  const options = candidates(target.slot, userMissions).filter((c) => !taken.has(c.mission_code));
  return options.length ? pick(options, random) : null;
}

export const rerollsLeft = (today: DailyMission[]) => Math.max(0, MAX_REROLLS_PER_DAY - today.reduce((s, m) => s + (m.reroll_count ?? 0), 0));

// 카드에 보일 제목과 단위
export function describe(mission: Pick<DailyMission, 'mission_code' | 'params' | 'title'>): { title: string; unit: string } {
  const def = getMissionDef(mission.mission_code);
  if (def) return { title: def.title(mission.params[def.paramKey] ?? 0), unit: def.unit };
  const builtIn = findBuiltIn(mission.mission_code);
  if (builtIn) return { title: builtIn.title, unit: builtIn.rule.type === 'metric' ? METRIC_UNITS[builtIn.rule.metric] : '' };
  return { title: mission.title ?? mission.mission_code, unit: '' };
}
