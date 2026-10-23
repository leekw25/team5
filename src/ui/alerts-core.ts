// 헤더 알림(🔔): 오늘 지유가 알려 주는 미션 달성 소식. 순수 함수라 테스트한다.
import type { DailyMission } from '../shared/types/contract.ts';
import { SLOT_LABELS } from '../features/mission/catalog.ts';
import { titleFor } from '../features/reward/titles.ts';

export interface Alert {
  id: string;
  at: string; // ISO 시각
  time: string; // 한국 시각 HH:MM
  icon: 'check-circle' | 'celebration' | 'military-tech';
  title: string;
  body: string;
}

const KST_MS = 9 * 60 * 60 * 1000;
export const kstTime = (iso: string) => new Date(Date.parse(iso) + KST_MS).toISOString().slice(11, 16);

// 미션 하나 성공마다 1개, 3개 모두면 완수 1개, 그날 칭호 기준(10일 단위)에 닿았으면 칭호 1개. 최신이 위.
export function buildAlerts(missions: DailyMission[], titleOf: (m: DailyMission) => string, streak: number): Alert[] {
  const done = missions.filter((m) => m.status === 'success' && m.achieved_at);
  const alerts: Alert[] = done.map((m) => ({
    id: `mission-${m.id}`,
    at: m.achieved_at as string,
    time: kstTime(m.achieved_at as string),
    icon: 'check-circle',
    title: `${SLOT_LABELS[m.slot]} 미션 달성`,
    body: titleOf(m),
  }));
  if (missions.length > 0 && done.length === missions.length) {
    const last = done.map((m) => m.achieved_at as string).sort().at(-1) as string;
    alerts.push({ id: 'all-done', at: last, time: kstTime(last), icon: 'celebration', title: '오늘 미션 모두 완수!', body: `🔥 연속 ${streak}일째 완수 중이에요` });
    const t = titleFor(streak);
    if (t && t.days === streak) alerts.push({ id: `title-${t.days}`, at: last, time: kstTime(last), icon: 'military-tech', title: `새 칭호 「${t.name}」 획득`, body: t.description });
  }
  return alerts.sort((a, b) => b.at.localeCompare(a.at) || order(b) - order(a));
}

const order = (a: Alert) => (a.icon === 'military-tech' ? 2 : a.icon === 'celebration' ? 1 : 0); // 같은 시각이면 칭호 > 완수 > 미션

export const unreadCount = (alerts: Alert[], seenAt: string | null) => alerts.filter((a) => !seenAt || a.at > seenAt).length;
