// 미션 카드 한 장(B-F06): 슬롯, 미션 이름, 진행률 막대와 숫자, 성공 표시. 처음 성공하는 순간 폭죽(B-F07).
// 통합 때 화면만 Stitch '오늘 홈' 미션 카드 디자인으로 바꿨다(진행 막대·튀어 오름·폭죽 모션은 그대로).
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import type { DailyMission } from '@/shared/types/contract';
import { color, font, radius, text } from '@/ui/theme';
import { formatAmount, getMissionDef, SLOT_LABELS } from './catalog.ts';
import { Confetti } from './Confetti';
import type { MissionResult } from './evaluate.ts';

const useNativeDriver = Platform.OS !== 'web';
const DONE_NOTE: Record<string, string> = {
  protein_min: '오늘 단백질 목표를 채웠어요!',
  water_min: '하루 수분 권장량 달성 완료!',
  squat_min: '오늘 운동 미션 완료!',
  steps_min: '오늘 걷기 목표 달성!',
};

interface Props {
  mission: DailyMission;
  result: MissionResult | undefined; // 카탈로그 밖 코드면 판정 결과가 없다
  celebrating: boolean;
  onCelebrated: (missionId: string) => void;
}

export function MissionCard({ mission, result, celebrating, onCelebrated }: Props) {
  const def = getMissionDef(mission.mission_code);
  const success = mission.status === 'success';
  const ratio = result ? Math.min(result.current / result.target, 1) : 0;

  const [fill] = useState(() => new Animated.Value(ratio));
  const [pop] = useState(() => new Animated.Value(1));
  const finish = useCallback(() => onCelebrated(mission.id), [onCelebrated, mission.id]);

  useEffect(() => {
    Animated.timing(fill, { toValue: ratio, duration: 500, useNativeDriver: false }).start();
  }, [fill, ratio]);

  useEffect(() => {
    if (!celebrating) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.06, duration: 160, useNativeDriver }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver }),
    ]).start();
  }, [celebrating, pop]);

  const amount =
    def && result
      ? `${formatAmount(Math.min(result.current, result.target))} / ${formatAmount(result.target)}${def.unit}` + (success ? '' : ` (${Math.floor(ratio * 100)}%)`)
      : '';

  return (
    <Animated.View style={[styles.card, success && styles.cardSuccess, celebrating && styles.raised, { transform: [{ scale: pop }] }]}>
      <View style={styles.row}>
        <View style={[styles.slot, success && { backgroundColor: color.yellowSoft }]}>
          <Text style={[styles.slotText, success && { color: '#8A6A00' }]}>{SLOT_LABELS[mission.slot]}</Text>
        </View>
        <Text style={[styles.amount, success && { color: color.ink, fontWeight: '700' }]}>{amount}</Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, success && styles.titleDone]} numberOfLines={1}>
            {def && result ? def.title(result.target) : mission.mission_code}
          </Text>
          {success && <Text style={styles.note}>✨ {DONE_NOTE[mission.mission_code] ?? '미션 성공!'}</Text>}
          {!def && <Text style={text.caption}>판정 규칙이 없는 미션이에요</Text>}
        </View>
        {success && (
          <View style={styles.check}>
            <MaterialIcons name="check" size={22} color={color.ink} />
          </View>
        )}
      </View>

      {!success && def && result && (
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      )}

      {celebrating && <Confetti onDone={finish} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: 16, gap: 8 },
  cardSuccess: { borderColor: color.yellowLine, backgroundColor: '#FFFCF0' },
  raised: { zIndex: 10, elevation: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slot: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  slotText: { fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary },
  amount: { ...text.caption, fontVariant: ['tabular-nums'] },
  title: { ...text.body, fontSize: 16, fontWeight: '700' },
  titleDone: { textDecorationLine: 'line-through', color: color.muted },
  note: { ...text.caption, color: color.primary },
  check: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 8, backgroundColor: color.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, backgroundColor: color.primary },
});
