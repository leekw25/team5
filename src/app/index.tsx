// 오늘 화면. 멘토가 A·B 컴포넌트를 조립하는 곳(A·B는 수정하지 않음).
// A·B 컴포넌트가 merge되면 Placeholder를 contract.ts의 컴포넌트로 바꾼다.
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { toDayKey } from '@/shared/date';
import { getApiKey } from '@/shared/gemini';

function Placeholder({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#999', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <Text style={{ color: '#666' }}>{label}</Text>
    </View>
  );
}

export default function TodayScreen() {
  const dayKey = toDayKey();
  const [hasKey, setHasKey] = useState(true);

  // 설정 화면에서 돌아올 때마다 키 상태를 다시 확인
  useFocusEffect(
    useCallback(() => {
      getApiKey().then((key) => setHasKey(!!key));
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {!hasKey && (
        <Link href="/settings" style={{ backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          Gemini API 키가 없습니다. 눌러서 입력해 주세요.
        </Link>
      )}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>{dayKey}</Text>
      <Placeholder label={`B: <MissionCards dayKey="${dayKey}" />`} />
      <Placeholder label="A: <InputPanel />" />
      <Placeholder label={`A: <Timeline dayKey="${dayKey}" />`} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Link href="/calendar">리워드 달력 →</Link>
        <Link href="/settings">설정 →</Link>
      </View>
    </ScrollView>
  );
}
