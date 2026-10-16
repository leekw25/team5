import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractImage } from './photo-core.ts';
import { buildImagePrompt, MSG_AI_FAILED, MSG_NOTHING_FOUND_PHOTO, parseImageWith } from './parse-core.ts';
import type { GeminiInput } from './parse-core.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z');

test('extractImage: base64 가 있으면 그대로, 형식은 image/ 만 인정', () => {
  assert.deepEqual(extractImage({ base64: 'AAAA', mimeType: 'image/png' }), { mimeType: 'image/png', base64: 'AAAA' });
  assert.deepEqual(extractImage({ base64: 'AAAA', mimeType: null }), { mimeType: 'image/jpeg', base64: 'AAAA' });
  assert.deepEqual(extractImage({ base64: 'AAAA', mimeType: 'video/mp4' }), { mimeType: 'image/jpeg', base64: 'AAAA' });
});

test('extractImage: data: 머리말이 붙은 base64 와 웹의 data 주소', () => {
  assert.deepEqual(extractImage({ base64: 'data:image/jpeg;base64,BBBB' }), { mimeType: 'image/jpeg', base64: 'BBBB' });
  assert.deepEqual(extractImage({ uri: 'data:image/webp;base64,CCCC' }), { mimeType: 'image/webp', base64: 'CCCC' });
});

test('extractImage: 읽을 수 없으면 null', () => {
  assert.equal(extractImage(null), null);
  assert.equal(extractImage({}), null);
  assert.equal(extractImage({ uri: 'file:///a.jpg' }), null);
  assert.equal(extractImage({ base64: 'data:image/jpeg;base64,' }), null);
});

test('사진 질문: 음식 태그 규칙과 빈 결과 규칙이 들어간다', () => {
  const prompt = buildImagePrompt();
  assert.ok(prompt.includes('fried'));
  assert.ok(prompt.includes('records 를 빈 배열'));
  assert.ok(prompt.includes('눈대중'));
});

const pizzaRaw = {
  records: [
    {
      kind: 'meal',
      time: null,
      days_ago: 0,
      foods: [{ name: '피자', quantity: 2, unit: '조각', kcal: 540, carb_g: 60, protein_g: 22, fat_g: 24, tags: ['fried', '이상한태그'] }],
      exercises: [],
      confidence: 0.7,
    },
  ],
};

test('parseImageWith: 사진은 이미지 파트와 함께 보내고 source photo, raw_text 없음, 시각은 지금', async () => {
  let seen: GeminiInput[] = [];
  const result = await parseImageWith(
    async (parts) => {
      seen = parts;
      return pizzaRaw;
    },
    { mimeType: 'image/jpeg', base64: 'ZZZZ' },
    NOW,
  );
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[1], { inline_data: { mime_type: 'image/jpeg', data: 'ZZZZ' } });
  const [record] = result.records;
  assert.equal(record.source, 'photo');
  assert.equal(record.raw_text, null);
  assert.equal(record.occurred_at, NOW.toISOString());
  assert.deepEqual(record.foods[0].tags, ['fried']);
  assert.deepEqual(result.warnings, []);
});

test('parseImageWith: 음식이 없으면 사진용 안내, 오류가 나도 멈추지 않는다', async () => {
  const none = await parseImageWith(async () => ({ records: [] }), { mimeType: 'image/jpeg', base64: 'Z' }, NOW);
  assert.deepEqual(none.warnings, [MSG_NOTHING_FOUND_PHOTO]);
  const failed = await parseImageWith(
    async () => {
      throw new TypeError('Failed to fetch');
    },
    { mimeType: 'image/jpeg', base64: 'Z' },
    NOW,
  );
  assert.deepEqual(failed.records, []);
  assert.deepEqual(failed.warnings, [MSG_AI_FAILED]);
});
