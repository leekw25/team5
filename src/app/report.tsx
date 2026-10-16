// 리포트 자리. 주간 영양 균형·AI 총평은 발표 범위 밖이라 이후에 만든다.
import { Text, View } from 'react-native';
import { AppHeader } from '@/ui/chrome';
import { card, color, text } from '@/ui/theme';

export default function ReportScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="리포트" />
      <View style={{ padding: 20 }}>
        <View style={{ ...card, padding: 24, gap: 6, alignItems: 'center' }}>
          <Text style={text.script}>Coming soon</Text>
          <Text style={{ ...text.section, textAlign: 'center' }}>주간 리포트는 준비 중이에요</Text>
          <Text style={{ ...text.caption, textAlign: 'center' }}>탄·단·지 균형과 AI 주간 총평이 들어올 자리예요.</Text>
        </View>
      </View>
    </View>
  );
}
