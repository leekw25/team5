// 지유 한마디(AI 1줄 코칭, B P1)의 재료와 키가 없을 때 쓰는 기본 문장. 순수 함수라 테스트한다.
import type { DailyMission, HealthRecord } from '../shared/types/contract.ts';

export interface CoachFacts {
  done: number; // 오늘 성공한 미션 수
  total: number;
  missions: { title: string; done: boolean }[];
  kcal: number;
  protein_g: number;
  water_ml: number;
  burned: number;
  last: string | null; // 방금 기록한 문장(있으면)
  streak: number;
}

export function buildFacts(records: HealthRecord[], missions: DailyMission[], titles: (m: DailyMission) => string, streak: number): CoachFacts {
  const foods = records.flatMap((r) => r.foods);
  const last = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    done: missions.filter((m) => m.status === 'success').length,
    total: missions.length || 3,
    missions: missions.map((m) => ({ title: titles(m), done: m.status === 'success' })),
    kcal: Math.round(foods.reduce((s, f) => s + f.kcal, 0)),
    protein_g: Math.round(foods.reduce((s, f) => s + f.protein_g, 0)),
    water_ml: records.reduce((s, r) => s + (r.water_ml ?? 0), 0),
    burned: Math.round(records.flatMap((r) => r.exercises).reduce((s, e) => s + e.kcal_burned, 0)),
    last: last?.raw_text ?? null,
    streak,
  };
}

const short = (title: string) => (title.length > 14 ? title.slice(0, 13).trim() + '…' : title);

// Gemini 키가 없거나 실패했을 때도 지유가 말할 수 있게 상황별 기본 문장
export function fallbackLine(f: CoachFacts): string {
  if (f.done >= f.total) return `미션 ${f.total}개 모두 완수! 연속 ${f.streak}일째, 오늘 정말 멋져요 🔥`;
  const left = f.missions.find((m) => !m.done);
  if (f.done === f.total - 1 && left) return `하나만 더! 「${short(left.title)}」만 하면 오늘 완벽해요 💪`;
  if (f.done > 0) return `좋아요, 벌써 ${f.done}개 했어요! 이 흐름 그대로 가 봐요 ✨`;
  return '기록 고마워요! 오늘 미션 하나씩 같이 채워 봐요 🙂';
}

export function coachPrompt(f: CoachFacts): string {
  return [
    "너는 건강 기록 앱 '핏로그'의 캐릭터 '지유'(20대, 밝고 다정한 코치)다.",
    '아래 오늘 상황을 보고, 사용자가 방금 기록한 직후에 건넬 한마디를 친근한 해요체 한 문장(40자 이내)으로 써라.',
    '칭찬 하나 또는 남은 미션을 향한 짧은 응원 하나만. 숫자를 지어내지 말고, 이모지는 1개까지.',
    JSON.stringify(f),
  ].join('\n');
}
