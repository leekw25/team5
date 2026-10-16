// Stitch 프로토타입과 같은 값의 모션(awesome-ai-motion 카드 기본값).
// stagger 리빌 0.55s·24px·0.06s 간격, bar-grow 1.05s, scale-pop 0.5s. transform·opacity만 움직인다.
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

// 애니메이션 값은 렌더 중 읽지 않도록 useState 로 한 번만 만든다.
const useAnim = () => useState(() => new Animated.Value(0))[0];

// '동작 줄이기'를 켠 기기에서는 null(확인 중) → true 가 되면 바로 완성 상태로 둔다.
function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => setReduced(false));
  }, []);
  return reduced;
}

// 처음 그려질 때 아래에서 24px 올라오며 나타난다. index로 0.06초씩 늦춘다.
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useAnim();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) return v.setValue(1);
    Animated.timing(v, { toValue: 1, duration: 550, delay: Math.min(index, 6) * 60, easing: easeOut, useNativeDriver: true }).start();
  }, [v, index, reduced]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// 진행 막대. ratio(0~1)가 바뀔 때마다 1.05초에 걸쳐 채운다.
export function ProgressBar({ ratio, fill, track, height = 8 }: { ratio: number; fill: string; track: string; height?: number }) {
  const v = useAnim();
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, ratio)), duration: 1050, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: false }).start();
  }, [v, ratio]);
  return (
    <Animated.View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: fill, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </Animated.View>
  );
}

// 성공 배지처럼 0에서 튀어나오며 커진다(back.out).
export function Pop({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useAnim();
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

// 마이크 버튼 뒤의 퍼지는 원 3개(ripple-rings). fast면 듣는 중(1.6초 주기), 아니면 2.4초.
export function Ripple({ size, fast }: { size: number; fast: boolean }) {
  const [rings] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    const period = fast ? 1600 : 2400;
    const loops = rings.map((r, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * period) / 6),
          Animated.timing(r, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [fast, rings]);
  return (
    <>
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: '#2F6BFF',
            opacity: r.interpolate({ inputRange: [0, 1], outputRange: [fast ? 0.35 : 0.18, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
          }}
        />
      ))}
    </>
  );
}
