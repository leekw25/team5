// Gemini 음성 응답 다루기(순수 함수, 테스트용으로 gemini.ts 에서 분리)
// 응답 모양이 바뀌어도 찾을 수 있게: base64 음성(data)과 형식(mime_type/mimeType)이 있는 첫 객체
export function findAudio(node: unknown): { base64: string; mimeType: string } | null {
  if (!node || typeof node !== 'object') return null;
  const o = node as Record<string, unknown>;
  const mime = (o.mime_type ?? o.mimeType) as string | undefined;
  if (typeof o.data === 'string' && o.data.length > 100 && (!mime || mime.startsWith('audio'))) return { base64: o.data, mimeType: mime ?? 'audio/wav' };
  for (const v of Object.values(o)) {
    const found = findAudio(v);
    if (found) return found;
  }
  return null;
}

// 헤더 없는 24kHz 모노 16비트 PCM → WAV(base64)
export function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcm = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
  const header = new DataView(new ArrayBuffer(44));
  const ascii = (at: number, s: string) => [...s].forEach((ch, i) => header.setUint8(at + i, ch.charCodeAt(0)));
  ascii(0, 'RIFF');
  header.setUint32(4, 36 + pcm.length, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true); // PCM
  header.setUint16(22, 1, true); // 모노
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  ascii(36, 'data');
  header.setUint32(40, pcm.length, true);
  const all = new Uint8Array(44 + pcm.length);
  all.set(new Uint8Array(header.buffer), 0);
  all.set(pcm, 44);
  let bin = '';
  for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode(...all.subarray(i, i + 0x8000));
  return btoa(bin);
}
