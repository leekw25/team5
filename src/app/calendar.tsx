// 리워드 달력 자리(Stitch 디자인 '리워드 달력'). 이미경님 RewardCalendar 가 통합되면 이 자리에 들어간다.
import { Text, View } from 'react-native';
import { AppHeader } from '@/ui/chrome';
import { card, color, text } from '@/ui/theme';

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="리워드 달력" />
      <View style={{ padding: 20 }}>
        <View style={{ ...card, padding: 24, gap: 6, alignItems: 'center' }}>
          <Text style={text.script}>Keep going!</Text>
          <Text style={{ ...text.section, textAlign: 'center' }}>리워드 달력은 미션 앱 통합 후 열려요</Text>
          <Text style={{ ...text.caption, textAlign: 'center' }}>달성 수 링, 완수 스탬프, 연속 달성이 여기에 들어옵니다.</Text>
        </View>
      </View>
    </View>
  );
}
