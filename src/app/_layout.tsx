import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ensureSignedIn, signIn } from '@/shared/supabase';

type Phase = 'loading' | 'login' | 'ready';

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
    } catch {
      setMessage('이메일 또는 비밀번호가 맞지 않아요.');
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

export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSignedIn()
      .then((ok) => setPhase(ok ? 'ready' : 'login'))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>로그인 실패</Text>
        <Text>{error}</Text>
      </View>
    );
  }
  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (phase === 'login') return <LoginForm onDone={() => setPhase('ready')} />;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '오늘' }} />
      <Stack.Screen name="calendar" options={{ title: '리워드 달력' }} />
      <Stack.Screen name="settings" options={{ title: '설정' }} />
    </Stack>
  );
}
