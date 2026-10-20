// 주간 리포트 계산(순수 함수). 화면은 이 결과를 그리기만 한다.
import type { DailyMission, HealthRecord, MissionSlot } from '@/shared/types/contract';
import { getMissionDef, SLOT_LABELS, TODAY_MISSION_SET } from '../features/mission/catalog.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const shift = (dayKey: string, days: number) => new Date(Date.parse(dayKey) + days * DAY_MS).toISOString().slice(0, 10);

// 그 날짜가 속한 주의 월요일('YYYY-MM-DD')
export function mondayOf(dayKey: string): string {
  const weekday = new Date(Date.parse(dayKey)).getUTCDay(); // 0=일
  return shift(dayKey, weekday === 0 ? -6 : 1 - weekday);
}

// 월요일부터 7일
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => shift(monday, i));

export interface DaySummary {
  dayKey: string;
  counted: boolean; // 오늘 이후 날짜는 false(아직 오지 않은 날)
  records: number;
  kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  burned: number; // 운동으로 소모한 kcal
  done: number; // 그날 성공한 미션 수 0~3(이미경님 판정 결과 daily_missions)
}

export interface WeekSummary {
  days: DaySummary[];
  done: number;
  total: number; // 지난 날 × 3
  rate: number; // 0~100
  records: number;
  avgKcal: number; // 기록이 있는 날 평균
  burned: number; // 이번 주 운동 소모 kcal 합계
  macroPct: { carb: number; protein: number; fat: number }; // 칼로리 기준 비율(%), 합 100
  streak: number; // 이번 주 3/3 최장 연속 일수
  missionDays: { title: string; slot: string; days: number }[]; // 슬롯(식단·생활·운동)별 달성 일수
}

// 오늘의 미션 고정 세트(식단·생활·운동)의 이름. 다음 주 추천 목록에 쓴다.
const SLOT_TITLES = TODAY_MISSION_SET.map((m) => {
  const def = getMissionDef(m.mission_code);
  const target = def ? m.params[def.paramKey] : undefined;
  return { slot: m.slot, title: def && target !== undefined ? def.title(target) : m.mission_code };
});

const succeeded = (missions: DailyMission[], slot?: MissionSlot) => missions.filter((m) => m.status === 'success' && (!slot || m.slot === slot));

export function summarizeWeek(byDay: { dayKey: string; records: HealthRecord[]; missions: DailyMission[] }[], today: string): WeekSummary {
  const days: DaySummary[] = byDay.map(({ dayKey, records, missions }) => {
    const foods = records.flatMap((r) => r.foods);
    const sum = (k: 'kcal' | 'carb_g' | 'protein_g' | 'fat_g') => foods.reduce((s, f) => s + f[k], 0);
    return {
      dayKey,
      counted: dayKey <= today,
      records: records.length,
      kcal: sum('kcal'),
      carb_g: sum('carb_g'),
      protein_g: sum('protein_g'),
      fat_g: sum('fat_g'),
      burned: records.flatMap((r) => r.exercises).reduce((s, e) => s + e.kcal_burned, 0),
      done: succeeded(missions).length,
    };
  });
  const counted = days.filter((d) => d.counted);
  const done = counted.reduce((s, d) => s + d.done, 0);
  const total = counted.length * 3;
  const eaten = counted.filter((d) => d.kcal > 0);

  // 탄·단 1g = 4kcal, 지 1g = 9kcal
  const c = eaten.reduce((s, d) => s + d.carb_g * 4, 0);
  const p = eaten.reduce((s, d) => s + d.protein_g * 4, 0);
  const f = eaten.reduce((s, d) => s + d.fat_g * 9, 0);
  const all = c + p + f;
  const carb = all ? Math.round((c / all) * 100) : 0;
  const protein = all ? Math.round((p / all) * 100) : 0;

  let streak = 0;
  let run = 0;
  for (const d of counted) {
    run = d.done === 3 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }

  return {
    days,
    done,
    total,
    rate: total ? Math.round((done / total) * 100) : 0,
    records: counted.reduce((s, d) => s + d.records, 0),
    burned: Math.round(counted.reduce((s, d) => s + d.burned, 0)),
    avgKcal: eaten.length ? Math.round(eaten.reduce((s, d) => s + d.kcal, 0) / eaten.length) : 0,
    macroPct: all ? { carb, protein, fat: 100 - carb - protein } : { carb: 0, protein: 0, fat: 0 },
    streak,
    missionDays: SLOT_TITLES.map(({ slot, title }) => ({
      title,
      slot: SLOT_LABELS[slot],
      days: byDay.filter((d) => d.dayKey <= today && succeeded(d.missions, slot).length > 0).length,
    })),
  };
}
