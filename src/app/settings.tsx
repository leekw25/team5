// 설정(Stitch 디자인). Gemini API 키는 이 기기(휴대폰 보안 저장소·브라우저)에만 저장되고 코드·DB·GitHub에는 올라가지 않는다.
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { deleteApiKey, getApiKey, saveApiKey, testApiKey } from '@/shared/gemini';
import { supabase } from '@/shared/supabase';
import { AppHeader } from '@/ui/chrome';
import { card, color, font, radius, text } from '@/ui/theme';

const ROWS = [
  { icon: 'build', title: '개발 도구', sub: '측정표, 최근 AI 오류, 이 기기 상태', onPress: () => router.push('/dev') },
  { icon: 'logout', title: '로그아웃', sub: '다른 계정으로 로그인', onPress: () => supabase.auth.signOut().then(() => router.replace('/')) },
] as const;

export default function SettingsScreen() {
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getApiKey().then((key) => setSaved(!!key));
  }, []);

  async function onSave() {
    setBusy(true);
    setMessage(null);
    try {
      if (!(await testApiKey(input))) {
        setMessage('키가 올바르지 않습니다. Google AI Studio에서 다시 복사해 주세요.');
        return;
      }
      await saveApiKey(input);
      setInput('');
      setSaved(true);
      setMessage('저장했습니다.');
    } catch {
      setMessage('확인 중 오류가 났습니다. 인터넷 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    await deleteApiKey();
    setSaved(false);
    setMessage('삭제했습니다.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader title="설정" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ ...card, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...text.section, fontSize: 20 }}>Gemini API 키</Text>
              <Text style={text.caption}>AI 자동 분석과 음성 인식에 쓰는 키예요. Google AI Studio(aistudio.google.com) → Get API key에서 발급해 붙여넣으세요.</Text>
            </View>
            <View style={{ backgroundColor: saved ? color.primarySoft : '#F1F3F8', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: saved ? color.primary : color.muted }}>{saved ? '저장됨 ✅' : '없음'}</Text>
            </View>
          </View>
          <Text style={{ ...text.caption, color: color.ink }}>API 키 입력</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="AIza..."
            placeholderTextColor={color.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: '#D5DCF0', borderRadius: 12, padding: 14, backgroundColor: '#F4F6FD', fontFamily: font.body, color: color.ink }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {saved ? (
              <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={8}>
                <Text style={{ fontFamily: font.body, fontSize: 15, fontWeight: '700', color: color.danger }}>키 삭제</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              disabled={busy || !input.trim()}
              style={{ backgroundColor: color.primaryDeep, borderRadius: radius.pill, paddingHorizontal: 22, height: 44, alignItems: 'center', justifyContent: 'center', opacity: busy || !input.trim() ? 0.5 : 1 }}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.body, fontSize: 15, fontWeight: '800', color: '#fff' }}>확인 후 저장</Text>}
            </Pressable>
          </View>
          {message && <Text style={{ ...text.caption, color: color.ink }}>{message}</Text>}
        </View>

        <View style={{ ...card, overflow: 'hidden' }}>
          {ROWS.map((row, i) => (
            <Pressable
              key={row.title}
              accessibilityRole="button"
              onPress={row.onPress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={row.icon} size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...text.body, fontWeight: '700' }}>{row.title}</Text>
                <Text style={text.caption}>{row.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={color.muted} />
            </Pressable>
          ))}
        </View>
        <Text style={{ ...text.caption, textAlign: 'center' }}>FitLog AI v1.0</Text>
      </ScrollView>
    </View>
  );
}
