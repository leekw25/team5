// 달력 한 칸(B-F08): 그날 성공 수(0~3)를 세 조각 링으로, 3이면 완수 스탬프. 3이 되는 순간 스탬프가 찍힌다.
// 통합 때 화면만 Stitch '리워드 달력' 디자인으로 바꿨다(날짜 위·원 아래, 완수는 노란 별 스탬프, 오늘은 파란 테두리).
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, font } from '@/ui/theme';
import { isComplete, MISSIONS_PER_DAY } from './streak.ts';

const RING_SIZE = 34;
const useNativeDriver = Platform.OS !== 'web';

export function ProgressRing({ count, size = RING_SIZE }: { count: number; size?: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  const segment = circumference / MISSIONS_PER_DAY - gap;
  // 원의 선은 3시 방향에서 시작하므로 1/4 바퀴 당겨 12시부터 시계 방향으로 조각을 놓는다
  return (
    <Svg width={size} height={size}>
      {Array.from({ length: MISSIONS_PER_DAY }, (_, i) => (
        <Circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={i < count ? color.primary : color.primarySoft}
          strokeWidth={stroke}
          strokeDasharray={[segment, circumference - segment]}
          strokeDashoffset={circumference / 4 - (i * circumference) / MISSIONS_PER_DAY - gap / 2}
        />
      ))}
    </Svg>
  );
}

// 3/3 완수 스탬프: 노란 원 + 별
export function Stamp({ size = RING_SIZE }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="star" size={size * 0.55} color={color.ink} />
    </View>
  );
}

interface Props {
  dayKey: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

export function DayCell({ dayKey, count, isToday, isFuture }: Props) {
  const complete = isComplete(count);
  const [stamp] = useState(() => new Animated.Value(complete ? 1 : 0));
  const wasComplete = useRef(complete);

  useEffect(() => {
    if (complete && !wasComplete.current) {
      stamp.setValue(0);
      Animated.spring(stamp, { toValue: 1, friction: 5, tension: 140, useNativeDriver }).start();
    } else if (!complete) {
      stamp.setValue(0);
    }
    wasComplete.current = complete;
  }, [complete, stamp]);

  const day = Number(dayKey.slice(8, 10));
  const weekday = new Date(Date.parse(dayKey)).getUTCDay();
  const dayColor = isFuture ? color.line : isToday ? color.primary : weekday === 0 ? color.danger : weekday === 6 ? color.primary : color.muted;

  return (
    <View style={styles.cell} accessibilityLabel={`${day}일 미션 ${count}/${MISSIONS_PER_DAY}`}>
      <Text style={[styles.day, { color: dayColor, fontWeight: isToday ? '800' : '500' }]}>{day}</Text>
      <View style={[styles.ringBox, isToday && styles.todayRing]}>
        {isFuture ? (
          <View style={styles.future}>
            <View style={styles.dot} />
          </View>
        ) : complete ? (
          <Animated.View style={{ opacity: stamp, transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }}>
            {isToday ? (
              <View style={[styles.todayFill]}>
                <MaterialIcons name="check" size={20} color={color.primary} />
              </View>
            ) : (
              <Stamp />
            )}
          </Animated.View>
        ) : count > 0 ? (
          <>
            <ProgressRing count={count} />
            <Text style={styles.count}>{count}</Text>
          </>
        ) : (
          <View style={styles.empty} />
        )}
      </View>
      {isToday && (
        <View style={styles.todayTag}>
          <Text style={styles.todayTagText}>오늘</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 6 },
  day: { fontFamily: font.body, fontSize: 13 },
  ringBox: { width: RING_SIZE + 6, height: RING_SIZE + 6, borderRadius: (RING_SIZE + 6) / 2, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 2, borderColor: color.primary },
  count: { position: 'absolute', fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary },
  empty: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: '#F1F3F8' },
  future: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 1, borderStyle: 'dashed', borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.line },
  todayFill: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' },
  todayTag: { marginTop: -12, backgroundColor: color.primary, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  todayTagText: { fontFamily: font.body, fontSize: 9, fontWeight: '700', color: '#fff' },
});
