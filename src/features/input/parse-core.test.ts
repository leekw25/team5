import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAudioPrompt,
  buildPrompt,
  EXERCISE_CODES,
  FOOD_TAGS,
  MSG_AI_FAILED,
  MSG_EMPTY_INPUT,
  MSG_LOW_CONFIDENCE,
  MSG_NOTHING_FOUND,
  normalizeParse,
  parseWith,
  PARSE_SCHEMA,
  resolveOccurredAt,
} from './parse-core.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 2026-10-06 12:40

// Gemini가 시연 문장에 돌려줄 법한 답
const lunchRaw = {
  records: [
    {
      kind: 'meal',
      time: '12:30',
      days_ago: 0,
      foods: [
        { name: '싸이버거', quantity: 1, unit: '개', kcal: 560, carb_g: 48, protein_g: 24, fat_g: 30, tags: ['fried'] },
        { name: '감자튀김', quantity: 1, unit: '개', kcal: 300, carb_g: 38, protein_g: 4, fat_g: 15, tags: ['fried', 'snack'] },
        { name: '제로콜라', quantity: 1, unit: '잔', kcal: 0, carb_g: 0, protein_g: 0, fat_g: 0, tags: ['zero_sugar_drink', 'carbonated'] },
      ],
      exercises: [],
      water_ml: null,
      confidence: 0.9,
    },
  ],
};

const squatRaw = {
  records: [
    {
      kind: 'exercise',
      time: null,
      days_ago: 0,
      foods: [],
      exercises: [{ name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 3, reps: 15, duration_min: null, steps: null, kcal_burned: 40 }],
      water_ml: null,
      confidence: 0.95,
    },
  ],
};

test('시연 문장: 싸이버거·감자튀김·제로콜라 3개 항목, 시각은 KST 12:30', () => {
  const result = normalizeParse(lunchRaw, '오늘 점심에 맘스터치 싸이버거 세트 먹고 콜라는 제로로 바꿨어', NOW);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.records.length, 1);
  const [record] = result.records;
  assert.equal(record.kind, 'meal');
  assert.equal(record.source, 'text');
  assert.equal(record.occurred_at, '2026-10-06T03:30:00.000Z');
  assert.deepEqual(record.foods.map((f) => f.name), ['싸이버거', '감자튀김', '제로콜라']);
  assert.deepEqual(record.foods[2].tags, ['zero_sugar_drink', 'carbonated']);
  assert.equal(record.raw_text, '오늘 점심에 맘스터치 싸이버거 세트 먹고 콜라는 제로로 바꿨어');
  assert.equal(record.water_ml, null);
});

test('스쿼트 15개 3세트: code squat, sets 3, reps 15, null 항목은 빠진다', () => {
  const { records } = normalizeParse(squatRaw, '스쿼트 15개 3세트 함', NOW);
  assert.equal(records.length, 1);
  const [exercise] = records[0].exercises;
  assert.equal(exercise.code, 'squat');
  assert.equal(exercise.sets, 3);
  assert.equal(exercise.reps, 15);
  assert.equal('duration_min' in exercise, false);
  assert.equal('steps' in exercise, false);
  assert.equal(records[0].occurred_at, NOW.toISOString()); // 시각 없으면 지금
});

test('계약에 없는 태그와 운동 코드는 버리거나 other 로 바꾼다', () => {
  const raw = {
    records: [
      { kind: 'meal', time: '08:00', days_ago: 0, foods: [{ name: '빵', quantity: 1, unit: '개', kcal: 100, carb_g: 20, protein_g: 3, fat_g: 1, tags: ['fried', '이상한태그'] }], exercises: [], confidence: 0.8 },
      { kind: 'exercise', time: '19:00', days_ago: 0, foods: [], exercises: [{ name: '요가', code: 'yoga', body_parts: [], kcal_burned: 80 }], confidence: 0.8 },
    ],
  };
  const { records } = normalizeParse(raw, '빵 먹고 요가', NOW);
  assert.deepEqual(records[0].foods[0].tags, ['fried']);
  assert.equal(records[1].exercises[0].code, 'other');
});

test('이상한 숫자는 0으로, 확신도는 0~1 로 맞춘다', () => {
  const raw = {
    records: [
      { kind: 'meal', time: '12:00', days_ago: 0, foods: [{ name: '밥', quantity: -1, unit: '', kcal: 'abc', carb_g: null, protein_g: 5, fat_g: NaN, tags: [] }], exercises: [], confidence: 7 },
    ],
  };
  const food = normalizeParse(raw, '밥', NOW).records[0].foods[0];
  assert.equal(food.quantity, 0); // 잘못된 양은 '양 미입력'(0, 빈 단위)으로 본다
  assert.equal(food.unit, '');
  assert.equal(food.kcal, 0);
  assert.equal(food.carb_g, 0);
  assert.equal(food.protein_g, 5);
  assert.equal(food.fat_g, 0);
  assert.equal(normalizeParse(raw, '밥', NOW).records[0].confidence, 1);
});

test('내용이 비었거나 종류가 이상한 기록은 만들지 않고 안내를 준다', () => {
  const raw = {
    records: [
      { kind: 'meal', foods: [], exercises: [], confidence: 0.9 },
      { kind: 'sleep', foods: [], exercises: [], confidence: 0.9 },
      { kind: 'water', water_ml: 0, foods: [], exercises: [], confidence: 0.9 },
      null,
    ],
  };
  const result = normalizeParse(raw, '아무말', NOW);
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.warnings, [MSG_NOTHING_FOUND]);
  assert.deepEqual(normalizeParse(null, 'x', NOW).warnings, [MSG_NOTHING_FOUND]);
  assert.deepEqual(normalizeParse({ records: 'oops' }, 'x', NOW).warnings, [MSG_NOTHING_FOUND]);
});

test('물 기록과 낮은 확신도 안내', () => {
  const raw = { records: [{ kind: 'water', time: '10:00', days_ago: 0, foods: [], exercises: [], water_ml: 500, confidence: 0.4 }] };
  const result = normalizeParse(raw, '물 한 병', NOW);
  assert.equal(result.records[0].water_ml, 500);
  assert.equal(result.records[0].confidence, 0.4);
  assert.deepEqual(result.warnings, [MSG_LOW_CONFIDENCE]);
});

test('resolveOccurredAt: 어제 아침, 이상한 시각, 오늘 시각 없음', () => {
  assert.equal(resolveOccurredAt('08:00', 1, NOW), '2026-10-04T23:00:00.000Z'); // KST 10-05 08:00
  assert.equal(resolveOccurredAt('7:05', 0, NOW), '2026-10-05T22:05:00.000Z'); // KST 10-06 07:05
  assert.equal(resolveOccurredAt('25:00', 0, NOW), NOW.toISOString());
  assert.equal(resolveOccurredAt(null, 0, NOW), NOW.toISOString());
  assert.equal(resolveOccurredAt(null, 1, NOW), '2026-10-05T03:00:00.000Z'); // 어제 정오
  assert.equal(resolveOccurredAt('12:00', 99, NOW), '2026-10-06T03:00:00.000Z'); // 이상한 days_ago 는 오늘
});

test('스키마의 enum 은 계약 목록과 같다', () => {
  const props = PARSE_SCHEMA.properties.records.items.properties;
  assert.deepEqual(props.foods.items.properties.tags.items.enum, FOOD_TAGS);
  assert.deepEqual(props.exercises.items.properties.code.enum, EXERCISE_CODES);
  assert.deepEqual([...FOOD_TAGS].sort(), ['alcohol', 'carbonated', 'fried', 'snack', 'sugary_drink', 'zero_sugar_drink']);
});

test('말한 양은 그대로, 말하지 않은 양은 0과 빈 단위로 남는다', () => {
  const raw = {
    records: [
      {
        kind: 'meal',
        time: '08:00',
        days_ago: 0,
        foods: [
          { name: '닭가슴살스테이크', quantity: 100, unit: 'g', kcal: 180, carb_g: 2, protein_g: 26, fat_g: 7, tags: [] },
          { name: '찐양배추', quantity: 5, unit: '장', kcal: 30, carb_g: 6, protein_g: 2, fat_g: 0, tags: [] },
          { name: '요거트', quantity: 0, unit: '컵', kcal: 100, carb_g: 12, protein_g: 5, fat_g: 3, tags: [] },
          { name: '사과', kcal: 50, carb_g: 13, protein_g: 0, fat_g: 0, tags: [] },
        ],
        exercises: [],
        confidence: 0.9,
      },
    ],
  };
  const [meal] = normalizeParse(raw, '아침식사 ...', NOW).records;
  assert.deepEqual(
    meal.foods.map((f) => [f.name, f.quantity, f.unit]),
    [
      ['닭가슴살스테이크', 100, 'g'],
      ['찐양배추', 5, '장'],
      ['요거트', 0, ''], // 양이 0이면 단위가 있어도 지운다
      ['사과', 0, ''], // 양 항목이 아예 없어도 같은 약속
    ],
  );
});

test('buildPrompt: 현재 한국 시각과 사용자 문장이 들어간다', () => {
  const prompt = buildPrompt('스쿼트 15개 3세트 함', NOW);
  assert.ok(prompt.includes('2026-10-06 12:40'));
  assert.ok(prompt.includes('사용자 문장: 스쿼트 15개 3세트 함'));
});

test('buildPrompt: 이름·양·구분 제목·제품 영양정보 규칙이 들어간다', () => {
  const prompt = buildPrompt('아침식사 계란 2개', NOW);
  assert.ok(prompt.includes('그대로 적는다'));
  assert.ok(prompt.includes('quantity 를 0'));
  assert.ok(prompt.includes('구분 제목'));
  assert.ok(prompt.includes('표기 영양정보'));
});

test('buildPrompt·buildAudioPrompt: 마크애니 주소 별칭과 장소 간 거리 추정 규칙이 들어간다', () => {
  for (const prompt of [buildPrompt('마크애니에서 동대입구역으로 걸었어', NOW), buildAudioPrompt(NOW)]) {
    assert.ok(prompt.includes('"마크애니"는 장소로 쓰이면 "서울특별시 중구 퇴계로 286"'));
    assert.ok(prompt.includes('두 장소 사이 이동 거리를 대략 추정'));
  }
});

test('parseWith: 빈 입력은 Gemini를 부르지 않는다', async () => {
  let called = 0;
  const result = await parseWith(async () => {
    called += 1;
    return {};
  }, '   ', NOW);
  assert.equal(called, 0);
  assert.deepEqual(result.warnings, [MSG_EMPTY_INPUT]);
});

test('parseWith: 성공하면 정리된 결과, 질문에 스키마가 함께 간다', async () => {
  let seenSchema: object | null = null;
  const result = await parseWith(async (_parts, schema) => {
    seenSchema = schema;
    return lunchRaw;
  }, '  점심 싸이버거 세트  ', NOW);
  assert.equal(result.records[0].foods.length, 3);
  assert.equal(result.records[0].raw_text, '점심 싸이버거 세트');
  assert.equal(seenSchema, PARSE_SCHEMA);
});

test('parseWith: 키 없음은 그 안내를, 그 밖의 오류는 공통 안내를 돌려주고 멈추지 않는다', async () => {
  const noKey = await parseWith(async () => {
    throw new Error('Gemini API 키가 없습니다. 설정 화면에서 입력해 주세요.');
  }, '점심 먹음', NOW);
  assert.deepEqual(noKey.records, []);
  assert.deepEqual(noKey.warnings, ['Gemini API 키가 없습니다. 설정 화면에서 입력해 주세요.']);

  const offline = await parseWith(async () => {
    throw new TypeError('Failed to fetch');
  }, '점심 먹음', NOW);
  assert.deepEqual(offline.records, []);
  assert.deepEqual(offline.warnings, [MSG_AI_FAILED]);
});
