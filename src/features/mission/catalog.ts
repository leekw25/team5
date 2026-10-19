// B-F01 미션 카탈로그. 미션 코드·이름·슬롯·판정 규칙을 이 파일 한 곳에 둔다.
// 카탈로그에 없는 코드는 판정하지 않는다.
import type { ExerciseCode, HealthRecord, MissionSlot, NewDailyMission } from '../../shared/types/contract.ts';

export type MissionCode = 'protein_min' | 'water_min' | 'squat_min' | 'steps_min';

export interface MissionDef {
  code: MissionCode;
  slot: MissionSlot;
  paramKey: string; // params에서 목표값을 읽는 키, 예: 'target_g'
  unit: string; // 진행값 단위, 예: 'g'
  title: (target: number) => string;
  measure: (records: HealthRecord[]) => number; // 그날 기록 전체에서 진행값을 계산
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const exercisesOf = (records: HealthRecord[], code: ExerciseCode) =>
  records.flatMap((record) => record.exercises).filter((exercise) => exercise.code === code);

// 1500 → '1,500', 12.94 → '12.9'
export function formatAmount(value: number): string {
  const [int, dec] = String(Math.round(value * 10) / 10).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
}

export const MISSION_CATALOG: Record<MissionCode, MissionDef> = {
  protein_min: {
    code: 'protein_min',
    slot: 'diet',
    paramKey: 'target_g',
    unit: 'g',
    title: (target) => `단백질 ${formatAmount(target)}g 채우기`,
    measure: (records) => sum(records.flatMap((record) => record.foods).map((food) => food.protein_g)),
  },
  water_min: {
    code: 'water_min',
    slot: 'life',
    paramKey: 'target_ml',
    unit: 'ml',
    title: (target) => `물 ${formatAmount(target)}ml 마시기`,
    measure: (records) => sum(records.map((record) => record.water_ml ?? 0)),
  },
  squat_min: {
    code: 'squat_min',
    slot: 'exercise',
    paramKey: 'target',
    unit: '개',
    title: (target) => `스쿼트 ${formatAmount(target)}개 하기`,
    // reps는 세트당 횟수. 세트 수가 없으면 1세트로 본다.
    measure: (records) => sum(exercisesOf(records, 'squat').map((e) => (e.sets ?? 1) * (e.reps ?? 0))),
  },
  steps_min: {
    code: 'steps_min',
    slot: 'exercise',
    paramKey: 'target',
    unit: '보',
    title: (target) => `${formatAmount(target)}보 걷기`,
    measure: (records) => sum(exercisesOf(records, 'walking').map((e) => e.steps ?? 0)),
  },
};

export function getMissionDef(code: string): MissionDef | undefined {
  return Object.prototype.hasOwnProperty.call(MISSION_CATALOG, code) ? MISSION_CATALOG[code as MissionCode] : undefined;
}

export const SLOT_LABELS: Record<MissionSlot, string> = { diet: '식단', life: '생활', exercise: '운동' };

// B-F03 오늘의 미션 고정 세트. 단백질 목표값은 멘토가 확정하면 여기만 바꾼다.
export const TODAY_MISSION_SET: NewDailyMission[] = [
  { slot: 'diet', mission_code: 'protein_min', params: { target_g: 30 } },
  { slot: 'life', mission_code: 'water_min', params: { target_ml: 1500 } },
  { slot: 'exercise', mission_code: 'squat_min', params: { target: 30 } },
];
