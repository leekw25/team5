// 오늘 화면(Stitch 디자인 '오늘 홈'). 미션 카드는 이미경님 코드, 입력·기록·합계는 홍현정님 코드.
import { Link, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { DailyTotals, InputPanel, Timeline } from '@/features/input';
import { toDayKey } from '@/shared/date';
import { getApiKey } from '@/shared/gemini';
import { isAttendee } from '@/shared/supabase';
import { AppHeader } from '@/ui/chrome';
import { MissionCards } from '@/features/mission';
import { ClimaxOverlay } from '@/ui/Climax';
import { useCoach } from '@/ui/coach';
import { HeroCard, useMissionSummary } from '@/ui/HeroCard';
import { Reveal, ScrollTopButton, useScrollY } from '@/ui/motion';
import { useDisplayName } from '@/ui/profile';
import { color, radius, text } from '@/ui/theme';

export default function TodayScreen() {
  const dayKey = toDayKey();
  const { done, streak, celebrate, dismissCelebrate } = useMissionSummary(dayKey);
  const coach = useCoach(dayKey);
  const name = useDisplayName();
  const [hasKey, setHasKey] = useState(true);
  const [guest, setGuest] = useState(false);
  const { y, onScroll } = useScrollY();
  const scroll = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((key) => setHasKey(!!key));
      isAttendee().then(setGuest);
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader dayKey={dayKey} scrollY={y} />
      {/* 스크롤 모션: 섹션이 보일 때 올라오는 리빌, 헤더 그림자, 맨 위로 버튼(히어로 카드 축소 모션은 어색해서 뺌) */}
      <Animated.ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 80 }}>
        {guest ? (
          <View style={{ backgroundColor: color.primarySoft, borderRadius: radius.card, padding: 14 }}>
            <Text style={{ ...text.body, fontSize: 14, color: color.primary, fontWeight: '700' }}>환영해요 👋 빠른 기록, 지유의 메뉴 추천, 미션 완료 체크로 핏로그를 바로 써 보세요!</Text>
          </View>
        ) : (
          !hasKey && (<Link href="/settings" style={{ backgroundColor: color.successBg, borderColor: color.yellowLine, borderWidth: 1.5, borderRadius: radius.card, padding: 14 }}>
            <Text style={{ ...text.body, fontSize: 14 }}>Gemini API 키가 없어요. 눌러서 설정에서 입력해 주세요 →</Text>
          </Link>
        )
        )}
        <HeroCard done={done} streak={streak} name={name} line={coach.line} />
        <MissionCards dayKey={dayKey} />
        <Reveal>
          <InputPanel />
        </Reveal>
        <Reveal>
          <DailyTotals dayKey={dayKey} />
        </Reveal>
        <Timeline dayKey={dayKey} />
      </Animated.ScrollView>
      <ScrollTopButton y={y} onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })}>
        <MaterialIcons name="arrow-upward" size={22} color="#fff" />
      </ScrollTopButton>
      {celebrate && <ClimaxOverlay streak={celebrate.streak} dayKey={dayKey} onClose={dismissCelebrate} />}
    </View>
  );
}
