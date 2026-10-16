// A-F10 단백질 측정의 계산 부분. 같은 문장을 캐시 없이 여러 번 파싱해 단백질 합계와 소요 시간을 표로 만든다.
// 이 표를 멘토에게 전달하면 시연 목표값(단백질 기준)을 정하는 데 쓴다.
import type { ParseResult } from '../../shared/types/contract.ts';

export interface RunResult {
  ok: boolean; // 기록이 1개 이상 나왔는가
  ms: number; // 걸린 시간(밀리초)
  protein_g: number;
  kcal: number;
  items: number; // 음식 항목 수
  note: string; // 실패 사유 등
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// parse 를 한 번 실행하고 결과를 한 줄로 요약한다. nowMs 를 받아 시간 측정을 테스트할 수 있다.
export async function measureRun(parse: () => Promise<ParseResult>, nowMs: () => number = Date.now): Promise<RunResult> {
  const start = nowMs();
  const result = await parse();
  const ms = nowMs() - start;
  const foods = result.records.flatMap((r) => r.foods);
  return {
    ok: result.records.length > 0,
    ms,
    protein_g: round1(foods.reduce((sum, f) => sum + f.protein_g, 0)),
    kcal: Math.round(foods.reduce((sum, f) => sum + f.kcal, 0)),
    items: foods.length,
    note: result.warnings.join(' '),
  };
}

export interface RunSummary {
  count: number;
  okCount: number;
  proteinMin: number;
  proteinMax: number;
  proteinAvg: number;
  msAvg: number;
}

// 성공한 회차만으로 단백질 최소·최대·평균을, 모든 회차로 평균 시간을 계산한다.
export function summarizeRuns(runs: RunResult[]): RunSummary {
  const ok = runs.filter((r) => r.ok);
  const proteins = ok.map((r) => r.protein_g);
  return {
    count: runs.length,
    okCount: ok.length,
    proteinMin: proteins.length ? Math.min(...proteins) : 0,
    proteinMax: proteins.length ? Math.max(...proteins) : 0,
    proteinAvg: proteins.length ? round1(proteins.reduce((a, b) => a + b, 0) / proteins.length) : 0,
    msAvg: runs.length ? Math.round(runs.reduce((sum, r) => sum + r.ms, 0) / runs.length) : 0,
  };
}

// 멘토에게 그대로 붙여 넣을 수 있는 표(마크다운)
export function toTableText(sentence: string, runs: RunResult[]): string {
  const summary = summarizeRuns(runs);
  const lines = [
    '문장: ' + sentence,
    '',
    '| 회차 | 단백질(g) | 칼로리(kcal) | 항목 수 | 시간(ms) | 비고 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...runs.map((r, i) => '| ' + (i + 1) + ' | ' + (r.ok ? r.protein_g : '-') + ' | ' + (r.ok ? r.kcal : '-') + ' | ' + r.items + ' | ' + r.ms + ' | ' + (r.ok ? '' : r.note) + ' |'),
    '',
    '성공 ' + summary.okCount + '/' + summary.count + '회, 단백질 최소 ' + summary.proteinMin + 'g, 최대 ' + summary.proteinMax + 'g, 평균 ' + summary.proteinAvg + 'g, 평균 시간 ' + summary.msAvg + 'ms',
  ];
  return lines.join('\n');
}
