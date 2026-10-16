import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { clearVoiceRuns, getVoiceRuns, recordVoiceRun, summarizeVoiceRuns, voiceTableText } from './voice-timing-log.ts';
import type { VoiceRun } from './voice-timing-log.ts';

const run = (ms: number, ok = true, transcript = '스쿼트 15개 3세트 했어'): VoiceRun => ({ at: '2026-10-13T04:00:00.000Z', ms, ok, transcript });

beforeEach(() => clearVoiceRuns());

test('쌓은 순서대로 보관하고, 10번까지만 남기고, 지우면 비어 있다', () => {
  for (let i = 1; i <= 12; i += 1) recordVoiceRun(run(i * 100));
  const list = getVoiceRuns();
  assert.equal(list.length, 10);
  assert.equal(list[0].ms, 300); // 오래된 2개는 밀려남
  assert.equal(list[9].ms, 1200);
  clearVoiceRuns();
  assert.deepEqual(getVoiceRuns(), []);
});

test('summarizeVoiceRuns: 성공한 회차만으로 평균·최소·최대', () => {
  const summary = summarizeVoiceRuns([run(1000), run(2000), run(9000, false)]);
  assert.deepEqual(summary, { count: 3, okCount: 2, msAvg: 1500, msMin: 1000, msMax: 2000 });
  assert.deepEqual(summarizeVoiceRuns([]), { count: 0, okCount: 0, msAvg: 0, msMin: 0, msMax: 0 });
});

test('voiceTableText: 회차별 행과 요약 줄, 긴 말은 자르고 빈 말은 -', () => {
  const text = voiceTableText([run(1840), run(2210, false, ''), run(1500, true, '가'.repeat(50))]);
  assert.ok(text.includes('| 1 | 1.8초 | 성공 | 스쿼트 15개 3세트 했어 |'));
  assert.ok(text.includes('| 2 | 2.2초 | 실패 | - |'));
  assert.ok(text.includes('| 3 | 1.5초 | 성공 | ' + '가'.repeat(30) + ' |'));
  assert.ok(text.includes('성공 2/3회, 평균 1.7초, 최소 1.5초, 최대 1.8초'));
});
