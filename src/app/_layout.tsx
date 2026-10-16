import { Slot } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ensureSignedIn, signIn, supabase } from '@/shared/supabase';
import { TabBar, WebFrame } from '@/ui/chrome';
import { color } from '@/ui/theme';

type Phase = 'loading' | 'login' | 'ready' | 'error';

// 서버에 닿지 못한 오류(인터넷 끊김, Supabase 일시정지 등)인지. 이 경우 비밀번호 문제가 아니다.
const isNetworkError = (e: unknown) => /fetch|network|timeout/i.test(String((e as Error)?.message ?? e));
const MSG_NETWORK = '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
      onDone();
    } catch (e) {
      setMessage(isNetworkError(e) ? MSG_NETWORK : '이메일 또는 비밀번호가 맞지 않아요.');
    } finally {
      setBusy(false);
    }
  }

  const input = { borderWidth: 1, borderColor: '#E3E6EE', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' } as const;
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FFF9EE' }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#2F6BFF' }}>핏로그</Text>
      <Text style={{ color: '#7A8194', marginBottom: 8 }}>멘토가 만들어 준 계정으로 로그인해요</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor="#7A8194" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" placeholderTextColor="#7A8194" secureTextEntry autoComplete="current-password" onSubmitEditing={submit} style={input} />
      <Pressable
        onPress={submit}
        disabled={busy || !email || !password}
        accessibilityRole="button"
        style={{ backgroundColor: '#2F6BFF', borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center', opacity: busy || !email || !password ? 0.5 : 1 }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>로그인</Text>}
      </Pressable>
      {message && <Text style={{ color: '#F05252' }}>{message}</Text>}
    </View>
  );
}

// 연결 실패 화면: 다시 시도하거나, 직접 로그인 화면으로 간다.
function ConnectError({ message, onRetry, onLogin }: { message: string; onRetry: () => void; onLogin: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: color.cream }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: color.primary }}>핏로그</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: color.ink }}>로그인하지 못했어요</Text>
      <Text style={{ color: color.muted }}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={{ backgroundColor: color.primary, borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>다시 시도</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onLogin} style={{ borderWidth: 2, borderColor: color.primary, borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: color.primary, fontWeight: '700', fontSize: 16 }}>다른 계정으로 로그인</Text>
      </Pressable>
    </View>
  );
}

function RootContent() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');

  // 저장된 세션 또는 .env 계정으로 로그인 시도(첫 화면은 이미 loading 이라 상태를 미리 바꾸지 않는다)
  const attempt = useCallback(() => {
    ensureSignedIn()
      .then((ok) => setPhase(ok ? 'ready' : 'login'))
      .catch((e: unknown) => {
        setError(isNetworkError(e) ? MSG_NETWORK : '저장된 계정으로 로그인하지 못했어요. 다른 계정으로 로그인해 주세요.');
        setPhase('error');
      });
  }, []);

  useEffect(() => {
    attempt();
    // 로그아웃하면 로그인 화면으로 돌아간다
    const { data } = supabase.auth.onAuthStateChange((event) => event === 'SIGNED_OUT' && setPhase('login'));
    return () => data.subscription.unsubscribe();
  }, [attempt]);

  const retry = () => {
    setPhase('loading');
    attempt();
  };

  if (phase === 'error') return <ConnectError message={error} onRetry={retry} onLogin={() => setPhase('login')} />;
  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.cream }}>
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }
  if (phase === 'login') return <LoginForm onDone={() => setPhase('ready')} />;

  // 화면 + 하단 탭바(Stitch 디자인). 각 화면이 자기 헤더를 그린다.
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <TabBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <WebFrame>
      <RootContent />
    </WebFrame>
  );
}
