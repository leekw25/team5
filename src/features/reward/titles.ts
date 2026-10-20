// 연속 달성 칭호(이미경님 제안, 10일마다 1개 · 10~300일). 3/3 완수가 이어진 날 수로 정한다.
import { addDays } from '../../shared/date.ts';
import type { DayStatus } from '../../shared/types/contract.ts';
import { isComplete } from './streak.ts';

export interface StreakTitle {
  days: number;
  name: string;
  english: string;
  description: string;
}

export const STREAK_TITLES: StreakTitle[] = [
  { days: 10, name: '점화자', english: 'The Igniter', description: '시작의 망설임을 이겨내고 첫 불씨를 당긴 자' },
  { days: 20, name: '루틴 비기너', english: 'Routine Beginner', description: '작심삼일을 6번 넘어서며 리듬을 잡기 시작한 자' },
  { days: 30, name: '습관의 개척자', english: 'Habit Pioneer', description: '첫 1개월의 장벽을 부수고 습관의 궤도에 오른 자' },
  { days: 40, name: '강철의 집중', english: 'Steadfast', description: '흔들리는 일상 속에서도 자신과의 약속을 지켜낸 자' },
  { days: 50, name: '하프 센추리언', english: 'Half Centurion', description: '반백 일의 여정을 완주하며 단단해진 몸과 마음' },
  { days: 60, name: '루틴 아키텍트', english: 'Routine Architect', description: '두 달 동안 무너지지 않는 건강한 하루를 설계한 자' },
  { days: 70, name: '칠흑의 러너', english: 'Unyielding Runner', description: '어떤 변명과 핑계도 묵묵히 지나쳐 온 자' },
  { days: 80, name: '신념의 증명자', english: 'Proof of Will', description: '의지가 아닌 시스템으로 하루를 움직이는 경지' },
  { days: 90, name: '계절의 지배자', english: 'Season Master', description: '한 계절(3개월) 전체를 건강함으로 채운 자' },
  { days: 100, name: '백일의 신화', english: 'The Centurion', description: '완전히 새로운 나로 재탄생한 기적의 주인공' },
  { days: 110, name: '불꽃의 계승자', english: 'Flame Keeper', description: '100일의 영광에 안주하지 않고 다음 걸음을 내딛는 자' },
  { days: 120, name: '바디 마에스트로', english: 'Body Maestro', description: '내 몸의 컨디션과 리듬을 완벽하게 조율하는 지휘자' },
  { days: 130, name: '지치지 않는 심장', english: 'Relentless Heart', description: '피로와 귀찮음을 넘어서는 지속성의 힘' },
  { days: 140, name: '페이스 메이커', english: 'Ultimate Pacemaker', description: '어떤 속도에도 휘말리지 않고 자신만의 보폭을 걷는 자' },
  { days: 150, name: '빛나는 성취', english: 'Golden Stride', description: '150일 동안 축적된 노력으로 스스로 빛을 내는 자' },
  { days: 160, name: '철인의 자격', english: 'Ironbound', description: '타협 없는 꾸준함으로 몸에 강인함을 새긴 자' },
  { days: 170, name: '규율의 수호자', english: 'Guardian of Discipline', description: '하루의 끝을 반드시 성취로 매듭짓는 자' },
  { days: 180, name: '반년의 지배자', english: 'Half-Year Master', description: '반년(6개월) 동안 일상을 완전히 개조한 훈련자' },
  { days: 190, name: '불굴의 챌린저', english: 'Unstoppable', description: '멈추는 법을 잊고 앞으로만 전진하는 에너지' },
  { days: 200, name: '두 개의 심장', english: 'Dual Core', description: '지치지 않는 체력과 멘탈을 모두 손에 쥔 자' },
  { days: 210, name: '그랜드 루티너', english: 'Grand Routiner', description: '노력하지 않아도 건강한 선택이 본능이 된 경지' },
  { days: 220, name: '시간을 다스리는 자', english: 'Time Ruler', description: '24시간 중 자신의 시간을 완벽히 통제하는 자' },
  { days: 230, name: '정상의 시야', english: 'Horizon Walker', description: '높은 산의 능선에 올라 정상을 마주한 베테랑' },
  { days: 240, name: '피트니스 세이지', english: 'Fitness Sage', description: '몸과 마음의 균형을 통달한 건강의 현자' },
  { days: 250, name: '쿼터 밀레니엄', english: 'Quarter Millennium', description: '250번의 하루를 모두 승리로 이끈 끈기의 상징' },
  { days: 260, name: '불멸의 관성', english: 'Eternal Momentum', description: '그 무엇도 가로막을 수 없는 거대한 추진력' },
  { days: 270, name: '삼계의 정복자', english: 'Conqueror of Three Seasons', description: '세 번의 계절(9개월)이 바뀌는 동안 흐트러짐 없던 자' },
  { days: 280, name: '한계 파괴자', english: 'Limit Breaker', description: '스스로 설정했던 과거의 모든 한계를 넘어선 자' },
  { days: 290, name: '새벽의 거인', english: 'Titan of Dawn', description: '전설의 문턱 앞에 당당한 발걸음으로 도달한 자' },
  { days: 300, name: '리빙 레전드', english: 'Living Legend', description: '300일의 땀방울로 역사를 쓴 살아있는 신화' },
];

// 지금 연속 일수로 가진 칭호(없으면 null)
export function titleFor(streak: number): StreakTitle | null {
  return [...STREAK_TITLES].reverse().find((t) => streak >= t.days) ?? null;
}

// 다음 칭호(300일을 넘으면 null)
export function nextTitle(streak: number): StreakTitle | null {
  return STREAK_TITLES.find((t) => streak < t.days) ?? null;
}

// 기록 기간 안에서 가장 길었던 3/3 연속 일수. 한 번 얻은 칭호는 연속이 끊겨도 '획득'으로 남긴다.
export function bestStreak(statuses: DayStatus[]): number {
  const complete = new Set(statuses.filter((s) => isComplete(s.success_count)).map((s) => s.day_key));
  let best = 0;
  for (const day of complete) {
    if (complete.has(addDays(day, -1))) continue; // 연속 구간의 첫날에서만 센다
    let run = 0;
    for (let d = day; complete.has(d); d = addDays(d, 1)) run += 1;
    best = Math.max(best, run);
  }
  return best;
}
