// A-F02 음성 입력의 계산 부분. 녹음 파일의 주소·내용에서 Gemini 에 보낼 오디오(형식 + base64)를 뽑는다.
// React·Expo 와 무관한 순수 함수라 node:test 로 검사한다. 녹음기를 부르는 부분은 voice-device.ts 에 있다.
import type { AudioInput } from './parse-core.ts';

// Gemini 에 알려 줄 오디오 형식 이름. 녹음 파일의 확장자로 정한다.
// Gemini 문서의 지원 형식에는 audio/m4a 가 따로 있고 audio/mp4 는 없다. 앞서 audio/mp4 와 audio/aac 로 보냈을 때는 모두 400 오류가 났다.
// Expo 녹음 기본값(HIGH_QUALITY)은 .m4a 파일(MP4 안에 담은 AAC)이라 audio/m4a 로 알려 준다.
// audio/aac 는 .aac 파일(ADTS) 용이다.
const MIME_BY_EXT = new Map<string, string>([
  ['m4a', 'audio/m4a'],
  ['mp4', 'audio/mp4'],
  ['aac', 'audio/aac'],
  ['wav', 'audio/wav'],
  ['mp3', 'audio/mp3'],
  ['ogg', 'audio/ogg'],
  ['flac', 'audio/flac'],
]);
const DEFAULT_MIME = 'audio/aac';

// 'file:///.../recording.m4a' → 'audio/mp4'. 모르는 확장자면 null.
export function audioMimeFromUri(uri: string | null | undefined): string | null {
  const ext = uri ? /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(uri)?.[1]?.toLowerCase() : undefined;
  return (ext && MIME_BY_EXT.get(ext)) || null;
}

// 파일을 'data:...;base64,내용' 글자로 읽은 값(dataUrl)에서 오디오를 뽑는다. 읽을 수 없으면 null.
// 형식은 확장자를 먼저 보고, 없으면 dataUrl 머리말의 audio/ 형식, 그것도 없으면 기본값을 쓴다.
export function extractAudio(dataUrl: string | null | undefined, uri: string | null | undefined): AudioInput | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const head = dataUrl.slice(5, comma); // 예: 'audio/mp4;base64'
  if (!head.split(';').includes('base64')) return null;
  const base64 = dataUrl.slice(comma + 1);
  if (!base64) return null;
  const headMime = head.split(';')[0];
  const mimeType = audioMimeFromUri(uri) ?? (headMime.startsWith('audio/') ? headMime : DEFAULT_MIME);
  return { mimeType, base64 };
}

// 파일을 base64 글자로 읽은 값에서 오디오를 만든다. 내용이 없으면 null. 형식은 파일 확장자로 정하고, 모르면 기본값을 쓴다.
export function audioFromBase64(base64: string | null | undefined, uri: string | null | undefined): AudioInput | null {
  const data = base64 ? base64.replace(/\s/g, '') : '';
  return data ? { mimeType: audioMimeFromUri(uri) ?? DEFAULT_MIME, base64: data } : null;
}

// 1840 → '1.8초' (말이 끝난 뒤 저장까지 걸린 시간을 화면에 보여 주는 데 쓴다)
export function formatSeconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1) + '초';
}
