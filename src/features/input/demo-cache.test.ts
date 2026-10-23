import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SENTENCE, lookupDemoCache, normalizeKey } from './demo-cache.ts';
import { parseWith } from './parse-core.ts';

const NOW = new Date('2026-10-06T03:40:00.000Z'); // KST 12:40

test('normalizeKey: 띄어쓰기·문장부호·대소문자는 무시', () => {
  assert.equal(normalizeKey(' 오늘 점심에,  A b. '), '오늘점심에ab');
});

test('시연 문장은 띄어쓰기가 달라도 캐시에 걸리고, 다른 문장은 걸리지 않는다', () => {
  assert.ok(lookupDemoCache(DEMO_SENTENCE));
  assert.ok(lookupDemoCache(DEMO_SENTENCE.replace(/ /g, '') + '.'));
  assert.equal(lookupDemoCache('스쿼트 15개 3세트 함'), null);
});

test('캐시된 시연 문장은 Gemini를 부르지 않고 같은 결과를 5번 낸다', async () => {
  let called = 0;
  const generate = async () => {
    called += 1;
    throw new Error('호출되면 안 된다(비행기 모드 가정)');
  };
  const sums: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const result = await parseWith(generate, DEMO_SENTENCE, NOW);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.records[0].foods.map((f) => f.name), ['싸이버거', '감자튀김', '제로콜라']);
    assert.equal(result.records[0].occurred_at, '2026-10-06T03:30:00.000Z'); // 오늘 12:30
    sums.push(result.records[0].foods.reduce((sum, f) => sum + f.protein_g, 0));
  }
  assert.equal(called, 0);
  assert.equal(new Set(sums).size, 1);
});

test('useCache false 면 캐시를 건너뛰고 Gemini를 부른다', async () => {
  let called = 0;
  await parseWith(
    async () => {
      called += 1;
      return { records: [] };
    },
    DEMO_SENTENCE,
    NOW,
    { useCache: false },
  );
  assert.equal(called, 1);
});
