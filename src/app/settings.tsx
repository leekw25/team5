// Gemini API 키 입력 화면. 키는 이 휴대폰의 보안 저장소에만 저장되고 코드·DB·GitHub에는 올라가지 않는다.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';
import { deleteApiKey, getApiKey, saveApiKey, testApiKey } from '@/shared/gemini';

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
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Gemini API 키</Text>
      <Text style={{ color: '#666' }}>
        Google AI Studio(aistudio.google.com) → Get API key에서 발급한 키를 붙여넣으세요. 키는 이 휴대폰에만 저장됩니다.
      </Text>
      <Text>상태: {saved ? '저장됨 ✅' : '없음'}</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="AIza..."
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      {busy ? <ActivityIndicator /> : <Button title="확인 후 저장" onPress={onSave} disabled={!input.trim()} />}
      {saved && <Button title="키 삭제" color="#c00" onPress={onDelete} />}
      {message && <Text>{message}</Text>}
    </View>
  );
}
