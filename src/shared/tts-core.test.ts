import assert from 'node:assert/strict';
import test from 'node:test';
import { findAudio, pcmToWavBase64 } from './tts-core.ts';

test('findAudio: 응답 어디에 있든 음성 base64 를 찾는다', () => {
  const data = 'A'.repeat(200);
  assert.deepEqual(findAudio({ steps: [{ content: [{ type: 'text', text: 'hi' }, { type: 'audio', mime_type: 'audio/wav', data }] }] }), { base64: data, mimeType: 'audio/wav' });
  assert.equal(findAudio({ steps: [{ content: [{ data: 'short' }] }] }), null);
});

test('pcmToWavBase64: 44바이트 WAV 헤더(24kHz 모노 16비트)를 붙인다', () => {
  const pcm = btoa(String.fromCharCode(1, 2, 3, 4));
  const wav = Uint8Array.from(atob(pcmToWavBase64(pcm)), (c) => c.charCodeAt(0));
  assert.equal(wav.length, 48);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(new DataView(wav.buffer).getUint32(24, true), 24000);
  assert.deepEqual([...wav.slice(44)], [1, 2, 3, 4]);
});
