// ponytail: 이미경님 미션 판정 코드가 통합되기 전까지 쓰는 임시 미션 3개(단백질·물·스쿼트).
// 홈 미리보기와 주간 리포트가 같이 쓴다. 통합 때 B의 판정 함수로 바꾼다.
import type { HealthRecord } from '@/shared/types/contract';

export interface Mission {
  slot: '식단' | '생활' | '운동';
  title: string;
  value: number;
  target: number;
  unit: string;
  doneNote: string;
}

export function toMissions(records: HealthRecord[]): Mission[] {
  const protein = records.flatMap((r) => r.foods).reduce((s, f) => s + f.protein_g, 0);
  const water = records.reduce((s, r) => s + (r.water_ml ?? 0), 0);
  const squat = records.flatMap((r) => r.exercises).filter((e) => e.code === 'squat').reduce((s, e) => s + (e.sets ?? 1) * (e.reps ?? 0), 0);
  return [
    { slot: '식단', title: '단백질 30g 채우기', value: Math.round(protein), target: 30, unit: 'g', doneNote: '오늘 단백질 목표를 채웠어요!' },
    { slot: '생활', title: '물 1.5L 마시기', value: water, target: 1500, unit: 'ml', doneNote: '하루 수분 권장량 달성 완료!' },
    { slot: '운동', title: '스쿼트 30개 하기', value: squat, target: 30, unit: '개', doneNote: '오늘 운동 미션 완료!' },
  ];
}

export const isDone = (m: Mission) => m.value >= m.target;
