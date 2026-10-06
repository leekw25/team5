// A(입력)와 B(미션·리워드)가 주고받는 데이터 약속. 멘토만 수정한다(contract/* 브랜치).

export type RecordKind = 'meal' | 'exercise' | 'water';
export type InputSource = 'voice' | 'text' | 'photo' | 'quick' | 'health'; // quick: 빠른 기록 버튼, health: 휴대폰 걸음 수

// 미션 판정에 쓰는 닫힌 목록. 추가·변경은 계약 변경 절차를 따른다.
export type FoodTag =
  | 'fried' // 튀김
  | 'sugary_drink' // 가당 음료(콜라, 주스 등)
  | 'zero_sugar_drink' // 제로 음료
  | 'carbonated' // 탄산
  | 'alcohol'
  | 'snack';

export type ExerciseCode = 'squat' | 'pushup' | 'walking' | 'running' | 'cycling' | 'other';

export interface FoodItem {
  name: string; // 화면 표시용, 예: "싸이버거"
  quantity: number; // 1
  unit: string; // "개", "공기", "잔"
  kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  tags: FoodTag[];
}

export interface ExerciseItem {
  name: string; // 화면 표시용, 예: "스쿼트"
  code: ExerciseCode; // 판정은 name이 아니라 code로 한다
  body_parts: string[];
  sets?: number;
  reps?: number; // 세트당 횟수
  duration_min?: number;
  steps?: number; // 걸음 수는 code='walking' 항목의 steps에 담는다
  kcal_burned: number;
}

export interface HealthRecord {
  id: string;
  user_id: string;
  day_key: string; // 'YYYY-MM-DD', Asia/Seoul 기준. 저장소가 occurred_at으로 채운다(로컬: toDayKey, Supabase: 자동 계산)
  occurred_at: string; // 먹거나 운동한 시각(ISO). 입력한 시각과 다를 수 있음
  kind: RecordKind;
  source: InputSource;
  raw_text: string | null; // 음성 인식 결과 또는 입력 문장
  foods: FoodItem[]; // kind = 'meal'
  exercises: ExerciseItem[]; // kind = 'exercise'
  water_ml: number | null; // kind = 'water'
  confidence: number; // 0~1, 파싱 확신도
  created_at: string;
}

// 저장할 때 쓰는 모양. id·user_id·day_key·created_at은 저장소(src/data)가 채운다.
export type NewHealthRecord = Omit<HealthRecord, 'id' | 'user_id' | 'day_key' | 'created_at'>;

// A가 Gemini 파싱 후 돌려주는 결과
export interface ParseResult {
  transcript: string | null;
  records: NewHealthRecord[]; // 실패하면 빈 배열
  warnings: string[]; // 실패·불확실 사유
}

// ── 기록 변경 이벤트 ──
// A는 DB 저장·수정·삭제가 성공한 뒤에만 1회 발행한다. B는 받으면 그 날짜 기록 전체를 다시 읽어 판정한다.
export interface RecordsChangedEvent {
  type: 'records:changed';
  day_key: string;
  reason: 'created' | 'updated' | 'deleted';
  record_ids: string[];
}

// ── 미션 결과 ──
export type MissionSlot = 'diet' | 'life' | 'exercise';
export type MissionStatus = 'in_progress' | 'success' | 'failed';

// (user_id, day_key, slot)은 DB에서 유일하다. 배정할 때는 upsert(onConflict, ignoreDuplicates)로
// 이미 있는 행(시연 시드 포함)을 덮어쓰지 않는다.
export interface DailyMission {
  id: string;
  user_id: string;
  day_key: string;
  slot: MissionSlot;
  mission_code: string; // 카탈로그 코드, 예: 'protein_min'
  params: Record<string, number>; // 예: { target_g: 40 }
  status: MissionStatus;
  achieved_at: string | null;
}

// v_day_status 뷰 한 행
export interface DayStatus {
  user_id: string;
  day_key: string;
  success_count: number; // 0~3
}

// ── 데이터 저장소 약속 ──
// 기능 코드는 저장소를 직접 만지지 않고 src/data 의 recordsRepo, missionsRepo 만 쓴다.
// 개발 단계: 개발자가 휴대폰 로컬 저장소(AsyncStorage, JSON 배열)로 구현한다.
// 통합 단계: 멘토가 같은 약속을 지키는 Supabase 구현으로 src/data 만 바꾼다(기능 코드는 그대로).
export interface RecordsRepo {
  listByDay(dayKey: string): Promise<HealthRecord[]>; // occurred_at 오름차순
  insertMany(records: NewHealthRecord[]): Promise<HealthRecord[]>; // id·user_id·day_key·created_at을 채워 돌려줌
  update(id: string, patch: Partial<NewHealthRecord>): Promise<HealthRecord>;
  remove(id: string): Promise<void>;
}

export type NewDailyMission = Pick<DailyMission, 'slot' | 'mission_code' | 'params'>;

export interface MissionsRepo {
  listByDay(dayKey: string): Promise<DailyMission[]>;
  // 그날 미션이 없을 때만 만들고, 있으면 기존 것을 그대로 돌려준다(시연 시드를 덮어쓰지 않기 위해)
  assignIfEmpty(dayKey: string, missions: NewDailyMission[]): Promise<DailyMission[]>;
  update(id: string, patch: Pick<DailyMission, 'status' | 'achieved_at'>): Promise<DailyMission>;
  listDayStatus(fromDayKey: string, toDayKey: string): Promise<DayStatus[]>; // 양 끝 날짜 포함
}

// 로컬 저장 규칙. 값은 JSON 배열이고, 필드 이름은 DB 열 이름과 똑같이 둔다(통합 때 그대로 옮기기 위해).
export const LOCAL_KEYS = { records: 'fitlog:records', daily_missions: 'fitlog:daily_missions' } as const;
export const LOCAL_USER_ID = 'local-user';

// ── 오늘 화면 조립용 컴포넌트 약속 ──
// 멘토가 src/app/에서 아래 이름으로 import해 배치한다. 이름·props를 바꾸려면 계약 변경 절차를 따른다.
// A: src/features/input/index.ts 에서 export
export type InputPanelProps = Record<string, never>; // 마이크·텍스트·빠른 기록 버튼
export interface TimelineProps {
  dayKey: string;
}
// B: src/features/mission/index.ts, src/features/reward/index.ts 에서 export
export interface MissionCardsProps {
  dayKey: string;
}
export type RewardCalendarProps = Record<string, never>; // 달력 + 스트릭
