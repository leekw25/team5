// 미션 완료 음성 파일 만들기(멘토가 한 번 실행). 문장 목록은 src/ui/voice-clips.ts, 결과는 public/voice/<id>.wav
// Gemini 키는 실행할 때만 넣는다(파일·코드에 저장하지 않음). 이미 있는 파일은 건너뛰고, --force 면 다시 만든다.
//   PowerShell:  $env:GEMINI_API_KEY="..."; npm run make:voice
import fs from 'node:fs';
import path from 'node:path';
import { findAudio, pcmToWavBase64 } from '../src/shared/tts-core.ts';
import { CLIPS, JIYU_STYLE, JIYU_VOICE } from '../src/ui/voice-clips.ts';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('GEMINI_API_KEY 가 필요합니다. 예) PowerShell: $env:GEMINI_API_KEY="..."; npm run make:voice');
  process.exit(1);
}
const MODEL = 'gemini-3.8-flash-tts'; // src/shared/gemini.ts 의 GEMINI_TTS_MODEL 과 같게
const OUT = 'public/voice';
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

let made = 0;
for (const [id, text] of Object.entries(CLIPS)) {
  const file = path.join(OUT, `${id}.wav`);
  if (!force && fs.existsSync(file)) {
    console.log(`있음  ${id}`);
    continue;
  }
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: JIYU_STYLE }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: JIYU_VOICE }] },
    }),
  });
  if (!res.ok) {
    console.error(`실패  ${id}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const audio = findAudio(await res.json());
  if (!audio) {
    console.error(`실패  ${id}: 응답에 음성이 없습니다`);
    process.exit(1);
  }
  const wav = /l16|pcm/i.test(audio.mimeType) ? pcmToWavBase64(audio.base64) : audio.base64;
  fs.writeFileSync(file, Buffer.from(wav, 'base64'));
  made += 1;
  console.log(`만듦  ${id}  "${text}"`);
}
console.log(`\n완료: 새로 만든 파일 ${made}개 → ${OUT}`);
