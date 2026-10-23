// B-F07 성공 연출: 카드 가운데에서 폭죽 조각이 한 번 퍼졌다가 사라진다.
// react-native 기본 Animated만 써서 추가 패키지 없이 Expo Go에서 동작한다.
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

const COLORS = ['#F97316', '#FACC15', '#22C55E', '#0EA5E9', '#8B5CF6', '#EC4899'];
const COUNT = 28;
const DURATION_MS = 1100;
const useNativeDriver = Platform.OS !== 'web'; // 웹 미리보기에는 네이티브 드라이버가 없다

// 렌더할 때마다 달라지지 않게 조각 모양을 미리 정해 둔다
const PIECES = Array.from({ length: COUNT }, (_, i) => {
  const angle = (i / COUNT) * Math.PI * 2 + (i % 3) * 0.12;
  const distance = 70 + ((i * 37) % 50);
  const size = 6 + (i % 3) * 2;
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    color: COLORS[i % COLORS.length],
    width: size,
    height: i % 4 === 0 ? size : size / 2,
    radius: i % 4 === 0 ? size / 2 : 1,
    spin: `${(i % 2 ? 1 : -1) * (180 + ((i * 29) % 360))}deg`,
  };
});

export function Confetti({ onDone }: { onDone: () => void }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
  }, [progress, onDone]);

  const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1, 0.8] });

  return (
    <View style={styles.layer}>
      {PIECES.map((piece, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            {
              width: piece.width,
              height: piece.height,
              borderRadius: piece.radius,
              backgroundColor: piece.color,
              opacity,
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] }) },
                // 끝으로 갈수록 살짝 아래로 떨어진다
                { translateY: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, piece.dy * 0.9, piece.dy + 40] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', piece.spin] }) },
                { scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  piece: { position: 'absolute' },
});
