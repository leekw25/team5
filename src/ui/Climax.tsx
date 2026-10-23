// 발표 클라이맥스: 오늘 미션 3개를 모두 채운 순간 화면 전체 연출.
// 지친 지유 → 자신감 지유로 바뀌고, 연속 일수가 칭호 기준(10일 단위)에 닿았으면 금빛 칭호 카드가 튀어나온다. 폭죽 두 번.
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { Confetti } from '@/features/mission/Confetti';
import { titleFor } from '@/features/reward/titles.ts';
import { color, font, radius, text } from './theme';
import { playClip } from './voice';

const NATIVE = Platform.OS !== 'web';
const TIRED = require('../../assets/illustrations/jiyu-stage0.jpg');
const PROUD = require('../../assets/illustrations/jiyu-stage3.jpg');

export function ClimaxOverlay({ streak, dayKey, onClose }: { streak: number; dayKey: string; onClose: () => void }) {
  const title = titleFor(streak);
  const newTitle = title && title.days === streak ? title : null; // 오늘로 막 칭호 기준에 닿은 경우만
  const [bg] = useState(() => new Animated.Value(0));
  const [card] = useState(() => new Animated.Value(0));
  const [morph] = useState(() => new Animated.Value(0));
  const [badge] = useState(() => new Animated.Value(0));
  const [burst, setBurst] = useState(0);

  // 미리 만든 음성: '미션 세 개 모두 완수!' → 칭호를 얻었으면 '새 칭호 ○○를 얻었어요!' (그 기기에서 하루 한 번)
  useEffect(() => {
    void playClip('all-done', dayKey).then(() => newTitle && playClip(`title-${newTitle.days}`, dayKey));
  }, [dayKey, newTitle]);

  useEffect(() => {
    const spring = (v: Animated.Value) => Animated.spring(v, { toValue: 1, friction: 5, tension: 90, useNativeDriver: NATIVE });
    Animated.sequence([
      Animated.timing(bg, { toValue: 1, duration: 250, useNativeDriver: NATIVE }),
      spring(card),
      Animated.delay(500),
      Animated.timing(morph, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIVE }),
    ]).start(() => {
      setBurst(1);
      if (newTitle) Animated.sequence([Animated.delay(350), spring(badge)]).start(() => setBurst(2));
    });
  }, [bg, card, morph, badge, newTitle]);

  const close = () => Animated.timing(bg, { toValue: 0, duration: 200, useNativeDriver: NATIVE }).start(onClose);

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,18,28,0.72)', opacity: bg, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View
        style={{
          width: '100%',
          maxWidth: 340,
          backgroundColor: color.surface,
          borderRadius: 24,
          padding: 22,
          alignItems: 'center',
          gap: 8,
          transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          opacity: card,
        }}
      >
        <Text style={{ ...text.script, fontSize: 26 }}>Perfect day!</Text>
        <View style={{ width: 170, height: 200 }}>
          <Animated.Image source={TIRED} style={{ position: 'absolute', width: 170, height: 200, opacity: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) }] }} resizeMode="contain" accessibilityLabel="지친 지유" />
          <Animated.Image source={PROUD} style={{ position: 'absolute', width: 170, height: 200, opacity: morph, transform: [{ scale: morph.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.12, 1] }) }] }} resizeMode="contain" accessibilityLabel="자신감 넘치는 지유" />
        </View>
        <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30, textAlign: 'center' }}>오늘 미션 3개 완수!</Text>
        <View style={{ backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '800', color: color.ink }}>🔥 연속 {streak}일 달성</Text>
        </View>

        {newTitle && (
          <Animated.View
            style={{
              marginTop: 8,
              width: '100%',
              borderRadius: 18,
              padding: 14,
              backgroundColor: '#FFE27A',
              borderWidth: 2,
              borderColor: '#E5B300',
              alignItems: 'center',
              gap: 2,
              opacity: badge,
              transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: badge.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) }],
            }}
          >
            <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '800', color: '#7A5600' }}>🏅 새 칭호 획득</Text>
            <Text style={{ fontFamily: font.body, fontSize: 22, fontWeight: '900', color: '#3D2B00' }}>{newTitle.name}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: '#7A5600' }}>
              {newTitle.days}일 · {newTitle.english}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: '#5C4300', textAlign: 'center', marginTop: 2 }}>{newTitle.description}</Text>
          </Animated.View>
        )}

        <Pressable accessibilityRole="button" onPress={close} style={{ marginTop: 10, height: 44, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.body, fontSize: 15, fontWeight: '800', color: '#fff' }}>계속하기</Text>
        </Pressable>
      </Animated.View>
      {burst >= 1 && <Confetti key="b1" onDone={() => undefined} />}
      {burst >= 2 && <Confetti key="b2" onDone={() => undefined} />}
    </Animated.View>
  );
}
