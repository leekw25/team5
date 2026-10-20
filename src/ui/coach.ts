// 지유 한마디: 기록을 저장하거나 미션을 체크하면 1.5초 뒤 오늘 상황을 보고 한 문장을 만들고(Gemini, 키 없으면 기본 문장) 소리 내어 읽는다.
import { useEffect, useState } from 'react';
import { missionsRepo, recordsRepo } from '@/data';
import { onMissionsUpdated } from '@/features/mission/missionEvents.ts';
import { describe } from '@/features/mission/pool.ts';
import { calcStreak, STREAK_LOOKBACK_DAYS } from '@/features/reward/streak.ts';
import { addDays } from '@/shared/date';
import { onRecordsChanged } from '@/shared/events';
import { generateJson, getApiKey } from '@/shared/gemini';
import { buildFacts, coachPrompt, fallbackLine, type CoachFacts } from './coach-core.ts';
import { speak } from './voice';

const SCHEMA = { type: 'object', properties: { line: { type: 'string' } }, required: ['line'] };

async function makeLine(f: CoachFacts): Promise<string> {
  if (!(await getApiKey())) return fallbackLine(f);
  try {
    const r = await generateJson<{ line: string }>([{ text: coachPrompt(f) }], SCHEMA);
    return r.line?.trim() || fallbackLine(f);
  } catch {
    return fallbackLine(f);
  }
}

export function useCoach(dayKey: string) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const run = () => {
      if (timer) clearTimeout(timer);
      // 미션 재판정이 저장될 시간을 주고, 연달아 오는 알림은 한 번으로 묶는다
      timer = setTimeout(async () => {
        const [records, missions, statuses] = await Promise.all([
          recordsRepo.listByDay(dayKey),
          missionsRepo.listByDay(dayKey),
          missionsRepo.listDayStatus(addDays(dayKey, -STREAK_LOOKBACK_DAYS), dayKey),
        ]).catch(() => [[], [], []] as const);
        const next = await makeLine(buildFacts([...records], [...missions], (m) => describe(m).title, calcStreak([...statuses], dayKey)));
        if (!alive) return;
        setLine(next);
        speak(next);
      }, 1500);
    };
    const offRecords = onRecordsChanged((e) => e.day_key === dayKey && e.reason === 'created' && run());
    const offMissions = onMissionsUpdated((day) => day === dayKey && run());
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      offRecords();
      offMissions();
    };
  }, [dayKey]);
  return { line, replay: () => line && speak(line, true) };
}
