// 오늘 홈 맨 위 카드(Stitch '오늘 홈'). 오늘 미션 달성 수와 연속 달성은 이미경님 미션 저장소(daily_missions)에서 읽는다.
// 달성 수(0~3)에 따라 지유 일러스트가 바뀐다.
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { missionsRepo } from '@/data';
import { onMissionsUpdated } from '@/features/mission/missionEvents.ts';
import { calcStreak, MISSIONS_PER_DAY, STREAK_LOOKBACK_DAYS } from '@/features/reward/streak.ts';
import { addDays } from '@/shared/date';
import { Pop, Reveal } from './motion';
import { card, color, font, radius, text } from './theme';

export function useMissionSummary(dayKey: string) {
  const [summary, setSummary] = useState({ done: 0, streak: 0 });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let ignore = false;
    Promise.all([missionsRepo.listByDay(dayKey), missionsRepo.listDayStatus(addDays(dayKey, -STREAK_LOOKBACK_DAYS), dayKey)])
      .then(([missions, statuses]) => {
        if (!ignore) setSummary({ done: missions.filter((m) => m.status === 'success').length, streak: calcStreak(statuses, dayKey) });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [dayKey, tick]);
  useEffect(() => onMissionsUpdated((day) => day === dayKey && setTick((n) => n + 1)), [dayKey]);
  return summary;
}

const JIYU = [
  { src: require('../../assets/illustrations/jiyu-ok.jpg'), label: '손으로 OK 사인을 하는 지유' },
  { src: require('../../assets/illustrations/jiyu-water.jpg'), label: '물병을 들고 엄지척하는 지유' },
  { src: require('../../assets/illustrations/jiyu-v.jpg'), label: '브이를 하며 윙크하는 지유' },
  { src: require('../../assets/illustrations/jiyu-cool.jpg'), label: '선글라스를 쓰고 자신감 있게 웃는 지유' },
];

export function HeroCard({ done, streak, name }: { done: number; streak: number; name?: string }) {
  const total = MISSIONS_PER_DAY;
  const rate = Math.round((done / total) * 100);
  const jiyu = JIYU[Math.min(done, JIYU.length - 1)];
  return (
    <Reveal style={{ ...card, backgroundColor: color.cream, borderColor: '#F3E6CC', padding: 18, flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={text.script}>Good job today! ✨</Text>
        {!!name && <Text style={{ ...text.section, color: color.primary }}>{name}님,</Text>}
        <Text style={text.headline}>
          오늘 미션 {total}개 중{'\n'}
          <Text style={{ color: color.primary, textDecorationLine: 'underline' }}>{done}개</Text> 완료했어요!
        </Text>
        {streak > 0 && (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text>🔥</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.ink }}>연속 {streak}일 달성</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3E6CC', gap: 18 }}>
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
    </Reveal>
  );
}
