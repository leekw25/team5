// 지유 목소리: 브라우저 기본 음성 읽기(Web Speech API). 추가 패키지·비용 없음. 휴대폰 앱(네이티브)에서는 조용히 넘어간다.
// ponytail: 네이티브 앱에서도 읽어야 하면 expo-speech 를 추가한다(Expo Go 지원).
const KEY = 'fitlog:voice';
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const store = typeof localStorage !== 'undefined' ? localStorage : null;

export const voiceSupported = () => !!synth;
export const isVoiceOn = () => !!synth && store?.getItem(KEY) !== 'off'; // 기본 켜짐
export const setVoiceOn = (on: boolean) => {
  store?.setItem(KEY, on ? 'on' : 'off');
  if (!on) synth?.cancel();
};

// 한국어 목소리 중 여성 목소리로 알려진 이름을 먼저 고른다(기기마다 다름)
function koreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = synth?.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ko')) ?? [];
  return voices.find((v) => /yuna|heami|sun-hi|female|여|google 한국/i.test(v.name)) ?? voices[0];
}

// 이모지는 읽지 않게 지우고 읽는다. force 면 목소리 꺼짐이어도 읽는다(리포트 '들려주기' 버튼).
export function speak(text: string, force = false): boolean {
  if (!synth || (!force && !isVoiceOn())) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}|️/gu, '').trim());
  u.lang = 'ko-KR';
  const v = koreanVoice();
  if (v) u.voice = v;
  u.rate = 1.05;
  u.pitch = 1.15;
  synth.speak(u);
  return true;
}

export const stopSpeaking = () => synth?.cancel();
