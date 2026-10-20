// 오늘 홈 맨 위 카드(Stitch '오늘 홈'). 오늘 미션 달성 수와 연속 달성은 이미경님 미션 저장소(daily_missions)에서 읽는다.
// 달성 수(0~3)에 따라 지유 일러스트가 바뀐다.
import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { missionsRepo } from '@/data';
import { onMissionsUpdated } from '@/features/mission/missionEvents.ts';
import { calcStreak, MISSIONS_PER_DAY, STREAK_LOOKBACK_DAYS } from '@/features/reward/streak.ts';
import { titleFor } from '@/features/reward/titles.ts';
import { addDays } from '@/shared/date';
import { Pop, Reveal } from './motion';
import { card, color, font, radius, text } from './theme';

// celebrate: 화면을 보는 중에 오늘 미션이 3개가 되는 순간에만 연출 정보(연속 일수)가 들어온다(처음 열 때 이미 3개면 없음)
export function useMissionSummary(dayKey: string) {
  const [summary, setSummary] = useState({ done: 0, streak: 0 });
  const [celebrate, setCelebrate] = useState<{ streak: number } | null>(null);
  const [tick, setTick] = useState(0);
  const lastDone = useRef<number | null>(null);
  useEffect(() => {
    let ignore = false;
    Promise.all([missionsRepo.listByDay(dayKey), missionsRepo.listDayStatus(addDays(dayKey, -STREAK_LOOKBACK_DAYS), dayKey)])
      .then(([missions, statuses]) => {
        if (ignore) return;
        const done = missions.filter((m) => m.status === 'success').length;
        const streak = calcStreak(statuses, dayKey);
        if (lastDone.current !== null && lastDone.current < MISSIONS_PER_DAY && done >= MISSIONS_PER_DAY) setCelebrate({ streak });
        lastDone.current = done;
        setSummary({ done, streak });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [dayKey, tick]);
  useEffect(() => onMissionsUpdated((day) => day === dayKey && setTick((n) => n + 1)), [dayKey]);
  return { ...summary, celebrate, dismissCelebrate: () => setCelebrate(null) };
}

// 이미경님 제안: 0개면 지쳐서 구부정한 지유 → 미션을 채울수록 표정이 밝아지고 자세가 펴진다(Stitch 4단계 시트).
const JIYU = [
  { src: require('../../assets/illustrations/jiyu-stage0.jpg'), label: '지쳐서 구부정하게 서 있는 지유' },
  { src: require('../../assets/illustrations/jiyu-stage1.jpg'), label: '물병을 들고 조금 기운을 차린 지유' },
  { src: require('../../assets/illustrations/jiyu-stage2.jpg'), label: '바른 자세로 주먹을 쥐고 웃는 지유' },
  { src: require('../../assets/illustrations/jiyu-stage3.jpg'), label: '팔에 힘을 주며 자신감 있게 웃는 지유' },
];

export function HeroCard({ done, streak, name, line, onReplay }: { done: number; streak: number; name?: string; line?: string | null; onReplay?: () => void }) {
  const total = MISSIONS_PER_DAY;
  const rate = Math.round((done / total) * 100);
  const jiyu = JIYU[Math.min(done, JIYU.length - 1)];
  return (
    <Reveal style={{ ...card, backgroundColor: color.cream, borderColor: color.creamLine, padding: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={text.script}>Good job today! ✨</Text>
        {!!name && <Text style={{ ...text.section, color: color.primary }}>{name}님,</Text>}
        <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30 }}>
          오늘 미션 {total}개 중{'\n'}
          <Text style={{ color: color.primary, textDecorationLine: 'underline' }}>{done}개</Text> 완료했어요!
        </Text>
        {streak > 0 && (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text>🔥</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.ink }}>
              연속 {streak}일 달성{titleFor(streak) ? ` · ${titleFor(streak)?.name}` : ''}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.creamLine, gap: 18 }}>
          <View>
            <Text style={text.caption}>남은 미션</Text>
            <Text style={{ ...text.body, fontWeight: '700' }}>{done >= total ? '모두 완료!' : `앞으로 ${total - done}개`}</Text>
          </View>
          <View>
            <Text style={text.caption}>오늘 달성률</Text>
            <Text style={{ ...text.body, fontWeight: '700', color: color.primary }}>{rate}% 달성</Text>
          </View>
        </View>
      </View>
      <View style={{ width: 112, borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: '#fff', overflow: 'hidden', alignSelf: 'center' }}>
        <Pop key={done}>
          <Image source={jiyu.src} style={{ width: 112, height: 132 }} resizeMode="cover" accessibilityLabel={jiyu.label} />
        </Pop>
      </View>
      </View>
      {!!line && (
        // 지유 말풍선: 새 한마디가 올 때마다 튀어나오고, 🔊 를 누르면 다시 읽어 준다
        <Pop key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderColor: color.primaryLine, borderWidth: 1.5, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 }}>
          <View style={{ position: 'absolute', top: -7, right: 48, width: 12, height: 12, backgroundColor: color.surface, borderLeftWidth: 1.5, borderTopWidth: 1.5, borderColor: color.primaryLine, transform: [{ rotate: '45deg' }] }} />
          <Text style={{ ...text.body, fontSize: 14, flex: 1, fontWeight: '600' }}>
            <Text style={{ color: color.primary, fontWeight: '800' }}>지유 </Text>
            {line}
          </Text>
          {onReplay && (
            <Pressable accessibilityRole="button" accessibilityLabel="지유 목소리 다시 듣기" onPress={onReplay} hitSlop={8}>
              <MaterialIcons name="volume-up" size={20} color={color.primary} />
            </Pressable>
          )}
        </Pop>
      )}
    </Reveal>
  );
}
