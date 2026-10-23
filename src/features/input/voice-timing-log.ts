// A-F02 음성 지연 측정(5회 표). 음성으로 기록할 때마다 "말이 끝난 뒤(끝내기 버튼) 저장까지 걸린 시간"을 쌓아 두고,
// 개발 도구 화면에서 멘토에게 그대로 전달할 수 있는 표로 보여 준다. 앱이 켜져 있는 동안만 메모리에 보관한다.
import { formatSeconds } from './voice-core.ts';

export interface VoiceRun {
  at: string; // 측정한 시각(ISO)
  ms: number; // 끝내기 버튼을 누른 뒤 저장까지 걸린 시간
  ok: boolean; // 기록이 저장되었는가
  transcript: string; // 받아 적은 말(없으면 빈 글자)
}

const MAX_RUNS = 10; // 최근 10번까지만 보관
let runs: VoiceRun[] = [];

export function recordVoiceRun(run: VoiceRun): void {
  runs = [...runs, run].slice(-MAX_RUNS);
}

export function getVoiceRuns(): VoiceRun[] {
  return runs;
}

export function clearVoiceRuns(): void {
  runs = [];
}

export interface VoiceSummary {
  count: number;
  okCount: number;
  msAvg: number; // 저장에 성공한 회차의 평균
  msMin: number;
  msMax: number;
}

// 시간 통계는 저장에 성공한 회차만으로 계산한다(실패한 회차의 시간은 기준이 아니다).
export function summarizeVoiceRuns(list: VoiceRun[]): VoiceSummary {
  const ok = list.filter((r) => r.ok).map((r) => r.ms);
  return {
    count: list.length,
    okCount: ok.length,
    msAvg: ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : 0,
    msMin: ok.length ? Math.min(...ok) : 0,
    msMax: ok.length ? Math.max(...ok) : 0,
  };
}

// 멘토에게 그대로 붙여 넣을 수 있는 표(마크다운)
export function voiceTableText(list: VoiceRun[]): string {
  const s = summarizeVoiceRuns(list);
  return [
    '| 회차 | 걸린 시간 | 저장 | 들은 말 |',
    '| --- | --- | --- | --- |',
    ...list.map((r, i) => '| ' + (i + 1) + ' | ' + formatSeconds(r.ms) + ' | ' + (r.ok ? '성공' : '실패') + ' | ' + (r.transcript.slice(0, 30) || '-') + ' |'),
    '',
    '성공 ' + s.okCount + '/' + s.count + '회, 평균 ' + formatSeconds(s.msAvg) + ', 최소 ' + formatSeconds(s.msMin) + ', 최대 ' + formatSeconds(s.msMax) + ' (끝내기 버튼을 누른 뒤 저장까지)',
  ].join('\n');
}
