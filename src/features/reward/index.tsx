// 이미경님 작업 폴더(리워드). 통합 때 멘토가 이 폴더를 통째로 가져간다.
// 컴포넌트 이름과 props는 contract.ts의 약속이라 바꾸지 않는다.
// B-F08 리워드 달력(성공 수 링, 완수 스탬프), B-F09 연속 달성
// 통합 때 화면만 Stitch '리워드 달력' 디자인으로 바꿨다(데이터 읽기·스트릭 계산은 그대로).
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { missionsRepo } from '@/data';
import { addDays, toDayKey } from '@/shared/date';
import type { RewardCalendarProps } from '@/shared/types/contract';
import { card, color, font, radius, text } from '@/ui/theme';
import { onMissionsUpdated } from '../mission/missionEvents.ts';
import { DayCell, ProgressRing, Stamp } from './DayCell';
import { buildMonthGrid, monthOf, shiftMonth } from './monthGrid.ts';
import { calcStreak, MISSIONS_PER_DAY, STREAK_LOOKBACK_DAYS } from './streak.ts';
import { bestStreak, nextTitle, STREAK_TITLES, titleFor } from './titles.ts';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const useNativeDriver = Platform.OS !== 'web';

interface CalendarData {
  monthKey: string;
  today: string;
  counts: Record<string, number>; // dayKey → 성공 수
  streak: number;
  best: number; // 기록 기간 중 최장 연속(획득한 칭호 판단)
}

export function RewardCalendar(_props: RewardCalendarProps) {
  const [monthKey, setMonthKey] = useState(() => monthOf(toDayKey()));
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const request = ++latestRequest.current; // 늦게 도착한 옛 응답이 새 화면을 덮지 않게
    const today = toDayKey();
    const grid = buildMonthGrid(monthKey);
    Promise.all([
      missionsRepo.listDayStatus(grid.first, grid.last),
      missionsRepo.listDayStatus(addDays(today, -STREAK_LOOKBACK_DAYS), today),
    ]).then(
      ([monthRows, streakRows]) => {
        if (request !== latestRequest.current) return;
        setData({
          monthKey,
          today,
          counts: Object.fromEntries(monthRows.map((row) => [row.day_key, row.success_count])),
          streak: calcStreak(streakRows, today),
          best: bestStreak(streakRows),
        });
        setError(null);
      },
      (e: unknown) => {
        if (request === latestRequest.current) setError(e instanceof Error ? e.message : '달력을 불러오지 못했습니다');
      },
    );
  }, [monthKey]);

  useEffect(() => {
    load();
    return onMissionsUpdated(() => load()); // 미션 판정이 저장되면 달력·스트릭을 다시 읽는다
  }, [load]);

  const grid = buildMonthGrid(monthKey);
  const current = data?.monthKey === monthKey ? data : null;
  const isThisMonth = monthKey === monthOf(toDayKey());

  return (
    <View style={styles.box}>
      <View style={styles.nav}>
        <Text style={styles.month}>
          {Number(monthKey.slice(0, 4))}년 {Number(monthKey.slice(5, 7))}월
        </Text>
        <View style={styles.navPill}>
          <Pressable onPress={() => setMonthKey((m) => shiftMonth(m, -1))} hitSlop={12} accessibilityLabel="이전 달">
            <MaterialIcons name="chevron-left" size={22} color={color.ink} />
          </Pressable>
          <Pressable onPress={() => setMonthKey(monthOf(toDayKey()))} hitSlop={8} accessibilityLabel="이번 달로">
            <View style={[styles.navDot, !isThisMonth && { backgroundColor: color.muted }]} />
          </Pressable>
          <Pressable onPress={() => setMonthKey((m) => shiftMonth(m, 1))} hitSlop={12} accessibilityLabel="다음 달">
            <MaterialIcons name="chevron-right" size={22} color={color.ink} />
          </Pressable>
        </View>
      </View>

      <StreakBanner streak={data?.streak ?? null} />

      <View style={styles.calendar}>
        <View style={[styles.week, styles.weekHead]}>
          {WEEKDAYS.map((name, i) => (
            <Text key={name} style={[styles.weekday, i === 0 && { color: color.danger }, i === 6 && { color: color.primary }]}>
              {name}
            </Text>
          ))}
        </View>

        {!current ? (
          <View style={styles.center}>
            {error ? (
              <>
                <Text style={styles.error}>
                  달력을 불러오지 못했어요{'\n'}
                  {error}
                </Text>
                <Pressable onPress={load} style={styles.retry}>
                  <Text style={text.caption}>다시 시도</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color={color.primary} />
            )}
          </View>
        ) : (
          grid.weeks.map((week) => (
            <View key={week.find(Boolean)} style={styles.week}>
              {week.map((day, i) =>
                day ? (
                  <DayCell key={day} dayKey={day} count={current.counts[day] ?? 0} isToday={day === current.today} isFuture={day > current.today} />
                ) : (
                  <View key={`blank-${i}`} style={styles.blank} />
                ),
              )}
            </View>
          ))
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.legendEmpty} />
            <Text style={styles.legendText}>미수행</Text>
          </View>
          <View style={styles.legendItem}>
            <ProgressRing count={2} size={16} />
            <Text style={styles.legendText}>1~2개</Text>
          </View>
          <View style={styles.legendItem}>
            <Stamp size={16} />
            <Text style={[styles.legendText, { color: color.ink, fontWeight: '700' }]}>{MISSIONS_PER_DAY}개 완수</Text>
          </View>
        </View>
      </View>

      {data && <TitleShelf streak={data.streak} best={data.best} />}
    </View>
  );
}

// 연속 달성 칭호 모음: 얻은 칭호(최장 연속 기준)와 다음 칭호
function TitleShelf({ streak, best }: { streak: number; best: number }) {
  const earned = STREAK_TITLES.filter((t) => best >= t.days);
  const next = nextTitle(best); // 아직 못 얻은 첫 칭호. 남은 날은 지금 연속 기준
  const current = titleFor(streak);
  return (
    <View style={styles.shelf}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={text.section}>연속 달성 칭호</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>
            {earned.length} / {STREAK_TITLES.length}
          </Text>
        </View>
      </View>
      {current && (
        <View style={styles.currentTitle}>
          <Text style={{ fontSize: 22 }}>🏅</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...text.body, fontWeight: '800' }}>
              {current.name} <Text style={text.caption}>{current.english}</Text>
            </Text>
            <Text style={text.caption}>{current.description}</Text>
          </View>
        </View>
      )}
      <View style={styles.chips}>
        {earned.map((t) => (
          <View key={t.days} style={styles.chipOn}>
            <Text style={styles.chipOnText}>
              {t.days}일 · {t.name}
            </Text>
          </View>
        ))}
        {next && (
          <View style={styles.chipOff}>
            <MaterialIcons name="lock-outline" size={13} color={color.muted} />
            <Text style={styles.chipOffText}>
              {next.days}일 · {next.name}
            </Text>
          </View>
        )}
      </View>
      {next && <Text style={text.caption}>3개 완수를 {next.days - streak}일 더 이어가면 「{next.name}」 칭호를 얻어요</Text>}
    </View>
  );
}

// 상단 연속 달성 카드. 숫자가 늘어나는 순간 한 번 튀어 오른다.
function StreakBanner({ streak }: { streak: number | null }) {
  const [pop] = useState(() => new Animated.Value(1));
  const previous = useRef(streak);

  useEffect(() => {
    if (streak !== null && previous.current !== null && streak > previous.current) {
      pop.setValue(1.5);
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver }).start();
    }
    previous.current = streak;
  }, [streak, pop]);

  return (
    <View style={styles.banner}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={text.script}>Keep going!</Text>
        {streak === null ? (
          <ActivityIndicator color={color.primary} style={{ alignSelf: 'flex-start' }} />
        ) : streak > 0 ? (
          <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30 }}>
            <Text style={{ color: color.primary, textDecorationLine: 'underline' }}>{streak}일째</Text> 매일 완수 중이에요
          </Text>
        ) : (
          <Text style={{ ...text.headline, fontSize: 19, lineHeight: 27 }}>오늘 미션 3개를 완수하면 연속 달성이 시작돼요</Text>
        )}
        {!!streak && (
          <Animated.View style={[styles.streakPill, { transform: [{ scale: pop }] }]}>
            <Text style={styles.streakPillText}>
              🔥 연속 {streak}일 달성{titleFor(streak) ? ` · ${titleFor(streak)?.name}` : ''}
            </Text>
          </Animated.View>
        )}
      </View>
      <Image source={require('../../../assets/illustrations/landing-feat-stamp.jpg')} accessibilityLabel="달력에 도장을 찍는 지유" style={styles.bannerImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontFamily: font.body, fontSize: 24, fontWeight: '800', color: color.ink },
  navPill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  banner: { ...card, backgroundColor: color.cream, borderColor: '#F3E6CC', padding: 18, flexDirection: 'row', gap: 12, alignItems: 'center' },
  bannerImage: { width: 96, height: 96, borderRadius: 14, borderWidth: 1, borderColor: color.line },
  streakPill: { alignSelf: 'flex-start', backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  streakPillText: { fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.ink },
  calendar: { ...card, padding: 12, gap: 2 },
  week: { flexDirection: 'row' },
  weekHead: { borderBottomWidth: 1, borderBottomColor: color.line, marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: font.body, fontSize: 13, color: color.muted, paddingVertical: 8 },
  blank: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  error: { ...text.caption, color: color.danger, textAlign: 'center' },
  retry: { borderRadius: 999, borderWidth: 1, borderColor: color.line, paddingHorizontal: 12, paddingVertical: 6 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, borderTopWidth: 1, borderTopColor: color.line, marginTop: 8, paddingTop: 12, paddingBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendEmpty: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#F1F3F8' },
  legendText: { ...text.caption, fontSize: 12 },
  shelf: { ...card, padding: 18, gap: 12 },
  countPill: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary },
  currentTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.card, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipOn: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipOnText: { fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary },
  chipOff: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: color.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  chipOffText: { fontFamily: font.body, fontSize: 12, color: color.muted },
});
