// A-F07 빠른 기록 버튼: 한 번 누르면 AI 없이 바로 저장되는 운동 기록(source: 'quick').
// 소모 칼로리는 대략적인 추정값이다. 판정에 쓰는 것은 name 이 아니라 code 와 sets, reps 이다.
import type { NewHealthRecord } from '../../shared/types/contract.ts';

export interface QuickChip {
  id: string;
  label: string;
  build: (now: Date) => NewHealthRecord;
}

function exerciseRecord(label: string, now: Date, item: NewHealthRecord['exercises'][number]): NewHealthRecord {
  return {
    occurred_at: now.toISOString(),
    kind: 'exercise',
    source: 'quick',
    raw_text: label,
    foods: [],
    exercises: [item],
    water_ml: null,
    confidence: 1, // 사용자가 직접 고른 값이라 확실하다
  };
}

export const QUICK_CHIPS: QuickChip[] = [
  {
    id: 'squat',
    label: '스쿼트 15개×2세트',
    build: (now) =>
      exerciseRecord('스쿼트 15개×2세트', now, { name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 2, reps: 15, kcal_burned: 12 }),
  },
  {
    id: 'pushup',
    label: '푸시업 10개×2세트',
    build: (now) =>
      exerciseRecord('푸시업 10개×2세트', now, { name: '푸시업', code: 'pushup', body_parts: ['가슴', '팔'], sets: 2, reps: 10, kcal_burned: 10 }),
  },
  {
    id: 'walking',
    label: '걷기 30분',
    build: (now) =>
      exerciseRecord('걷기 30분', now, { name: '걷기', code: 'walking', body_parts: ['하체'], duration_min: 30, kcal_burned: 100 }),
  },
];
