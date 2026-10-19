// A-F01 텍스트 파싱의 핵심 로직. React·Expo와 무관한 순수 함수라 node:test 로 검사한다.
// Gemini를 부르는 부분은 parse-text.ts 에 있고, 여기는 "질문 만들기"와 "답 정리하기"만 한다.
import { addDays, startOfDayIso, toDayKey } from '../../shared/date.ts';
import { approxBytes, formatSize, recordAiError } from './ai-error-log.ts';
import type { AiSource } from './ai-error-log.ts';
import { lookupDemoCache } from './demo-cache.ts';
import type {
  ExerciseCode,
  ExerciseItem,
  FoodItem,
  FoodTag,
  InputSource,
  NewHealthRecord,
  ParseResult,
  RecordKind,
} from '../../shared/types/contract.ts';

// 계약의 닫힌 목록. Record 로 만들어 두면 계약에 항목이 늘 때 여기서 컴파일 오류가 나서 빠뜨리지 않는다.
const FOOD_TAG_TABLE: Record<FoodTag, true> = {
  fried: true,
  sugary_drink: true,
  zero_sugar_drink: true,
  carbonated: true,
  alcohol: true,
  snack: true,
};
const EXERCISE_CODE_TABLE: Record<ExerciseCode, true> = {
  squat: true,
  pushup: true,
  walking: true,
  running: true,
  cycling: true,
  other: true,
};
export const FOOD_TAGS = Object.keys(FOOD_TAG_TABLE) as FoodTag[];
export const EXERCISE_CODES = Object.keys(EXERCISE_CODE_TABLE) as ExerciseCode[];
const KINDS: RecordKind[] = ['meal', 'exercise', 'water'];

// 이 값보다 확신도가 낮은 기록은 저장은 하되 화면에 '확인 필요'를 띄운다(A-F06에서 사용).
export const LOW_CONFIDENCE = 0.6;

// ── Gemini에게 요구하는 답변 모양(JSON 스키마) ──
// 음식 태그와 운동 코드는 enum 으로 계약 목록 안에서만 고르게 한다.
export const PARSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    records: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: KINDS },
          time: { type: 'STRING', nullable: true, description: '한국 시각 HH:MM. 모르면 null' },
          days_ago: { type: 'INTEGER', description: '오늘이면 0, 어제면 1' },
          foods: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                unit: { type: 'STRING' },
                kcal: { type: 'NUMBER' },
                carb_g: { type: 'NUMBER' },
                protein_g: { type: 'NUMBER' },
                fat_g: { type: 'NUMBER' },
                tags: { type: 'ARRAY', items: { type: 'STRING', enum: FOOD_TAGS } },
              },
              required: ['name', 'quantity', 'unit', 'kcal', 'carb_g', 'protein_g', 'fat_g', 'tags'],
            },
          },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                code: { type: 'STRING', enum: EXERCISE_CODES },
                body_parts: { type: 'ARRAY', items: { type: 'STRING' } },
                sets: { type: 'INTEGER', nullable: true },
                reps: { type: 'INTEGER', nullable: true },
                duration_min: { type: 'NUMBER', nullable: true },
                steps: { type: 'INTEGER', nullable: true },
                kcal_burned: { type: 'NUMBER' },
              },
              required: ['name', 'code', 'body_parts', 'kcal_burned'],
            },
          },
          water_ml: { type: 'NUMBER', nullable: true },
          confidence: { type: 'NUMBER', description: '0~1, 파싱 확신도' },
        },
        required: ['kind', 'days_ago', 'foods', 'exercises', 'confidence'],
      },
    },
  },
  required: ['records'],
} as const;

// 음성용 답변 모양: records 는 위와 똑같이 두고, 들은 말(transcript)만 하나 더 받는다.
export const AUDIO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING', description: '들은 말을 그대로 받아 적은 한국어 문장. 말소리가 없으면 빈 글자' },
    records: PARSE_SCHEMA.properties.records,
  },
  required: ['transcript', 'records'],
} as const;

// ── Gemini의 날것 답변 모양 ──
interface RawFood {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  kcal?: unknown;
  carb_g?: unknown;
  protein_g?: unknown;
  fat_g?: unknown;
  tags?: unknown;
}
interface RawExercise {
  name?: unknown;
  code?: unknown;
  body_parts?: unknown;
  sets?: unknown;
  reps?: unknown;
  duration_min?: unknown;
  steps?: unknown;
  kcal_burned?: unknown;
}
interface RawRecord {
  kind?: unknown;
  time?: unknown;
  days_ago?: unknown;
  foods?: unknown;
  exercises?: unknown;
  water_ml?: unknown;
  confidence?: unknown;
}
export interface RawParse {
  records?: unknown;
}

// ── 질문 만들기 ──
// 사용자가 자주 말하는 장소 별칭. 장소 이름 → 실제 주소. 문장·음성 질문에 같이 들어간다.
export const PLACE_ALIASES: Record<string, string> = { 마크애니: '서울특별시 중구 퇴계로 286' };

const TAG_RULE = '- tags 는 해당될 때만 넣는다: 튀김 fried, 가당 음료 sugary_drink, 제로 음료 zero_sugar_drink, 탄산 carbonated, 술 alcohol, 과자·간식 snack.';

// 문장·음성 질문이 함께 쓰는 앞부분(역할, 현재 시각, 규칙). 규칙을 고치면 두 입력 방식이 같이 바뀐다.
function promptRules(now: Date): string[] {
  const dayKey = toDayKey(now);
  const minutes = Math.floor((now.getTime() - Date.parse(startOfDayIso(dayKey))) / 60000);
  const hhmm = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  return [
    '너는 한국어 식단·운동 기록 도우미다. 사용자의 문장에서 먹은 것, 운동, 마신 물을 찾아 JSON으로 정리한다.',
    '현재 한국 시각: ' + dayKey + ' ' + hhmm,
    '',
    '규칙:',
    '- 식사 한 번(아침/점심/저녁/간식)은 kind="meal" 기록 1개로 만들고, 그 안의 음식은 foods 배열에 하나씩 나눠 담는다.',
    '- 사용자가 "아침식사", "점심식사", "오후간식", "저녁식사"처럼 구분 제목을 쓰고 그 아래에 음식을 나열하면, 그 음식은 모두 그 제목의 meal 기록 1개에 담는다. 물만 kind="water" 기록으로 따로 뺀다.',
    '- name 은 사용자가 쓴 표현 그대로 적는다. 다른 말로 바꾸거나 풀어 쓰지 않는다.',
    '- quantity 와 unit 은 사용자가 말한 양과 단위 그대로 적는다. unit 은 g, ml, 개, 장, 공기, 잔, 조각처럼 짧게 쓴다("그람", "그램"은 g).',
    '- 사용자가 양을 말하지 않은 음식은 quantity 를 0, unit 을 빈 글자("")로 적는다. 양을 지어내지 않는다. 이때 영양 수치는 1회 제공량 기준 추정치로 적는다.',
    '- 제품명이나 프랜차이즈 메뉴와 양이 구체적이면 그 제품의 표기 영양정보(알고 있는 값)를 쓰고, 말한 양에 맞게 환산한다. 정확히 모르면 비슷한 음식 기준으로 추정하고 confidence 를 0.5 이하로 낮춘다.',
    '- "세트" 메뉴는 메인, 사이드(감자튀김 등), 음료로 나눠 각각 foods 항목으로 만든다.',
    '- 음료를 제로·무가당으로 바꿨다고 하면 제로 음료(tags에 zero_sugar_drink)로 적고 kcal은 0에 가깝게 한다.',
    '- 운동은 kind="exercise" 기록 1개에 exercises 배열로 담는다. code는 목록 중에서만 고르고 해당 없으면 other.',
    '- 마신 물은 kind="water", water_ml 에 ml 로 적는다(1컵=200, 1병=500, 1L=1000).',
    ...Object.entries(PLACE_ALIASES).map(([name, address]) => `- "${name}"는 장소로 쓰이면 "${address}"를 뜻한다. 출발지·도착지로 나오면 이 주소로 바꿔 생각한다.`),
    '- 걷기·달리기·자전거를 "A에서 B까지", "A에서 B로"처럼 장소로만 말하고 시간·거리·걸음 수를 말하지 않았으면, 알고 있는 지리 정보로 두 장소 사이 이동 거리를 대략 추정한다. 그 거리로 duration_min(걷기 1분 약 70m, 달리기 1분 약 150m, 자전거 1분 약 250m), 걷기는 steps(1km 약 1,300보), kcal_burned 를 계산하고 confidence 를 0.7 이하로 적는다.',
    '- kcal, carb_g, protein_g, fat_g 는 숫자로 적는다. 양을 말했으면 그 양 전체 기준이다.',
    TAG_RULE,
    '- time 은 말한 시각(HH:MM)이다. 시각이 없으면 아침 08:00, 점심 12:30, 저녁 19:00, 간식 15:00 으로 정하고, 단서가 전혀 없으면 null.',
    '- days_ago 는 오늘 0, 어제 1, 그제 2 이다.',
    '- 확신이 낮으면 confidence 를 낮게(0.5 이하) 적는다. 먹거나 운동한 내용이 없으면 records 를 빈 배열로 한다.',
  ];
}

export function buildPrompt(text: string, now: Date): string {
  return [...promptRules(now), '', '사용자 문장: ' + text].join('\n');
}

// A-F02 음성 입력의 질문. 같은 호출 한 번으로 "들은 말 받아 적기(transcript)"와 "기록 정리(records)"를 같이 시킨다.
export function buildAudioPrompt(now: Date): string {
  return [
    ...promptRules(now),
    '',
    '사용자는 글이 아니라 음성(첨부된 오디오)으로 말했다. 먼저 들은 말을 transcript 에 한국어 문장으로 그대로 받아 적고, 그 문장을 기준으로 위 규칙대로 records 를 만든다.',
    '말소리가 없거나 알아들을 수 없으면 transcript 를 빈 글자("")로, records 를 빈 배열로 한다.',
  ].join('\n');
}

// ── 답 정리하기 (순수 함수) ──
function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function optionalNum(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}
function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

// 한국 시각 HH:MM 과 며칠 전인지로 occurred_at(ISO)을 만든다. 시각이 이상하면 지금(오늘) 또는 정오(과거)로 둔다.
export function resolveOccurredAt(time: unknown, daysAgo: unknown, now: Date): string {
  const days = typeof daysAgo === 'number' && Number.isInteger(daysAgo) && daysAgo >= 0 && daysAgo <= 7 ? daysAgo : 0;
  const dayKey = addDays(toDayKey(now), -days);
  const match = typeof time === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(time.trim()) : null;
  const hour = match ? Number(match[1]) : NaN;
  const minute = match ? Number(match[2]) : NaN;
  if (!match || hour > 23 || minute > 59) {
    return days === 0 ? now.toISOString() : new Date(dayKey + 'T12:00:00+09:00').toISOString();
  }
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(dayKey + 'T' + hh + ':' + mm + ':00+09:00').toISOString();
}

function normalizeFood(raw: RawFood): FoodItem | null {
  const name = str(raw.name);
  if (!name) return null;
  const tags = Array.isArray(raw.tags)
    ? FOOD_TAGS.filter((tag) => (raw.tags as unknown[]).includes(tag))
    : [];
  // 양을 말하지 않은 음식은 quantity 0 + unit '' 로 둔다(계약상 양 칸은 항상 값이 있어야 해서 만든 약속).
  const quantity = num(raw.quantity, 0);
  return {
    name,
    quantity,
    unit: quantity > 0 ? str(raw.unit) : '',
    kcal: num(raw.kcal),
    carb_g: num(raw.carb_g),
    protein_g: num(raw.protein_g),
    fat_g: num(raw.fat_g),
    tags,
  };
}

function normalizeExercise(raw: RawExercise): ExerciseItem | null {
  const name = str(raw.name);
  if (!name) return null;
  const code = EXERCISE_CODES.find((c) => c === raw.code) ?? 'other';
  const item: ExerciseItem = {
    name,
    code,
    body_parts: Array.isArray(raw.body_parts) ? raw.body_parts.filter((p): p is string => typeof p === 'string') : [],
    kcal_burned: num(raw.kcal_burned),
  };
  const sets = optionalNum(raw.sets);
  const reps = optionalNum(raw.reps);
  const duration = optionalNum(raw.duration_min);
  const steps = optionalNum(raw.steps);
  if (sets !== undefined) item.sets = sets;
  if (reps !== undefined) item.reps = reps;
  if (duration !== undefined) item.duration_min = duration;
  if (steps !== undefined) item.steps = steps;
  return item;
}

function normalizeRecord(raw: RawRecord, rawText: string | null, source: InputSource, now: Date): NewHealthRecord | null {
  const kind = KINDS.find((k) => k === raw.kind);
  if (!kind) return null;
  const foods =
    kind === 'meal' && Array.isArray(raw.foods)
      ? (raw.foods as RawFood[]).map(normalizeFood).filter((f): f is FoodItem => f !== null)
      : [];
  const exercises =
    kind === 'exercise' && Array.isArray(raw.exercises)
      ? (raw.exercises as RawExercise[]).map(normalizeExercise).filter((e): e is ExerciseItem => e !== null)
      : [];
  const waterMl = kind === 'water' ? optionalNum(raw.water_ml) : undefined;

  // 내용이 비어 있는 기록은 만들지 않는다.
  if (kind === 'meal' && foods.length === 0) return null;
  if (kind === 'exercise' && exercises.length === 0) return null;
  if (kind === 'water' && waterMl === undefined) return null;

  const confidence = typeof raw.confidence === 'number' && Number.isFinite(raw.confidence) ? Math.min(1, Math.max(0, raw.confidence)) : 0.5;
  return {
    occurred_at: resolveOccurredAt(raw.time, raw.days_ago, now),
    kind,
    source,
    raw_text: rawText,
    foods,
    exercises,
    water_ml: waterMl ?? null,
    confidence,
  };
}

export const MSG_EMPTY_INPUT = '입력한 내용이 없어요. 먹은 것이나 한 운동을 적어 주세요.';
export const MSG_NOTHING_FOUND = '기록할 식단이나 운동을 찾지 못했어요. 다시 말하거나 직접 입력해 주세요.';
export const MSG_LOW_CONFIDENCE = '일부 항목은 확실하지 않아요. 저장은 되지만 확인이 필요해요.';
export const MSG_AI_FAILED = '인터넷 연결이나 AI 응답에 문제가 있어요. 잠시 뒤 다시 하거나 직접 입력해 주세요.';

// 실패했을 때의 공통 처리: 진짜 원인은 '최근 AI 오류'(개발 도구)에 남기고, 사용자에게는 쉬운 안내만 돌려준다.
// 키가 없을 때는 그 안내를 그대로, 그 밖의 오류(네트워크, 서버)는 공통 안내를 보여 준다.
function failureResult(error: unknown, source: AiSource, now: Date, context: string): ParseResult {
  recordAiError(source, error, now, context);
  const message = error instanceof Error && error.message.includes('API 키') ? error.message : MSG_AI_FAILED;
  return { transcript: null, records: [], warnings: [message] };
}

// Gemini의 날것 답변을 ParseResult 로 정리한다. 이상한 값은 버리거나 고쳐서 항상 안전한 모양으로 돌려준다.
// 입력 방식(source)과 '못 찾았을 때 안내'를 바꿔 문장·사진 모두에 쓴다.
export interface NormalizeOptions {
  source?: InputSource; // 기본 'text'
  nothingFoundMessage?: string;
}

export function normalizeParse(raw: unknown, rawText: string | null, now: Date, options: NormalizeOptions = {}): ParseResult {
  const source = options.source ?? 'text';
  const list = raw && typeof raw === 'object' && Array.isArray((raw as RawParse).records) ? ((raw as RawParse).records as RawRecord[]) : [];
  const records = list
    .map((r) => (r && typeof r === 'object' ? normalizeRecord(r, rawText, source, now) : null))
    .filter((r): r is NewHealthRecord => r !== null);
  const warnings: string[] = [];
  if (records.length === 0) warnings.push(options.nothingFoundMessage ?? MSG_NOTHING_FOUND);
  else if (records.some((r) => r.confidence < LOW_CONFIDENCE)) warnings.push(MSG_LOW_CONFIDENCE);
  return { transcript: null, records, warnings };
}

// Gemini 호출 함수를 받아서 문장 → ParseResult. 호출 함수를 바꿔 끼울 수 있어 PC에서 가짜로 테스트할 수 있다.
export type GeminiInput = { text: string } | { inline_data: { mime_type: string; data: string } };
export type GenerateFn = (parts: GeminiInput[], schema: object) => Promise<unknown>;

export const MSG_NOTHING_FOUND_PHOTO = '사진에서 음식을 찾지 못했어요. 음식이 잘 보이게 다시 찍거나 직접 입력해 주세요.';

// A-F11 사진 식단 입력의 질문. 음식 태그 규칙은 문장 입력과 같다.
export function buildImagePrompt(): string {
  return [
    '너는 한국어 식단 기록 도우미다. 사진 속 음식을 찾아 JSON으로 정리한다.',
    '',
    '규칙:',
    '- 사진 속 음식은 모두 kind="meal" 기록 1개에 담고, 음식은 foods 배열에 하나씩 나눠 담는다.',
    '- name 은 한국에서 흔히 부르는 음식 이름으로 적는다.',
    '- quantity 와 unit 은 사진에서 보이는 양을 눈대중으로 추정해 적는다(g, ml, 개, 장, 공기, 잔, 조각처럼 짧게).',
    '- kcal, carb_g, protein_g, fat_g 는 추정한 양 전체 기준 숫자로 적는다.',
    TAG_RULE,
    '- time 은 null, days_ago 는 0 으로 한다.',
    '- 양이나 음식 종류가 확실하지 않으면 confidence 를 0.5 이하로 낮춘다.',
    '- 음식이 보이지 않으면 records 를 빈 배열로 한다.',
  ].join('\n');
}

export interface PhotoInput {
  mimeType: string;
  base64: string;
}

// 사진 1장 → ParseResult. 호출 함수를 바꿔 끼울 수 있어 PC에서 가짜로 테스트할 수 있다(저장은 하지 않는다).
export async function parseImageWith(generate: GenerateFn, image: PhotoInput, now: Date = new Date()): Promise<ParseResult> {
  try {
    const raw = await generate([{ text: buildImagePrompt() }, { inline_data: { mime_type: image.mimeType, data: image.base64 } }], PARSE_SCHEMA);
    return normalizeParse(raw, null, now, { source: 'photo', nothingFoundMessage: MSG_NOTHING_FOUND_PHOTO });
  } catch (error) {
    return failureResult(error, 'photo', now, inputContext(image.mimeType, image.base64));
  }
}

// A-F02 음성 입력. 녹음 파일 1개(base64)와 파일 형식
export interface AudioInput {
  mimeType: string;
  base64: string;
  note?: string; // 녹음기가 남긴 진단 글(녹음 길이, 파일 크기). 오류 기록에만 쓴다.
}

// 오류 기록에 붙일 '어떤 입력이었는지' 글
function inputContext(mimeType: string, base64: string, note?: string): string {
  return '형식 ' + mimeType + ', 크기 ' + formatSize(approxBytes(base64)) + (note ? ', ' + note : '');
}

// 이보다 작은 녹음 파일은 말소리가 없는 빈 파일로 보고 AI에 보내지 않는다(빈 파일을 보내면 AI가 400 오류로 거절한다).
export const MIN_AUDIO_BYTES = 2000;
export const MSG_VOICE_TOO_SHORT = '녹음이 너무 짧거나 비어 있어요. 버튼을 누르고 1초쯤 뒤부터 3초 이상 또렷하게 말해 주세요.';

export const MSG_NOTHING_HEARD ='말소리를 알아듣지 못했어요. 조용한 곳에서 다시 말하거나 직접 입력해 주세요.';
export const MSG_NOTHING_FOUND_VOICE = '말씀하신 내용에서 식단이나 운동을 찾지 못했어요. 다시 말하거나 직접 입력해 주세요.';

// 녹음 1개 → ParseResult. Gemini 호출은 1번이다(받아 적기 + 기록 정리를 한 번에). 저장은 하지 않는다.
export async function parseAudioWith(generate: GenerateFn, audio: AudioInput, now: Date = new Date()): Promise<ParseResult> {
  if (approxBytes(audio.base64) < MIN_AUDIO_BYTES) {
    recordAiError('voice', new Error('녹음 파일이 너무 작아 AI에 보내지 않았습니다'), now, inputContext(audio.mimeType, audio.base64, audio.note));
    return { transcript: null, records: [], warnings: [MSG_VOICE_TOO_SHORT] };
  }
  try {
    const raw = await generate([{ text: buildAudioPrompt(now) }, { inline_data: { mime_type: audio.mimeType, data: audio.base64 } }], AUDIO_SCHEMA);
    const transcript = raw && typeof raw === 'object' ? str((raw as { transcript?: unknown }).transcript) : '';
    if (!transcript) return { transcript: null, records: [], warnings: [MSG_NOTHING_HEARD] };
    // 들은 말이 시연 문장이면 캐시된 결과로 수치를 고정한다(Gemini 호출은 이미 1번 끝난 뒤라 횟수는 그대로).
    const parsed = lookupDemoCache(transcript) ?? raw;
    const result = normalizeParse(parsed, transcript, now, { source: 'voice', nothingFoundMessage: MSG_NOTHING_FOUND_VOICE });
    return { ...result, transcript };
  } catch (error) {
    return failureResult(error, 'voice', now, inputContext(audio.mimeType, audio.base64, audio.note));
  }
}

export interface ParseOptions {
  useCache?: boolean; // 기본 true. 단백질 측정(A-F10)처럼 실제 AI 결과가 필요하면 false
}

export async function parseWith(
  generate: GenerateFn,
  text: string,
  now: Date = new Date(),
  options: ParseOptions = {},
): Promise<ParseResult> {
  const input = text.trim();
  if (!input) return { transcript: null, records: [], warnings: [MSG_EMPTY_INPUT] };
  if (options.useCache !== false) {
    const cached = lookupDemoCache(input);
    if (cached) return normalizeParse(cached, input, now);
  }
  try {
    const raw = await generate([{ text: buildPrompt(input, now) }], PARSE_SCHEMA);
    return normalizeParse(raw, input, now);
  } catch (error) {
    return failureResult(error, 'text', now, '글 ' + input.length + '자');
  }
}
