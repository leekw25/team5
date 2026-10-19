// 오늘 화면(Stitch 디자인 '오늘 홈'). 미션 카드는 이미경님 코드, 입력·기록·합계는 홍현정님 코드.
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DailyTotals, InputPanel, Timeline } from '@/features/input';
import { toDayKey } from '@/shared/date';
import { getApiKey } from '@/shared/gemini';
import { AppHeader } from '@/ui/chrome';
import { MissionCards } from '@/features/mission';
import { HeroCard, useMissionSummary } from '@/ui/HeroCard';
import { useDisplayName } from '@/ui/profile';
import { color, radius, text } from '@/ui/theme';

export default function TodayScreen() {
  const dayKey = toDayKey();
  const { done, streak } = useMissionSummary(dayKey);
  const name = useDisplayName();
  const [hasKey, setHasKey] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((key) => setHasKey(!!key));
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader dayKey={dayKey} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
        {!hasKey && (
          <Link href="/settings" style={{ backgroundColor: '#FFFCF0', borderColor: color.yellowLine, borderWidth: 1.5, borderRadius: radius.card, padding: 14 }}>
            <Text style={{ ...text.body, fontSize: 14 }}>Gemini API 키가 없어요. 눌러서 설정에서 입력해 주세요 →</Text>
          </Link>
        )}
        <HeroCard done={done} streak={streak} name={name} />
        <MissionCards dayKey={dayKey} />
        <InputPanel />
        <Timeline dayKey={dayKey} />
        <DailyTotals dayKey={dayKey} />
      </ScrollView>
    </View>
  );
}
