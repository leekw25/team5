// 지유 목소리. Gemini 음성 모델(뉴럴 목소리 'Leda', 밝고 다정한 20대 톤)로 읽고,
// 키가 없거나 실패하면 기기 목소리 중 자연음(Natural·Online·Neural·Google)을 골라 읽는다.
// 웹(PWA·TWA)에서만 동작한다. ponytail: 네이티브 앱에서도 필요하면 expo-audio 로 같은 WAV 를 재생한다.
import { generateSpeech, getApiKey } from '@/shared/gemini';
import { clipUrl, CLIPS, JIYU_STYLE, JIYU_VOICE } from './voice-clips.ts';

const KEY = 'fitlog:voice';

const isWeb = typeof window !== 'undefined' && typeof Audio !== 'undefined';
const synth = isWeb && 'speechSynthesis' in window ? window.speechSynthesis : null;
const store = typeof localStorage !== 'undefined' ? localStorage : null;

export const voiceSupported = () => isWeb;
export const isVoiceOn = () => isWeb && store?.getItem(KEY) !== 'off'; // 기본 켜짐
export const setVoiceOn = (on: boolean) => {
  store?.setItem(KEY, on ? 'on' : 'off');
  if (!on) stopSpeaking();
};

const cache = new Map<string, string>(); // 문장 → 음성(data URL). 다시 듣기는 바로 재생
let playing: HTMLAudioElement | null = null;
let turn = 0; // 연달아 부르면 마지막 것만 재생

export function stopSpeaking() {
  turn += 1;
  playing?.pause();
  playing = null;
  synth?.cancel();
}

// 이모지는 읽지 않게 지운다. force 면 목소리 꺼짐이어도 읽는다(리포트 '들려주기', 다시 듣기 버튼).
export function speak(text: string, force = false): boolean {
  if (!isWeb || (!force && !isVoiceOn())) return false;
  stopSpeaking();
  void speakNow(text.replace(/\p{Extended_Pictographic}|️/gu, '').trim(), turn);
  return true;
}

async function speakNow(text: string, myTurn: number) {
  try {
    if (await getApiKey()) {
      let url = cache.get(text);
      if (!url) {
        const audio = await generateSpeech(text, JIYU_VOICE, JIYU_STYLE);
        url = `data:${audio.mimeType};base64,${audio.base64}`;
        cache.set(text, url);
      }
      if (myTurn !== turn) return;
      playing = new Audio(url);
      await playing.play();
      return;
    }
  } catch {
    // 뉴럴 목소리 실패 → 기기 목소리
  }
  if (myTurn === turn) deviceSpeak(text);
}

// 기기 목소리: 한국어 중 자연음 목소리를 먼저, 없으면 여성 목소리로 알려진 이름, 그다음 아무 한국어
function deviceSpeak(text: string) {
  if (!synth) return;
  const ko = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ko'));
  const voice = ko.find((v) => /natural|online|neural/i.test(v.name)) ?? ko.find((v) => /google/i.test(v.name)) ?? ko.find((v) => /yuna|heami|sun-hi|여/i.test(v.name)) ?? ko[0];
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  if (voice) u.voice = voice;
  u.rate = 1.05;
  u.pitch = 1.1;
  synth.speak(u);
}

// ── 미리 만든 음성 파일(미션 완료 순간) ──
// public/voice/<id>.wav 를 재생한다. 파일이 없거나 재생이 막히면 같은 문장을 위 speak 로 읽는다.
// onceKey(예: 날짜)를 주면 그 기기에서 하루 한 번만 재생한다(미션 완료 뒤 행동할 때마다 반복되지 않게).
const playedKey = (onceKey: string, id: string) => `fitlog:played:${onceKey}:${id}`;

export function playClip(id: string, onceKey?: string): Promise<void> {
  if (!isVoiceOn()) return Promise.resolve();
  if (onceKey) {
    if (store?.getItem(playedKey(onceKey, id))) return Promise.resolve();
    store?.setItem(playedKey(onceKey, id), '1');
  }
  stopSpeaking();
  const myTurn = turn;
  return new Promise((resolve) => {
    const audio = new Audio(clipUrl(id));
    playing = audio;
    let failed = false;
    audio.onended = () => resolve();
    const fallback = () => {
      if (failed) return;
      failed = true;
      if (myTurn !== turn || !CLIPS[id]) return resolve();
      speak(CLIPS[id], true); // 파일이 아직 없으면 바로 생성해 읽기
      setTimeout(resolve, 1500 + CLIPS[id].length * 110); // 다음 음성(칭호)이 끊지 않게 대략 읽는 시간만큼 기다린다
    };
    audio.onerror = fallback;
    audio.play().catch(fallback);
  });
}
