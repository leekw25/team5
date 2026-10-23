// 앱 공통 틀: 상단 헤더(로고·날짜·알림)와 하단 탭바(오늘·달력·리포트·설정). Stitch 디자인 그대로.
import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Animated, Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertBell } from './AlertBell';
import { RecordFab } from './RecordFab';
import { HeaderShadow } from './motion';
import { color, font, radius } from './theme';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function koreanDate(dayKey: string): string {
  const [, m, d] = dayKey.split('-').map(Number);
  const w = new Date(dayKey + 'T12:00:00+09:00').getUTCDay();
  return `${m}월 ${d}일 (${WEEKDAY[w]})`;
}

export function AppHeader({ dayKey, title, right, scrollY }: { dayKey?: string; title?: string; right?: ReactNode; scrollY?: Animated.Value }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: color.cream,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2,
      }}
    >
      {scrollY && <HeaderShadow y={scrollY} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="fitness-center" size={18} color="#fff" />
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 18, fontWeight: '800', color: color.primary }}>{title ?? '핏로그'}</Text>
      </View>
      {dayKey && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface }}>
          <MaterialIcons name="calendar-today" size={14} color={color.primary} />
          <Text style={{ fontFamily: font.body, fontSize: 13, color: color.ink }}>{koreanDate(dayKey)}</Text>
        </View>
      )}
      {right ?? <AlertBell />}
    </View>
  );
}

// + 버튼이 탭바 위로 솟는 높이(RecordFab 메뉴의 + 버튼 위치와 맞춘다)
export const FAB_RAISE = 30;

const TABS = [
  { href: '/', label: '오늘', icon: 'today' },
  { href: '/calendar', label: '달력', icon: 'calendar-month' },
  { href: '/report', label: '리포트', icon: 'bar-chart' },
  { href: '/settings', label: '설정', icon: 'settings' },
] as const;

export function TabBar() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 8,
        paddingBottom: insets.bottom + 8,
        backgroundColor: color.surface,
        borderTopWidth: 1,
        borderTopColor: color.line,
      }}
    >
      {TABS.map((t, i) => {
        const active = path === t.href;
        const tab = (
          <Pressable
            key={t.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => !active && router.replace(t.href)}
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
          >
            <MaterialIcons name={t.icon} size={24} color={active ? color.primary : color.muted} />
            <Text style={{ fontFamily: font.body, fontSize: 11, fontWeight: active ? '700' : '400', color: active ? color.primary : color.muted }}>{t.label}</Text>
          </Pressable>
        );
        // 달력과 리포트 사이 가운데: 탭바 위로 솟은 + 버튼(방사형 기록 메뉴)
        return i === 2 ? [<View key="fab" style={{ width: 76, alignItems: 'center', marginTop: -FAB_RAISE }}><RecordFab /></View>, tab] : tab;
      })}
    </View>
  );
}

// PC 브라우저에서도 휴대폰 크기로 보이게: 웹에서는 가운데 폭 430px 틀 안에 앱을 그린다.
export const FRAME_WIDTH = 430;
export function WebFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (Platform.OS !== 'web' || path === '/live') return <>{children}</>; // 발표 화면은 프로젝터 크기 그대로
  return (
    <View style={{ flex: 1, backgroundColor: color.backdrop, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: FRAME_WIDTH, overflow: 'hidden', backgroundColor: color.page, boxShadow: '0 0 40px rgba(27,31,42,0.12)' } as ViewStyle}>
        {children}
      </View>
    </View>
  );
}
