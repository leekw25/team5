// 미리 만들어 두는 지유 음성(미션 완료 순간용). 문장이 고정이라 파일로 저장해 두고 바로 재생한다.
// 파일 위치: public/voice/<id>.wav (웹에서 /voice/<id>.wav). 만들기: npm run make:voice (Gemini 키는 실행할 때만 넣는다)
// 앱(voice.ts)과 만들기 스크립트(scripts/make-voice-clips.mjs)가 이 목록을 같이 쓴다.
import { STREAK_TITLES } from '../features/reward/titles.ts';

export const JIYU_VOICE = 'Leda'; // Gemini 음성 이름(문서 설명: Youthful)
export const JIYU_STYLE = '밝고 다정한 20대 여성 건강 코치처럼, 경쾌하고 따뜻하게, 조금 빠르게';

// 받침이 있으면 '을', 없으면 '를'
const object = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
};

export const CLIPS: Record<string, string> = {
  'mission-diet': '식단 미션 성공! 오늘도 잘 챙겨 먹었어요.',
  'mission-life': '생활 미션 성공! 좋은 습관이 쌓이고 있어요.',
  'mission-exercise': '운동 미션 성공! 몸이 한결 가벼워졌죠?',
  'all-done': '미션 세 개 모두 완수! 오늘 정말 멋져요!',
  ...Object.fromEntries(STREAK_TITLES.map((t) => [`title-${t.days}`, `축하해요! 연속 ${t.days}일, 새 칭호 ${t.name}${object(t.name)} 얻었어요!`])),
};

export const clipUrl = (id: string) => `/voice/${id}.wav`;
