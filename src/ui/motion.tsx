// Stitch 프로토타입과 같은 값의 모션(awesome-ai-motion 카드 기본값).
// stagger 리빌 0.55s·24px·0.06s 간격, bar-grow 1.05s, scale-pop 0.5s. transform·opacity만 움직인다.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { color } from './theme';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
// 웹에는 네이티브 애니메이션 모듈이 없어 JS 애니메이션을 쓴다(경고 방지)
const NATIVE = Platform.OS !== 'web';

// 애니메이션 값은 렌더 중 읽지 않도록 useState 로 한 번만 만든다.
const useAnim = () => useState(() => new Animated.Value(0))[0];

// '동작 줄이기'를 켠 기기에서는 null(확인 중) → true 가 되면 바로 완성 상태로 둔다.
export function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => setReduced(false));
  }, []);
  return reduced;
}

// 화면에 15% 이상 들어왔는지(프로토타입 IntersectionObserver와 같은 기준). 한 번 보이면 계속 true.
// ponytail: 웹에서만 스크롤 감지. 휴대폰 앱은 처음 그려질 때 바로 true(스크롤 감지는 필요해지면 onScroll로).
function useInView() {
  const ref = useRef<View>(null);
  const [seen, setSeen] = useState(() => Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current as unknown as Element | null;
    if (seen || !node) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

// 화면에 들어올 때 아래에서 24px 올라오며 나타난다. index로 0.06초씩 늦춘다.
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useAnim();
  const reduced = useReducedMotion();
  const [ref, seen] = useInView();
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) return v.setValue(1);
    if (!seen) return;
    Animated.timing(v, { toValue: 1, duration: 550, delay: Math.min(index, 6) * 60, easing: easeOut, useNativeDriver: NATIVE }).start();
  }, [v, index, reduced, seen]);
  return (
    <Animated.View ref={ref} style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// 무한 반복(0→1→0). 스크롤 화살표 바운스(2초), 마이크 둘레 펄스 링(2.5초) 등에 쓴다.
export function Loop({ duration, make, children, style }: { duration: number; make: (v: Animated.Value) => object; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useAnim();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced !== false) return;
    const half = { duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE };
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, ...half }), Animated.timing(v, { toValue: 0, ...half })]));
    loop.start();
    return () => loop.stop();
  }, [v, duration, reduced]);
  return <Animated.View style={[style, make(v)]}>{children}</Animated.View>;
}

// 강조 단어 밑줄이 왼쪽에서 오른쪽으로 그려진다(underline-draw 1.35초, 0.3초 뒤 시작).
export function Underline({ color, height = 3 }: { color: string; height?: number }) {
  const v = useAnim();
  const [ref, seen] = useInView();
  useEffect(() => {
    if (seen) Animated.timing(v, { toValue: 1, duration: 1350, delay: 300, easing: Easing.linear, useNativeDriver: false }).start();
  }, [v, seen]);
  return (
    <View ref={ref} style={{ height }}>
      <Animated.View style={{ height, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
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

// 성공 배지처럼 화면에 들어오면 0에서 튀어나오며 커진다(back.out).
export function Pop({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useAnim();
  const [ref, seen] = useInView();
  useEffect(() => {
    if (seen) Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: NATIVE }).start();
  }, [v, seen]);
  return (
    <Animated.View ref={ref} style={[style, { transform: [{ scale: v }] }]}>
      {children}
    </Animated.View>
  );
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
          Animated.timing(r, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
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
            backgroundColor: color.primary,
            opacity: r.interpolate({ inputRange: [0, 1], outputRange: [fast ? 0.35 : 0.18, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
          }}
        />
      ))}
    </>
  );
}

// ── 스크롤에 따라 움직이는 모션(오늘 홈) ──
// 스크롤 위치(y)를 Animated 값으로 받아 히어로 카드 패럴랙스, 헤더 그림자, '맨 위로' 버튼에 쓴다.
export function useScrollY() {
  const [y] = useState(() => new Animated.Value(0));
  const [onScroll] = useState(() => Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: NATIVE }));
  return { y, onScroll };
}

// 스크롤을 내리면 천천히 따라 올라가며(절반 속도) 살짝 작아진다(흐려짐은 빼 달라는 요청으로 제거)
export function Parallax({ y, children }: { y: Animated.Value; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced !== false) return <>{children}</>;
  const range = { inputRange: [0, 260], extrapolate: 'clamp' as const };
  return (
    <Animated.View
      style={{
        transform: [{ translateY: y.interpolate({ ...range, outputRange: [0, 90] }) }, { scale: y.interpolate({ ...range, outputRange: [1, 0.94] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// 헤더 아래 그림자: 스크롤을 조금이라도 내리면 나타난다
export function HeaderShadow({ y }: { y: Animated.Value }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -10,
        height: 10,
        opacity: y.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' }),
        boxShadow: '0 6px 10px rgba(27,31,42,0.12)',
        backgroundColor: 'transparent',
      } as ViewStyle}
    />
  );
}

// '맨 위로' 버튼: 400px 넘게 내려가 있고 스크롤하는 동안에만 떠오르고, 1.2초 멈추면 사라진다(내용을 가리지 않게)
export function ScrollTopButton({ y, onPress, children }: { y: Animated.Value; onPress: () => void; children: ReactNode }) {
  const [show] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let shown = false;
    const fade = (to: number) => Animated.timing(show, { toValue: to, duration: 180, useNativeDriver: NATIVE }).start();
    const id = y.addListener(({ value }) => {
      if (timer) clearTimeout(timer);
      const want = value > 400;
      if (want !== shown) {
        shown = want;
        setVisible(want);
        fade(want ? 1 : 0);
      }
      if (want)
        timer = setTimeout(() => {
          shown = false;
          setVisible(false);
          fade(0);
        }, 1200);
    });
    return () => {
      y.removeListener(id);
      if (timer) clearTimeout(timer);
    };
  }, [y, show]);
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        opacity: show,
        transform: [{ translateY: show.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
      }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="맨 위로" onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(27,31,42,0.2)' } as ViewStyle}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
