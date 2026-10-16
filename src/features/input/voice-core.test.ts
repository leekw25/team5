import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioFromBase64, audioMimeFromUri, extractAudio, formatSeconds } from './voice-core.ts';
import {
  AUDIO_SCHEMA,
  buildAudioPrompt,
  MIN_AUDIO_BYTES,
  MSG_AI_FAILED,
  MSG_NOTHING_FOUND_VOICE,
  MSG_NOTHING_HEARD,
  MSG_VOICE_TOO_SHORT,
  parseAudioWith,
  PARSE_SCHEMA,
} from './parse-core.ts';
import { clearAiErrors, getAiErrors } from './ai-error-log.ts';
import type { GeminiInput } from './parse-core.ts';
import { DEMO_SENTENCE } from './demo-cache.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 2026-10-06 12:40
const AUDIO = { mimeType: 'audio/m4a', base64: 'A'.repeat(4000) }; // 약 3000바이트: 빈 파일 기준(2000바이트)을 넘는 크기

// Gemini가 음성에 돌려줄 법한 답
const squatAnswer = {
  transcript: '스쿼트 15개 3세트 했어',
  records: [
    {
      kind: 'exercise',
      time: null,
      days_ago: 0,
      foods: [],
      exercises: [{ name: '스쿼트', code: 'squat', body_parts: ['하체'], sets: 3, reps: 15, kcal_burned: 40 }],
      water_ml: null,
      confidence: 0.95,
    },
  ],
};

test('audioMimeFromUri: 확장자로 Gemini 오디오 형식을 정한다', () => {
  assert.equal(audioMimeFromUri('file:///data/user/0/cache/Audio/recording-1.m4a'), 'audio/m4a');
  assert.equal(audioMimeFromUri('file:///a/b.WAV'), 'audio/wav');
  assert.equal(audioMimeFromUri('file:///a/b.aac'), 'audio/aac');
  assert.equal(audioMimeFromUri('file:///a/b.m4a?x=1'), 'audio/m4a');
  assert.equal(audioMimeFromUri('file:///a/b.unknown'), null);
  assert.equal(audioMimeFromUri('file:///a/noext'), null);
  assert.equal(audioMimeFromUri(null), null);
});

test('extractAudio: data 주소에서 base64 를 꺼내고 형식은 확장자를 먼저 본다', () => {
  assert.deepEqual(extractAudio('data:application/octet-stream;base64,QUJD', 'file:///r.m4a'), { mimeType: 'audio/m4a', base64: 'QUJD' });
  assert.deepEqual(extractAudio('data:audio/wav;base64,QUJD', null), { mimeType: 'audio/wav', base64: 'QUJD' });
  assert.deepEqual(extractAudio('data:application/octet-stream;base64,QUJD', 'file:///r.bin'), { mimeType: 'audio/aac', base64: 'QUJD' });
  assert.deepEqual(extractAudio('data:;base64,QUJD', null), { mimeType: 'audio/aac', base64: 'QUJD' });
});

test('extractAudio: base64 가 아니거나 내용이 없으면 null', () => {
  assert.equal(extractAudio(null, null), null);
  assert.equal(extractAudio('', null), null);
  assert.equal(extractAudio('QUJD', null), null);
  assert.equal(extractAudio('data:audio/mp4;base64,', null), null);
  assert.equal(extractAudio('data:audio/mp4,QUJD', null), null);
  assert.equal(extractAudio('data:audio/mp4;base64', null), null);
});

test('formatSeconds: 밀리초를 소수 한 자리 초로', () => {
  assert.equal(formatSeconds(1840), '1.8초');
  assert.equal(formatSeconds(2000), '2.0초');
  assert.equal(formatSeconds(-5), '0.0초');
});

test('음성 질문: 같은 규칙에 받아 적기·말소리 없음 안내가 붙는다', () => {
  const prompt = buildAudioPrompt(NOW);
  assert.ok(prompt.includes('2026-10-06 12:40'));
  assert.ok(prompt.includes('그대로 적는다')); // 문장 입력과 같은 규칙
  assert.ok(prompt.includes('transcript'));
  assert.ok(prompt.includes('말소리가 없거나'));
});

test('음성 스키마: records 는 문장 입력과 똑같고 transcript 가 필수', () => {
  assert.equal(AUDIO_SCHEMA.properties.records, PARSE_SCHEMA.properties.records);
  assert.deepEqual(AUDIO_SCHEMA.required, ['transcript', 'records']);
});

test('parseAudioWith: Gemini 는 1번만, 질문 + 오디오 파트와 음성 스키마가 간다', async () => {
  let calls = 0;
  let seen: GeminiInput[] = [];
  let seenSchema: object | null = null;
  const result = await parseAudioWith(
    async (parts, schema) => {
      calls += 1;
      seen = parts;
      seenSchema = schema;
      return squatAnswer;
    },
    AUDIO,
    NOW,
  );
  assert.equal(calls, 1);
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[1], { inline_data: { mime_type: AUDIO.mimeType, data: AUDIO.base64 } });
  assert.equal(seenSchema, AUDIO_SCHEMA);
  assert.equal(result.transcript, '스쿼트 15개 3세트 했어');
  assert.deepEqual(result.warnings, []);
  const [record] = result.records;
  assert.equal(record.source, 'voice');
  assert.equal(record.raw_text, '스쿼트 15개 3세트 했어');
  assert.equal(record.occurred_at, NOW.toISOString());
  assert.deepEqual([record.exercises[0].code, record.exercises[0].sets, record.exercises[0].reps], ['squat', 3, 15]);
});

test('parseAudioWith: 말소리가 없으면(transcript 빈 글자) 기록 없이 안내', async () => {
  const silent = await parseAudioWith(async () => ({ transcript: '  ', records: [] }), AUDIO, NOW);
  assert.deepEqual(silent.records, []);
  assert.equal(silent.transcript, null);
  assert.deepEqual(silent.warnings, [MSG_NOTHING_HEARD]);
  // 답이 이상한 모양이어도 멈추지 않는다
  assert.deepEqual((await parseAudioWith(async () => null, AUDIO, NOW)).warnings, [MSG_NOTHING_HEARD]);
});

test('parseAudioWith: 들었지만 식단·운동이 없으면 음성용 안내, 받아 적은 말은 남는다', async () => {
  const result = await parseAudioWith(async () => ({ transcript: '오늘 날씨 좋다', records: [] }), AUDIO, NOW);
  assert.deepEqual(result.records, []);
  assert.equal(result.transcript, '오늘 날씨 좋다');
  assert.deepEqual(result.warnings, [MSG_NOTHING_FOUND_VOICE]);
});

test('parseAudioWith: 들은 말이 시연 문장이면 캐시 수치로 고정(띄어쓰기가 달라도)', async () => {
  const sums: number[] = [];
  for (const protein of [1, 50, 99]) {
    const result = await parseAudioWith(
      async () => ({
        transcript: DEMO_SENTENCE.replace(/ /g, ''), // 받아 적은 말은 띄어쓰기가 달라질 수 있다
        records: [
          {
            kind: 'meal',
            time: '12:30',
            days_ago: 0,
            foods: [{ name: '싸이버거', quantity: 1, unit: '개', kcal: 500, carb_g: 40, protein_g: protein, fat_g: 20, tags: [] }],
            exercises: [],
            confidence: 0.9,
          },
        ],
      }),
      AUDIO,
      NOW,
    );
    assert.deepEqual(result.records[0].foods.map((f) => f.name), ['싸이버거', '감자튀김', '제로콜라']);
    assert.equal(result.records[0].source, 'voice');
    sums.push(result.records[0].foods.reduce((sum, f) => sum + f.protein_g, 0));
  }
  assert.equal(new Set(sums).size, 1);
});

test('parseAudioWith: 키 없음은 그 안내를, 그 밖의 오류는 공통 안내를 주고 멈추지 않는다', async () => {
  const noKey = await parseAudioWith(async () => {
    throw new Error('Gemini API 키가 없습니다. 설정 화면에서 입력해 주세요.');
  }, AUDIO, NOW);
  assert.deepEqual(noKey.records, []);
  assert.deepEqual(noKey.warnings, ['Gemini API 키가 없습니다. 설정 화면에서 입력해 주세요.']);

  const offline = await parseAudioWith(async () => {
    throw new TypeError('Failed to fetch');
  }, AUDIO, NOW);
  assert.deepEqual(offline.records, []);
  assert.deepEqual(offline.warnings, [MSG_AI_FAILED]);
});

test('너무 작은(빈) 녹음 파일은 AI에 보내지 않고, 안내와 함께 원인(길이·크기)을 기록한다', async () => {
  clearAiErrors();
  let calls = 0;
  const result = await parseAudioWith(
    async () => {
      calls += 1;
      return squatAnswer;
    },
    { mimeType: 'audio/m4a', base64: 'A'.repeat(400), note: '녹음 3.2초, 파일 300바이트' }, // 약 300바이트
    NOW,
  );
  assert.equal(calls, 0);
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.warnings, [MSG_VOICE_TOO_SHORT]);
  const [entry] = getAiErrors();
  assert.equal(entry.source, 'voice');
  assert.equal(entry.context, '형식 audio/m4a, 크기 300바이트, 녹음 3.2초, 파일 300바이트');
  assert.ok(MIN_AUDIO_BYTES > 300);
});

test('녹음 파일이 충분히 크면 AI로 보낸다(기준 바로 위)', async () => {
  clearAiErrors();
  let calls = 0;
  const base64 = 'A'.repeat(Math.ceil(((MIN_AUDIO_BYTES + 10) * 4) / 3));
  await parseAudioWith(
    async () => {
      calls += 1;
      return squatAnswer;
    },
    { mimeType: 'audio/m4a', base64 },
    NOW,
  );
  assert.equal(calls, 1);
  assert.deepEqual(getAiErrors(), []);
});

test('AI가 거절하면 녹음기가 남긴 길이·크기 메모가 오류 기록에 함께 남는다', async () => {
  clearAiErrors();
  await parseAudioWith(
    async () => {
      throw new Error('Gemini 오류 400: INVALID_ARGUMENT');
    },
    { ...AUDIO, note: '녹음 4.1초, 파일 52000바이트' },
    NOW,
  );
  const [entry] = getAiErrors();
  assert.equal(entry.context, '형식 audio/m4a, 크기 3KB, 녹음 4.1초, 파일 52000바이트');
  assert.ok(entry.message.includes('400'));
});

test('audioFromBase64: base64 와 확장자로 오디오를 만들고, 내용이 없으면 null', () => {
  assert.deepEqual(audioFromBase64('QUJD', 'file:///cache/Audio/rec.m4a'), { mimeType: 'audio/m4a', base64: 'QUJD' });
  assert.deepEqual(audioFromBase64('QU\nJD ', 'file:///a/b.wav'), { mimeType: 'audio/wav', base64: 'QUJD' }); // 줄바꿈·공백은 지운다
  assert.deepEqual(audioFromBase64('QUJD', 'file:///a/b.unknown'), { mimeType: 'audio/aac', base64: 'QUJD' }); // 모르는 확장자는 기본값
  assert.equal(audioFromBase64('', 'file:///a/b.m4a'), null);
  assert.equal(audioFromBase64(null, null), null);
  assert.equal(audioFromBase64('  \n ', null), null);
});
