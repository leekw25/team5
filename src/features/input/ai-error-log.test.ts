import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { approxBytes, clearAiErrors, describeError, formatSize, getAiErrors, recordAiError } from './ai-error-log.ts';
import { parseAudioWith, parseImageWith, parseWith } from './parse-core.ts';

const NOW = new Date('2026-10-13T03:00:00.000Z');
const FAKE_KEY = 'AIza' + 'B'.repeat(35); // 시험용 가짜 키 모양

beforeEach(() => clearAiErrors());

test('describeError: 키 모양은 가리고, 줄바꿈은 공백으로, 길면 자른다', () => {
  assert.equal(describeError(new Error('키 ' + FAKE_KEY + ' 오류')), '키 [키 가림] 오류');
  assert.equal(describeError(new Error('a\n  b\n\nc')), 'a b c');
  assert.equal(describeError('x'.repeat(2000)).length, 600);
  assert.equal(describeError('글자 오류'), '글자 오류'); // Error 가 아니어도 글자로
});

test('recordAiError: 최신이 맨 앞, 5개까지만, 지우면 빈 목록', () => {
  for (let i = 1; i <= 7; i += 1) recordAiError('text', new Error('오류 ' + i), NOW, '맥락 ' + i);
  const list = getAiErrors();
  assert.equal(list.length, 5);
  assert.deepEqual(list.map((e) => e.message), ['오류 7', '오류 6', '오류 5', '오류 4', '오류 3']);
  assert.equal(list[0].context, '맥락 7');
  assert.equal(list[0].at, NOW.toISOString());
  clearAiErrors();
  assert.deepEqual(getAiErrors(), []);
});

test('기록에는 API 키가 남지 않는다(오류 글과 맥락 모두)', () => {
  recordAiError('voice', new Error('Gemini 오류 400: ' + FAKE_KEY), NOW, '키 ' + FAKE_KEY);
  const [entry] = getAiErrors();
  assert.ok(!entry.message.includes('AIza'));
  assert.ok(!entry.context.includes('AIza'));
});

test('approxBytes·formatSize: base64 글자 수로 대략의 크기, 작은 파일은 바이트로', () => {
  assert.equal(approxBytes('A'.repeat(4096)), 3072);
  assert.equal(approxBytes(''), 0);
  assert.equal(formatSize(3072), '3KB');
  assert.equal(formatSize(1024), '1KB');
  assert.equal(formatSize(300), '300바이트');
  assert.equal(formatSize(0), '0바이트');
});

const body400 = 'Gemini 오류 400: { "error": { "code": 400, "message": "Request contains an invalid argument.", "status": "INVALID_ARGUMENT" } }';

test('글 입력이 실패하면 원인이 기록된다(종류 text, 글자 수)', async () => {
  await parseWith(
    async () => {
      throw new Error(body400);
    },
    '점심 먹음',
    NOW,
  );
  const [entry] = getAiErrors();
  assert.equal(entry.source, 'text');
  assert.ok(entry.message.includes('INVALID_ARGUMENT'));
  assert.equal(entry.context, '글 5자'); // '점심 먹음' = 띄어쓰기 포함 5자
});

test('음성 입력이 실패하면 원인이 기록된다(종류 voice, 녹음 형식과 크기)', async () => {
  await parseAudioWith(
    async () => {
      throw new Error(body400);
    },
    { mimeType: 'audio/m4a', base64: 'A'.repeat(4096) },
    NOW,
  );
  const [entry] = getAiErrors();
  assert.equal(entry.source, 'voice');
  assert.equal(entry.context, '형식 audio/m4a, 크기 3KB');
  assert.ok(entry.message.includes('400'));
});

test('사진 입력이 실패하면 원인이 기록된다(종류 photo)', async () => {
  await parseImageWith(
    async () => {
      throw new TypeError('Failed to fetch');
    },
    { mimeType: 'image/jpeg', base64: 'A'.repeat(8192) },
    NOW,
  );
  const [entry] = getAiErrors();
  assert.equal(entry.source, 'photo');
  assert.equal(entry.context, '형식 image/jpeg, 크기 6KB');
});

test('성공하면 아무것도 기록하지 않는다', async () => {
  await parseWith(async () => ({ records: [] }), '점심 먹음', NOW);
  assert.deepEqual(getAiErrors(), []);
});
