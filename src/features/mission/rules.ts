// 미션 200개의 판정 규칙(순수 함수). 그날 기록 전체에서 지표를 계산한다.
import type { FoodTag, HealthRecord } from '../../shared/types/contract.ts';

export type Metric =
  | 'steps'
  | 'walk_min'
  | 'run_min'
  | 'cardio_min' // 달리기 + 자전거(러닝머신·실내 자전거 포함)
  | 'exercise_min' // 모든 운동 시간
  | 'squat'
  | 'pushup'
  | 'lunge'
  | 'crunch'
  | 'jumping_jack'
  | 'burpee'
  | 'stairs' // 층
  | 'plank_sec'
  | 'water_ml'
  | 'protein_g'
  | 'protein_meals' // 단백질 15g 이상인 끼니 수
  | 'meal_records'
  | 'photo_meals'
  | 'exercise_records'
  | 'sleep_min'
  | 'bed_before_midnight' // 18:00~23:59 사이에 잠든 기록이 있으면 1
  | 'weight_logged'
  | 'waist_logged'
  | 'condition_logged'
  | 'health_steps'; // 휴대폰 걸음 수가 동기화됐으면 1

export type MissionRule =
  | { type: 'metric'; metric: Metric; min: number } // 기록으로 자동 판정
  | { type: 'avoid'; tags: FoodTag[] } // 직접 체크 + 그 음식 기록이 있으면 실패
  | { type: 'check' }; // 직접 체크

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const exercises = (records: HealthRecord[], ...codes: string[]) => records.flatMap((r) => r.exercises).filter((e) => codes.includes(e.code));
const reps = (records: HealthRecord[], code: string) => sum(exercises(records, code).map((e) => (e.sets ?? 1) * (e.reps ?? 0)));
const minutes = (records: HealthRecord[], ...codes: string[]) => sum(exercises(records, ...codes).map((e) => e.duration_min ?? 0));
const has = (ok: boolean) => (ok ? 1 : 0);

export function measure(metric: Metric, records: HealthRecord[]): number {
  const meals = records.filter((r) => r.kind === 'meal');
  const details = (kind: 'sleep' | 'body') => records.filter((r) => r.kind === kind).map((r) => r.details ?? {});
  switch (metric) {
    case 'steps':
      return sum(exercises(records, 'walking').map((e) => e.steps ?? 0));
    case 'walk_min':
      return minutes(records, 'walking');
    case 'run_min':
      return minutes(records, 'running');
    case 'cardio_min':
      return minutes(records, 'running', 'cycling');
    case 'exercise_min':
      return sum(records.flatMap((r) => r.exercises).map((e) => e.duration_min ?? 0));
    case 'squat':
    case 'pushup':
    case 'lunge':
    case 'crunch':
    case 'jumping_jack':
    case 'burpee':
    case 'stairs':
      return reps(records, metric);
    case 'plank_sec':
      return Math.round(minutes(records, 'plank') * 60);
    case 'water_ml':
      return sum(records.map((r) => r.water_ml ?? 0));
    case 'protein_g':
      return sum(meals.flatMap((r) => r.foods).map((f) => f.protein_g));
    case 'protein_meals':
      return meals.filter((r) => sum(r.foods.map((f) => f.protein_g)) >= 15).length;
    case 'meal_records':
      return meals.length;
    case 'photo_meals':
      return meals.filter((r) => r.source === 'photo').length;
    case 'exercise_records':
      return records.filter((r) => r.kind === 'exercise').length;
    case 'sleep_min':
      return Math.max(0, ...details('sleep').map((d) => d.sleep_min ?? 0));
    case 'bed_before_midnight':
      return has(details('sleep').some((d) => !!d.bed_time && d.bed_time >= '18:00' && d.bed_time <= '23:59'));
    case 'weight_logged':
      return has(details('body').some((d) => d.weight_kg !== undefined));
    case 'waist_logged':
      return has(details('body').some((d) => d.waist_cm !== undefined));
    case 'condition_logged':
      return has(details('body').some((d) => d.condition !== undefined));
    case 'health_steps':
      return has(records.some((r) => r.source === 'health'));
  }
}

// 피해야 할 음식을 먹은 횟수
export function violations(tags: FoodTag[], records: HealthRecord[]): number {
  return records.flatMap((r) => r.foods).filter((f) => f.tags.some((t) => tags.includes(t))).length;
}

export const METRIC_UNITS: Record<Metric, string> = {
  steps: '보',
  walk_min: '분',
  run_min: '분',
  cardio_min: '분',
  exercise_min: '분',
  squat: '회',
  pushup: '회',
  lunge: '회',
  crunch: '회',
  jumping_jack: '회',
  burpee: '회',
  stairs: '층',
  plank_sec: '초',
  water_ml: 'ml',
  protein_g: 'g',
  protein_meals: '끼',
  meal_records: '건',
  photo_meals: '장',
  exercise_records: '건',
  sleep_min: '분',
  bed_before_midnight: '',
  weight_logged: '',
  waist_logged: '',
  condition_logged: '',
  health_steps: '',
};
