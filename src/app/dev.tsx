// 개발 도구 화면(A-F09, 설정 → 개발 도구). 실제 내용은 features/input/DevTools 에 있다.
import { ScrollView, Text, View } from 'react-native';
import { DevTools } from '@/features/input/DevTools';
import { AppHeader } from '@/ui/chrome';
import { isDevToolsOpen } from '@/ui/devtools-gate';
import { color, text } from '@/ui/theme';

export default function DevScreen() {
  if (!isDevToolsOpen()) {
    return (
      <View style={{ flex: 1, backgroundColor: color.page }}>
        <AppHeader />
        <Text style={{ ...text.body, color: color.muted, textAlign: 'center', padding: 32 }}>개발 도구는 배포 버전에서 숨겨져 있어요.</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="개발 도구" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <DevTools />
      </ScrollView>
    </View>
  );
}
