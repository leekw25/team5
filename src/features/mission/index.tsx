// 이미경님 작업 폴더(미션). 통합 때 멘토가 이 폴더를 통째로 가져간다.
// 컴포넌트 이름과 props는 contract.ts의 약속이라 바꾸지 않는다.
// B-F05 이벤트 구독 재판정, B-F06 미션 카드 3개, B-F07 성공 연출
// 통합 때 제목 줄·색만 Stitch '오늘 홈' 디자인으로 바꿨다(배정·판정·연출 흐름은 그대로).
// 이미경님 제안: 미션 200개 + 사용자 미션 중 랜덤 배정, 다시 뽑기(하루 5회), 직접 체크형 미션의 완료 버튼.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { missionsRepo, recordsRepo, userMissionsRepo } from '@/data';
import { onRecordsChanged } from '@/shared/events';
import type { DailyMission, MissionCardsProps } from '@/shared/types/contract';
import { color, font, radius, text } from '@/ui/theme';
import { MissionCard } from './MissionCard';
import { onCelebrate } from './missionEvents.ts';
import { pickDailySet, pickReroll, rerollsLeft } from './pool.ts';
import { syncDay, type DaySnapshot } from './sync.ts';

// 그날 처음 열 때 200개 + 내 미션에서 슬롯별로 하나씩 랜덤 배정
const loadUserMissions = () => userMissionsRepo.list().catch(() => []);
export { MyMissions } from './MyMissions';

const repos = { recordsRepo, missionsRepo, dailySet: async () => pickDailySet(await loadUserMissions()) };

export function MissionCards({ dayKey }: MissionCardsProps) {
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string[]>([]);

  // 배정(없을 때만) → 그날 기록 전체로 재판정 → 바뀐 미션만 저장
  const refresh = useCallback(() => {
    syncDay(repos, dayKey).then(
      (next) => {
        setSnapshot(next);
        setError(null);
      },
      (e: unknown) => setError(e instanceof Error ? e.message : '미션을 불러오지 못했습니다'),
    );
  }, [dayKey]);

  useEffect(() => {
    refresh();
    return onRecordsChanged((event) => {
      if (event.day_key === dayKey) refresh();
    });
  }, [dayKey, refresh]);

  useEffect(
    () =>
      onCelebrate((day, missionIds) => {
        if (day === dayKey) setCelebrating((prev) => [...prev, ...missionIds]);
      }),
    [dayKey],
  );

  const [busy, setBusy] = useState(false);
  // 저장한 뒤 다시 판정(직접 체크하면 성공 → 폭죽, 다시 뽑으면 새 미션으로 판정)
  const act = useCallback(
    async (task: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await task();
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장하지 못했습니다');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  const onReroll = (mission: DailyMission, today: DailyMission[]) =>
    act(async () => {
      const next = pickReroll(mission, today, await loadUserMissions());
      if (next) await missionsRepo.reroll(mission.id, next);
    });
  const onCheck = (mission: DailyMission) => act(() => missionsRepo.setChecked(mission.id, mission.checked_at ? null : new Date().toISOString()));

  const finishCelebration = useCallback((missionId: string) => {
    setCelebrating((prev) => prev.filter((id) => id !== missionId));
  }, []);

  const current = snapshot?.dayKey === dayKey ? snapshot : null;

  if (!current) {
    return (
      <View style={[styles.box, styles.center]}>
        {error ? (
          <>
            <Text style={styles.error}>미션을 불러오지 못했어요{'\n'}{error}</Text>
            <RetryButton onPress={refresh} />
          </>
        ) : (
          <>
            <ActivityIndicator color={color.primary} />
            <Text style={styles.muted}>오늘의 미션을 불러오는 중…</Text>
          </>
        )}
      </View>
    );
  }

  if (current.missions.length === 0) {
    return (
      <View style={[styles.box, styles.center]}>
        <Text style={styles.muted}>배정된 미션이 없어요</Text>
      </View>
    );
  }

  const left = rerollsLeft(current.missions);
  const total = current.missions.length;
  const done = current.missions.filter((m) => m.status === 'success').length;
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.heading}>오늘의 미션</Text>
        <View style={[styles.countPill, done === total && { backgroundColor: color.yellowSoft }]}>
          <Text style={[styles.count, done === total && styles.countDone]}>
            {total}개 중 {done}개
          </Text>
        </View>
        {/* 지난 미션 기록은 달력 탭에서 본다 */}
        <Link href="/calendar" style={{ marginLeft: 'auto' }}>
          <Text style={styles.more}>전체보기 ›</Text>
        </Link>
      </View>
      {done === total ? (
        <Text style={styles.allDone}>🎉 오늘 미션을 모두 완수했어요!</Text>
      ) : (
        <Text style={styles.muted}>마음에 안 드는 미션은 🔀 다시 뽑기 · 오늘 {left}회 남음</Text>
      )}
      {error && (
        <View style={styles.inlineError}>
          <Text style={styles.error}>새로 판정하지 못했어요: {error}</Text>
          <RetryButton onPress={refresh} />
        </View>
      )}
      {current.missions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          result={current.results.find((r) => r.mission.id === mission.id)}
          celebrating={celebrating.includes(mission.id)}
          onCelebrated={finishCelebration}
          busy={busy}
          canReroll={left > 0}
          onReroll={() => onReroll(mission, current.missions)}
          onCheck={() => onCheck(mission)}
        />
      ))}
    </View>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.retry}>
      <Text style={styles.retryText}>다시 시도</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { ...text.section },
  countPill: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  count: { fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary },
  countDone: { color: '#8A6A00' },
  more: { ...text.caption, fontSize: 13 },
  allDone: { ...text.caption, fontSize: 14, fontWeight: '700', color: color.primary },
  muted: { ...text.caption, fontSize: 12 },
  error: { ...text.caption, color: color.danger, textAlign: 'center' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  retry: { borderRadius: 999, borderWidth: 1, borderColor: color.line, paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { ...text.caption, color: color.ink },
});
