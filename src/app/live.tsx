// 발표 화면(프로젝터용): 큰 QR로 관객이 바로 체험(로그인 없이), 오른쪽에는 오늘 참여 집계가 3초마다 올라간다.
// 데이터는 live_stats() 함수가 돌려주는 합계뿐이다(개인 기록은 보이지 않음).
import { useEffect, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/shared/supabase';
import { color, font } from '@/ui/theme';

const SITE = 'https://fitlog-team5.vercel.app';
const JOIN_URL = `${SITE}/?join=1`; // 열면 로그인 상자가 바로 뜬다(참석자 이름 로그인)
const NATIVE = Platform.OS !== 'web';

interface Stats {
  people: number;
  records: number;
  kcal: number;
  missions_done: number;
  perfect_days: number;
  attendees: number;
}

// 숫자가 바뀌면 0.8초 동안 세어 올라가고, 바뀐 칸이 한 번 튄다
function Counter({ label, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  const [shown, setShown] = useState(value);
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const from = shown;
    if (from === value) return;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / 800);
      setShown(Math.round(from + (value - from) * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    pop.setValue(1.12);
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: NATIVE }).start();
    return () => cancelAnimationFrame(frame);
    // shown 은 시작값으로만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pop]);
  return (
    <Animated.View style={{ flexBasis: '45%', flexGrow: 1, backgroundColor: accent ? color.primary : '#ffffff14', borderRadius: 20, padding: 22, gap: 4, transform: [{ scale: pop }] }}>
      <Text style={{ fontFamily: font.body, fontSize: 18, color: accent ? '#ffffffcc' : '#ffffff99' }}>{label}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 54, fontWeight: '900', color: '#fff' }}>
        {shown.toLocaleString()}
        <Text style={{ fontSize: 22, fontWeight: '700' }}> {unit}</Text>
      </Text>
    </Animated.View>
  );
}

export default function LiveScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      supabase.rpc('live_stats').then(({ data }) => {
        if (alive && data) setStats(data as Stats);
      });
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#12141B', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 40 }}>
      <View style={{ alignItems: 'center', gap: 18 }}>
        <Text style={{ fontFamily: font.script, fontSize: 34, color: '#FFD43B' }}>Try it now!</Text>
        <View style={{ backgroundColor: '#fff', padding: 18, borderRadius: 24 }}>
          <QRCode value={JOIN_URL} size={300} color="#1B1F2A" backgroundColor="#fff" />
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 24, fontWeight: '800', color: '#fff' }}>폰 카메라로 찍고 바로 체험</Text>
        <Text style={{ fontFamily: font.body, fontSize: 16, color: '#ffffff99' }}>이름 + 안내받은 비밀번호로 로그인 · fitlog-team5.vercel.app</Text>
      </View>
      <View style={{ width: 620, maxWidth: '100%', gap: 16 }}>
        <Text style={{ fontFamily: font.body, fontSize: 30, fontWeight: '900', color: '#fff' }}>
          지금 핏로그에서는 <Text style={{ color: '#FFD43B' }}>●</Text> LIVE
        </Text>
        {stats ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <Counter label="오늘 참여한 사람" value={stats.people} unit="명" accent />
            <Counter label="로그인한 참석자" value={stats.attendees} unit="명" />
            <Counter label="오늘 쌓인 기록" value={stats.records} unit="건" />
            <Counter label="함께 먹은 칼로리" value={stats.kcal} unit="kcal" />
            <Counter label="완수한 미션" value={stats.missions_done} unit="개" />
            <Counter label="3개 모두 완수" value={stats.perfect_days} unit="명" />
          </View>
        ) : (
          <Text style={{ fontFamily: font.body, fontSize: 18, color: '#ffffff99' }}>집계를 불러오는 중…</Text>
        )}
      </View>
    </View>
  );
}
