// 헤더 🔔: 오늘 지유의 미션 달성 알림을 시간과 함께 보여 준다. 안 읽은 알림이 있으면 빨간 숫자.
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Image, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { missionsRepo } from '@/data';
import { onMissionsUpdated } from '@/features/mission/missionEvents.ts';
import { describe } from '@/features/mission/pool.ts';
import { calcStreak, STREAK_LOOKBACK_DAYS } from '@/features/reward/streak.ts';
import { addDays, toDayKey } from '@/shared/date';
import { buildAlerts, unreadCount, type Alert } from './alerts-core.ts';
import { color, font, text } from './theme';

const SEEN_KEY = 'fitlog:alerts-seen';
const store = typeof localStorage !== 'undefined' ? localStorage : null;
const NATIVE = Platform.OS !== 'web';

function useTodayAlerts() {
  const dayKey = toDayKey();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([missionsRepo.listByDay(dayKey), missionsRepo.listDayStatus(addDays(dayKey, -STREAK_LOOKBACK_DAYS), dayKey)])
      .then(([missions, statuses]) => alive && setAlerts(buildAlerts(missions, (m) => describe(m).title, calcStreak(statuses, dayKey))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dayKey, tick]);
  useEffect(() => onMissionsUpdated((day) => day === dayKey && setTick((n) => n + 1)), [dayKey]);
  return alerts;
}

// 테마가 바뀌면 다시 읽도록 함수
const iconTint = (): Record<Alert['icon'], [string, string]> => ({
  'check-circle': [color.primarySoft, color.primary],
  celebration: [color.yellowSoft, color.yellowInk],
  'military-tech': ['#FFE27A', '#7A5600'],
});

export function AlertBell() {
  const alerts = useTodayAlerts();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(() => store?.getItem(SEEN_KEY) ?? null);
  const [v] = useState(() => new Animated.Value(0));
  const unread = unreadCount(alerts, seenAt);

  const show = () => {
    setOpen(true);
    v.setValue(0);
    Animated.spring(v, { toValue: 1, friction: 7, tension: 140, useNativeDriver: NATIVE }).start();
    const now = new Date().toISOString(); // 열면 다 읽은 것으로
    store?.setItem(SEEN_KEY, now);
    setSeenAt(now);
  };

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={unread ? `알림 ${unread}개` : '알림'} onPress={show} hitSlop={8}>
        <MaterialIcons name={unread ? 'notifications-active' : 'notifications-none'} size={24} color={color.ink} />
        {unread > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: color.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: color.cream }}>
            <Text style={{ fontFamily: font.body, fontSize: 10, fontWeight: '800', color: '#fff' }}>{unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="알림 닫기" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: color.overlay, alignItems: 'center' }}>
          {/* PC 웹에서도 휴대폰 틀(430px) 오른쪽 위에 붙도록 같은 폭의 틀 안에 둔다 */}
          <View style={{ width: '100%', maxWidth: 430, flex: 1 }}>
            <Animated.View
              onStartShouldSetResponder={() => true}
              style={{
                position: 'absolute',
                top: insets.top + 56,
                right: 12,
                left: 12,
                maxWidth: 360,
                marginLeft: 'auto',
                backgroundColor: color.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: color.line,
                padding: 16,
                gap: 10,
                transformOrigin: 'top right',
                opacity: v,
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={require('../../assets/illustrations/jiyu-stage3.jpg')} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: color.line }} accessibilityLabel="지유" />
                <Text style={{ ...text.section, fontSize: 16, flex: 1 }}>지유의 오늘 알림</Text>
                <Text style={text.caption}>{alerts.length}개</Text>
              </View>
              {alerts.length === 0 ? (
                <Text style={{ ...text.caption, paddingVertical: 12, textAlign: 'center' }}>아직 달성한 미션이 없어요. 첫 미션을 채우면 알려 드릴게요!</Text>
              ) : (
                alerts.map((a) => {
                  const [bg, fg] = iconTint()[a.icon];
                  const isNew = !!seenAt && a.at > seenAt;
                  return (
                    <View key={a.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name={a.icon} size={19} color={fg} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ ...text.body, fontSize: 14, fontWeight: '800', flex: 1 }}>{a.title}</Text>
                          {isNew && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.danger }} />}
                          <Text style={{ ...text.caption, color: color.primary, fontWeight: '700' }}>{a.time}</Text>
                        </View>
                        <Text style={text.caption} numberOfLines={2}>
                          {a.body}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ alignSelf: 'center', paddingTop: 4 }}>
                <Text style={{ ...text.caption, fontWeight: '700' }}>닫기</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
