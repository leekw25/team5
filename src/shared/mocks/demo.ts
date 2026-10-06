// 시연 장면의 목업 데이터. A의 입력 기능이 없어도 B가 판정·연출을 개발할 수 있게 한다.
// 영양 수치는 예시값이다. 실제 Gemini 파싱 결과가 나오면 멘토가 맞춰 갱신한다.
import type { DailyMission, HealthRecord, NewHealthRecord } from '../types/contract';

const DAY = '2026-10-06';
const USER = 'mock-user';

// 시드로 미리 들어가 있는 아침 기록
export const morningRecord: HealthRecord = {
  id: 'mock-morning',
  user_id: USER,
  day_key: DAY,
  occurred_at: '2026-10-05T23:10:00.000Z', // KST 08:10
  kind: 'meal',
  source: 'voice',
  raw_text: '아침에 사과 반 개랑 계란 2개 먹었어',
  foods: [
    { name: '사과', quantity: 0.5, unit: '개', kcal: 48, carb_g: 13, protein_g: 0.3, fat_g: 0.2, tags: [] },
    { name: '삶은 계란', quantity: 2, unit: '개', kcal: 155, carb_g: 1, protein_g: 12.6, fat_g: 10.6, tags: [] },
  ],
  exercises: [],
  water_ml: null,
  confidence: 0.95,
  created_at: '2026-10-05T23:10:05.000Z',
};

// 시연 문장 "오늘 점심에 맘스터치 싸이버거 세트 먹고 콜라는 제로로 바꿨어"의 파싱 결과(저장 전)
export const lunchParsed: NewHealthRecord = {
  occurred_at: '2026-10-06T03:30:00.000Z', // KST 12:30
  kind: 'meal',
  source: 'voice',
  raw_text: '오늘 점심에 맘스터치 싸이버거 세트 먹고 콜라는 제로로 바꿨어',
  foods: [
    { name: '싸이버거', quantity: 1, unit: '개', kcal: 560, carb_g: 48, protein_g: 24, fat_g: 30, tags: ['fried'] },
    { name: '감자튀김', quantity: 1, unit: '개', kcal: 300, carb_g: 38, protein_g: 4, fat_g: 15, tags: ['fried', 'snack'] },
    { name: '제로콜라', quantity: 1, unit: '잔', kcal: 0, carb_g: 0, protein_g: 0, fat_g: 0, tags: ['zero_sugar_drink', 'carbonated'] },
  ],
  exercises: [],
  water_ml: null,
  confidence: 0.9,
};

// 저장 후 모습
export const lunchRecord: HealthRecord = {
  ...lunchParsed,
  id: 'mock-lunch',
  user_id: USER,
  day_key: DAY,
  created_at: '2026-10-06T03:30:03.000Z',
};

// 시드 상태의 오늘 미션: 물·스쿼트는 이미 성공, 단백질만 진행 중
export const demoMissions: DailyMission[] = [
  { id: 'mock-m1', user_id: USER, day_key: DAY, slot: 'diet', mission_code: 'protein_min', params: { target_g: 30 }, status: 'in_progress', achieved_at: null },
  { id: 'mock-m2', user_id: USER, day_key: DAY, slot: 'life', mission_code: 'water_min', params: { target_ml: 1500 }, status: 'success', achieved_at: '2026-10-06T01:00:00.000Z' },
  { id: 'mock-m3', user_id: USER, day_key: DAY, slot: 'exercise', mission_code: 'squat_min', params: { target: 30 }, status: 'success', achieved_at: '2026-10-06T00:00:00.000Z' },
];
