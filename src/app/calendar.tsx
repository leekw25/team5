// 리워드 달력 화면. B의 <RewardCalendar />가 merge되면 Placeholder를 바꾼다.
import { Text, View } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={{ padding: 16 }}>
      <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#999', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: '#666' }}>B: {'<RewardCalendar />'}</Text>
      </View>
    </View>
  );
}
