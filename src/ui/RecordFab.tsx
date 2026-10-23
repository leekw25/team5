// 하단 탭바 가운데 + 버튼(방사형 FAB 메뉴). 누르면 사진·음성·기록 버튼이 부채꼴로 펼쳐지고, 그 위에 빠른 기록 버튼 줄이 나온다.
// 입력 로직은 홍현정님 코드(useRecordInput) 그대로 쓴다. 분석 결과는 확인 시트에서 저장한다.
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QUICK_CHIPS } from '@/features/input/quick-core.ts';
import { ResultSheet } from '@/features/input/ResultSheet';
import { useRecordInput } from '@/features/input/useRecordInput';
import { VoiceButton } from '@/features/input/VoiceButton';
import { color, font, radius, text } from './theme';

const NATIVE = Platform.OS !== 'web';
export const FAB_SIZE = 58;
const ARC = 104; // 부채꼴 반지름
// 사진(왼쪽 위) · 음성(위) · 기록(오른쪽 위)
const SPOTS = [
  { x: -Math.cos(Math.PI / 6) * ARC, y: -Math.sin(Math.PI / 6) * ARC },
  { x: 0, y: -ARC - 14 },
  { x: Math.cos(Math.PI / 6) * ARC, y: -Math.sin(Math.PI / 6) * ARC },
];

function FabButton({ open, onPress, spin }: { open: boolean; onPress: () => void; spin: Animated.Value }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? '기록 메뉴 닫기' : '기록하기'}
      onPress={onPress}
      style={{ width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface, boxShadow: '0 6px 16px rgba(47,107,255,0.35)' } as object}
    >
      <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }) }] }}>
        <MaterialIcons name="add" size={30} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

export function RecordFab() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [spin] = useState(() => new Animated.Value(0));
  const [items] = useState(() => [0, 1, 2, 3].map(() => new Animated.Value(0))); // 버튼 3개 + 빠른 기록 줄
  const close = () => {
    Animated.parallel([
      Animated.timing(spin, { toValue: 0, duration: 160, useNativeDriver: NATIVE }),
      ...items.map((v) => Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: NATIVE })),
    ]).start(() => {
      setOpen(false);
      setTyping(false);
    });
  };
  const input = useRecordInput(() => setTimeout(close, 700)); // 저장하면 '저장했어요'를 잠깐 보여 주고 닫는다

  const show = () => {
    input.setNotice(null);
    setOpen(true);
    items.forEach((v) => v.setValue(0));
    Animated.parallel([
      Animated.spring(spin, { toValue: 1, friction: 6, useNativeDriver: NATIVE }),
      Animated.stagger(50, items.map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: NATIVE }))),
    ]).start();
  };

  const at = (v: Animated.Value, spot: { x: number; y: number }) => ({
    opacity: v,
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, spot.x] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, spot.y] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
    ],
  });
  const fabBottom = insets.bottom + 20; // 탭바 위로 살짝 솟은 + 버튼의 아래 끝(탭바 + 버튼과 같은 자리)
  const status = input.recording ? '듣고 있어요… 다 말했으면 마이크를 한 번 더 누르세요' : input.busy ? 'AI가 분석하고 있어요…' : input.notice;
  const round = { width: 56, height: 56, borderRadius: 28, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.line } as const;

  return (
    <>
      <FabButton open={false} onPress={show} spin={spin} />

      <Modal transparent visible={open && !input.pending} animationType="fade" onRequestClose={close}>
        <Pressable accessibilityLabel="기록 메뉴 닫기" onPress={input.locked ? undefined : close} style={{ flex: 1, backgroundColor: 'rgba(15,18,28,0.72)', alignItems: 'center' }}>
          {/* PC 웹에서도 휴대폰 틀(430px) 가운데 아래에 맞춘다 */}
          <View style={{ flex: 1, width: '100%', maxWidth: 430 }}>
            {/* 빠른 기록 줄 + 글 입력 + 안내 */}
            <Animated.View onStartShouldSetResponder={() => true} style={{ position: 'absolute', left: 0, right: 0, bottom: fabBottom + FAB_SIZE + ARC + 70, gap: 10, opacity: items[3], transform: [{ translateY: items[3].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
              {!!status && <Text style={{ ...text.body, fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center', paddingHorizontal: 20 }}>{status}</Text>}
              {input.warnings.map((w) => (
                <Text key={w} style={{ ...text.caption, color: '#fff', backgroundColor: 'rgba(240,82,82,0.85)', marginHorizontal: 20, borderRadius: 12, padding: 10 }}>
                  {w}
                </Text>
              ))}
              {typing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.surface, paddingLeft: 16, paddingRight: 6, minHeight: 50 }}>
                  <TextInput
                    value={input.text}
                    onChangeText={input.setText}
                    onSubmitEditing={input.onSubmit}
                    placeholder="예) 점심으로 닭가슴살 샐러드 먹었어"
                    placeholderTextColor={color.muted}
                    editable={!input.locked}
                    autoFocus
                    returnKeyType="send"
                    style={{ flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, paddingVertical: 12 }}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel="기록하기" onPress={input.onSubmit} disabled={input.locked || !input.text.trim()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', opacity: input.locked || !input.text.trim() ? 0.5 : 1 }}>
                    {input.busy ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="arrow-upward" size={20} color="#fff" />}
                  </Pressable>
                </View>
              )}
              <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: '#ffffffcc', paddingHorizontal: 20 }}>간편 기록 · 옆으로 밀어서 골라요</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {QUICK_CHIPS.map((chip) => (
                  <Pressable
                    key={chip.id}
                    accessibilityRole="button"
                    accessibilityLabel={chip.label + ' 바로 기록'}
                    disabled={input.locked}
                    onPress={() => input.onQuick(chip)}
                    style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.surface, opacity: input.locked ? 0.5 : 1 }}
                  >
                    <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '700', color: color.ink }}>+ {chip.short}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>

            {/* 방사형 버튼 3개: + 버튼 중심에서 펼쳐진다 */}
            <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: fabBottom, alignItems: 'center' }}>
              <View pointerEvents="box-none" style={{ width: FAB_SIZE, height: FAB_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={[{ position: 'absolute', alignItems: 'center', gap: 4 }, at(items[0], SPOTS[0])]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="사진으로 기록" disabled={input.locked} onPress={input.onPhoto} style={round}>
                    <MaterialIcons name="photo-camera" size={24} color={color.primary} />
                  </Pressable>
                  <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: '#fff' }}>사진</Text>
                </Animated.View>
                <Animated.View style={[{ position: 'absolute', alignItems: 'center', gap: 0 }, at(items[1], SPOTS[1])]}>
                  <View style={{ transform: [{ scale: 0.8 }] }}>
                    <VoiceButton disabled={input.busy} onRecordingChange={input.setRecording} onRecorded={input.onRecorded} onProblem={input.onMicProblem} />
                  </View>
                  <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: '#fff', marginTop: -14 }}>음성</Text>
                </Animated.View>
                <Animated.View style={[{ position: 'absolute', alignItems: 'center', gap: 4 }, at(items[2], SPOTS[2])]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="글로 기록" disabled={input.locked} onPress={() => setTyping((t) => !t)} style={[round, typing && { backgroundColor: color.primarySoft, borderColor: color.primary }]}>
                    <MaterialIcons name="edit-note" size={26} color={color.primary} />
                  </Pressable>
                  <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: '#fff' }}>기록</Text>
                </Animated.View>
                <FabButton open onPress={input.locked ? () => undefined : close} spin={spin} />
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ResultSheet result={input.pending?.result ?? null} seconds={input.pending?.seconds ?? null} busy={input.busy} onSave={input.onConfirm} onRetry={input.cancelPending} />
    </>
  );
}
