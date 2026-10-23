import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureRun, summarizeRuns, toTableText } from './measure-core.ts';
import type { RunResult } from './measure-core.ts';
import type { ParseResult } from '../../shared/types/contract.ts';

function result(proteins: number[], kcals: number[] = []): ParseResult {
  return {
    transcript: null,
    warnings: [],
    records: [
      {
        occurred_at: '2026-10-06T03:30:00.000Z',
        kind: 'meal',
        source: 'text',
        raw_text: 'x',
        foods: proteins.map((p, i) => ({ name: 'f' + i, quantity: 1, unit: '개', kcal: kcals[i] ?? 100, carb_g: 0, protein_g: p, fat_g: 0, tags: [] })),
        exercises: [],
        water_ml: null,
        confidence: 0.9,
      },
    ],
  };
}

test('measureRun: 단백질·칼로리 합계, 항목 수, 걸린 시간', async () => {
  let t = 1000;
  const run = await measureRun(
    async () => {
      t += 1850;
      return result([24, 4.04, 0], [560, 300, 0]);
    },
    () => t,
  );
  assert.deepEqual(run, { ok: true, ms: 1850, protein_g: 28, kcal: 860, items: 3, note: '' });
});

test('measureRun: 실패(기록 없음)는 ok false 와 사유', async () => {
  const run = await measureRun(async () => ({ transcript: null, records: [], warnings: ['인터넷 문제'] }), () => 0);
  assert.equal(run.ok, false);
  assert.equal(run.note, '인터넷 문제');
  assert.equal(run.items, 0);
});

test('summarizeRuns: 성공한 회차로 단백질 통계, 전체로 평균 시간', () => {
  const runs: RunResult[] = [
    { ok: true, ms: 1000, protein_g: 24, kcal: 800, items: 3, note: '' },
    { ok: true, ms: 2000, protein_g: 30, kcal: 900, items: 3, note: '' },
    { ok: false, ms: 3000, protein_g: 0, kcal: 0, items: 0, note: '실패' },
  ];
  assert.deepEqual(summarizeRuns(runs), { count: 3, okCount: 2, proteinMin: 24, proteinMax: 30, proteinAvg: 27, msAvg: 2000 });
  assert.deepEqual(summarizeRuns([]), { count: 0, okCount: 0, proteinMin: 0, proteinMax: 0, proteinAvg: 0, msAvg: 0 });
});

test('toTableText: 회차별 행과 요약 줄이 들어간다', () => {
  const text = toTableText('문장', [
    { ok: true, ms: 1500, protein_g: 28, kcal: 860, items: 3, note: '' },
    { ok: false, ms: 900, protein_g: 0, kcal: 0, items: 0, note: '키 없음' },
  ]);
  assert.ok(text.includes('문장: 문장'));
  assert.ok(text.includes('| 1 | 28 | 860 | 3 | 1500 |  |'));
  assert.ok(text.includes('| 2 | - | - | 0 | 900 | 키 없음 |'));
  assert.ok(text.includes('성공 1/2회, 단백질 최소 28g, 최대 28g, 평균 28g, 평균 시간 1200ms'));
});
