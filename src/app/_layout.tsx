import { Slot, usePathname } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ensureSignedIn, signInAsGuest, supabase } from '@/shared/supabase';
import { TabBar, WebFrame } from '@/ui/chrome';
import '@/ui/install'; // 웹 설치 이벤트를 앱 시작 때 미리 받아 둔다
import { GuestHome, MSG_NETWORK, isNetworkError } from '@/ui/GuestHome';
import { color, getThemeVersion, loadTheme, subscribeTheme } from '@/ui/theme';

type Phase = 'loading' | 'login' | 'ready' | 'error';

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

function RootContent({ themeVersion }: { themeVersion: number }) {
  const path = usePathname();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');

  // 저장된 세션 또는 .env 계정으로 로그인 시도(첫 화면은 이미 loading 이라 상태를 미리 바꾸지 않는다)
  const attempt = useCallback(() => {
    // QR(관객 체험)로 들어오면 ?guest=1 → 로그인 화면 없이 바로 체험 계정으로 시작
    const wantsGuest = typeof location !== 'undefined' && new URLSearchParams(location.search).get('guest') === '1';
    ensureSignedIn()
      .then(async (ok) => {
        if (ok || !wantsGuest) return ok;
        await signInAsGuest();
        return true;
      })
      .then((ok) => setPhase(ok ? 'ready' : 'login'))
      .catch((e: unknown) => {
        setError(isNetworkError(e) ? MSG_NETWORK : '저장된 계정으로 로그인하지 못했어요. 다른 계정으로 로그인해 주세요.');
        setPhase('error');
      });
  }, []);

  useEffect(() => {
    attempt();
    // 로그아웃하면 로그인 전 홈으로 돌아간다
    const { data } = supabase.auth.onAuthStateChange((event) => event === 'SIGNED_OUT' && setPhase('login'));
    return () => data.subscription.unsubscribe();
  }, [attempt]);

  const retry = () => {
    setPhase('loading');
    attempt();
  };

  // 발표 화면: 로그인 없이 집계와 QR만 보여 준다
  if (path === '/live') return <Slot />;
  if (phase === 'error') return <ConnectError message={error} onRetry={retry} onLogin={() => setPhase('login')} />;
  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.cream }}>
        <ActivityIndicator color={color.primary} />
      </View>
    );
  }
  // 로그인 전: 홈 디자인을 예시로 보여 주고 우측 상단 버튼으로 로그인
  if (phase === 'login') return <GuestHome key={themeVersion} onSignedIn={() => setPhase('ready')} />;

  // 화면 + 하단 탭바(Stitch 디자인). 각 화면이 자기 헤더를 그린다.
  // 테마를 바꾸면 화면 부분만 다시 그린다(로그인·현재 탭은 그대로)
  return (
    <View key={themeVersion} style={{ flex: 1, backgroundColor: color.page }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <TabBar />
    </View>
  );
}

export default function RootLayout() {
  // 이 기기에 저장된 테마를 먼저 불러온 뒤 그린다. 테마를 바꾸면 version 이 바뀌어 화면 전체를 새 색으로 다시 그린다.
  const [themeReady, setThemeReady] = useState(false);
  const themeVersion = useSyncExternalStore(subscribeTheme, getThemeVersion, getThemeVersion);
  useEffect(() => {
    loadTheme().finally(() => setThemeReady(true));
  }, []);
  if (!themeReady) return null;
  return (
    <WebFrame>
      <RootContent themeVersion={themeVersion} />
    </WebFrame>
  );
}
