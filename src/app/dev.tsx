// 개발 도구 화면(A-F09, 설정 → 개발 도구). 실제 내용은 features/input/DevTools 에 있다.
import { ScrollView, View } from 'react-native';
import { DevTools } from '@/features/input/DevTools';
import { AppHeader } from '@/ui/chrome';
import { color } from '@/ui/theme';

export default function DevScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="개발 도구" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <DevTools />
      </ScrollView>
    </View>
  );
}
