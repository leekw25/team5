// 로그인 전 첫 화면: Stitch '오늘 홈' 디자인을 예시 데이터로 보여 주고, 우측 상단 로그인 버튼을 누르면
// 화면 이동 없이 이메일·비밀번호 칸이 버튼 자리에서 튀어나온다(scale+fade 스프링).
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toDayKey } from '@/shared/date';
import { signIn } from '@/shared/supabase';
import { AppHeader } from './chrome';
import { HeroCard, MissionList, SAMPLE_MISSIONS } from './MissionPreview';
import { color, font, radius, text } from './theme';

const NATIVE = Platform.OS !== 'web';

// 서버에 닿지 못한 오류(인터넷 끊김, Supabase 일시정지 등)인지. 이 경우 비밀번호 문제가 아니다.
export const isNetworkError = (e: unknown) => /fetch|network|timeout/i.test(String((e as Error)?.message ?? e));
export const MSG_NETWORK = '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';

function LoginPopover({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [v] = useState(() => new Animated.Value(0));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 7, tension: 140, useNativeDriver: NATIVE }).start();
  }, [v]);

  const close = () => Animated.timing(v, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }).start(onClose);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
      onDone();
    } catch (e) {
      setMessage(isNetworkError(e) ? MSG_NETWORK : '이메일 또는 비밀번호가 맞지 않아요.');
      setBusy(false);
    }
  }

  const disabled = busy || !email || !password;
  const input = { borderWidth: 1, borderColor: color.line, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15, backgroundColor: color.page, color: color.ink, fontFamily: font.body } as const;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,31,42,0.25)', opacity: v }}>
        <Pressable accessibilityLabel="닫기" onPress={close} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top + 56,
          right: 12,
          width: 300,
          backgroundColor: color.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: color.line,
          padding: 18,
          gap: 10,
          boxShadow: '0 12px 32px rgba(27,31,42,0.18)',
          transformOrigin: 'top right',
          opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) }, { scale: v }] }}>
            <Image source={require('../../assets/illustrations/jiyu-ok.jpg')} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.line }} accessibilityLabel="손으로 OK 사인을 하는 지유" />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...text.section, fontSize: 16 }}>로그인</Text>
            <Text style={text.caption}>멘토가 만들어 준 계정으로 들어와요</Text>
          </View>
        </View>
        <TextInput value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={color.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus style={input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" placeholderTextColor={color.muted} secureTextEntry autoComplete="current-password" onSubmitEditing={() => !disabled && submit()} style={input} />
        {message && <Text style={{ ...text.caption, color: color.danger }}>{message}</Text>}
        <Pressable accessibilityRole="button" onPress={submit} disabled={disabled} style={{ backgroundColor: color.primary, borderRadius: radius.pill, height: 46, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.body, color: '#fff', fontWeight: '700', fontSize: 15 }}>로그인</Text>}
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function GuestHome({ onSignedIn }: { onSignedIn: () => void }) {
  const [open, setOpen] = useState(false);
  const loginButton = (
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.primary, borderRadius: radius.pill, paddingHorizontal: 12, height: 32 }}>
      <MaterialIcons name="login" size={16} color="#fff" />
      <Text style={{ fontFamily: font.body, color: '#fff', fontWeight: '700', fontSize: 13 }}>로그인</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader dayKey={toDayKey()} right={loginButton} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
        <HeroCard missions={SAMPLE_MISSIONS} />
        <MissionList missions={SAMPLE_MISSIONS} />
        <Text style={{ ...text.caption, textAlign: 'center' }}>예시 화면이에요. 로그인하면 내 기록으로 바뀌어요.</Text>
      </ScrollView>
      {open && <LoginPopover onClose={() => setOpen(false)} onDone={onSignedIn} />}
    </View>
  );
}
