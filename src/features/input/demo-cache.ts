// A-F08 시연 문장 응답 캐시: 시연 문장과 그 파싱 결과를 앱 안에 저장해 두고,
// 같은 문장이 들어오면 Gemini 대신 이 값을 쓴다(결과 고정, 비행기 모드에서도 동작).
// 수치는 shared/mocks/demo.ts 의 값을 그대로 쓴다. 멘토가 그 값을 갱신하면 여기도 같이 바뀐다.
import { lunchParsed } from '../../shared/mocks/demo.ts';
import type { RawParse } from './parse-core.ts';

export const DEMO_SENTENCE = '오늘 점심에 맘스터치 싸이버거 세트 먹고 콜라는 제로로 바꿨어';

// 띄어쓰기·문장부호·대소문자 차이는 같은 문장으로 본다.
export function normalizeKey(text: string): string {
  return text.replace(/[\s.,!?~]/g, '').toLowerCase();
}

const CACHE = new Map<string, RawParse>([
  [
    normalizeKey(DEMO_SENTENCE),
    {
      records: [
        {
          kind: 'meal',
          time: '12:30',
          days_ago: 0,
          foods: lunchParsed.foods,
          exercises: [],
          water_ml: null,
          confidence: lunchParsed.confidence,
        },
      ],
    },
  ],
]);

// 캐시에 있으면 Gemini 답변과 같은 모양의 값을, 없으면 null 을 돌려준다.
export function lookupDemoCache(text: string): RawParse | null {
  return CACHE.get(normalizeKey(text)) ?? null;
}
