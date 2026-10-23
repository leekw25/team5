// 최근 AI 오류 기록(A-F06, A-F09). AI 호출이 실패하면 사용자에게는 쉬운 안내만 보여 주고,
// 진짜 원인(구글이 돌려준 오류 내용)은 여기에 남겨 개발 도구 화면에서 볼 수 있게 한다.
// 앱이 켜져 있는 동안만 메모리에 보관한다(저장소에 쓰지 않는다). API 키는 어떤 경우에도 남기지 않는다.

export type AiSource = 'text' | 'voice' | 'photo';

export interface AiErrorEntry {
  at: string; // 오류가 난 시각(ISO)
  source: AiSource;
  message: string; // 오류 내용(키는 가려짐)
  context: string; // 어떤 입력이었는지(글자 수, 녹음 형식·크기 등)
}

const MAX_ENTRIES = 5; // 최신 5개만 보관
const MAX_LENGTH = 600;
const KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;

let entries: AiErrorEntry[] = [];

// 오류 → 보여 줄 글. 키 모양의 글자는 가리고, 줄바꿈은 공백으로, 너무 길면 자른다.
export function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(KEY_PATTERN, '[키 가림]').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
}

export function recordAiError(source: AiSource, error: unknown, now: Date = new Date(), context = ''): void {
  entries = [{ at: now.toISOString(), source, message: describeError(error), context: describeError(context) }, ...entries].slice(0, MAX_ENTRIES);
}

// 최신 오류가 맨 앞
export function getAiErrors(): AiErrorEntry[] {
  return entries;
}

export function clearAiErrors(): void {
  entries = [];
}

// base64 글자 수로 대략의 파일 크기(바이트)를 구한다. 오류 원인(빈 파일, 너무 큰 파일)을 가늠하는 데 쓴다.
export function approxBytes(base64: string): number {
  return Math.round(base64.length * 0.75);
}

// 1024바이트 이상이면 'KB', 그보다 작으면 '바이트'로 보여 준다(작은 파일이 '0KB'로 뭉개지지 않게).
export function formatSize(bytes: number): string {
  return bytes >= 1024 ? Math.round(bytes / 1024) + 'KB' : bytes + '바이트';
}
