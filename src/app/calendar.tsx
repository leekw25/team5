// 리워드 달력(이미경님 B-F08·B-F09, Stitch '리워드 달력' 디자인).
import { ScrollView, View } from 'react-native';
import { RewardCalendar } from '@/features/reward';
import { AppHeader } from '@/ui/chrome';
import { color } from '@/ui/theme';

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="리워드 달력" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <RewardCalendar />
      </ScrollView>
    </View>
  );
}
