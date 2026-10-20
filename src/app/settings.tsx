// 설정(Stitch 디자인). Gemini API 키는 이 기기(휴대폰 보안 저장소·브라우저)에만 저장되고 코드·DB·GitHub에는 올라가지 않는다.
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { deleteApiKey, getApiKey, saveApiKey, testApiKey } from '@/shared/gemini';
import { supabase } from '@/shared/supabase';
import { MyMissions } from '@/features/mission';
import { AppHeader } from '@/ui/chrome';
import { ThemePicker } from '@/ui/ThemePicker';
import { VoiceSetting } from '@/ui/VoiceSetting';
import { isDevToolsOpen, openDevTools } from '@/ui/devtools-gate';
import { promptInstall, useInstallState } from '@/ui/install';
import { getDisplayName, NAME_MAX, saveDisplayName } from '@/ui/profile';
import { card, color, font, radius, text } from '@/ui/theme';

// 로그아웃은 이 기기의 세션만 지운다(scope: local). 서버 로그아웃 요청이 실패해도 항상 로그인 화면으로 돌아간다.
const signOut = () => supabase.auth.signOut({ scope: 'local' });

export default function SettingsScreen() {
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const install = useInstallState();
  const [devOpen, setDevOpen] = useState(isDevToolsOpen);
  const [taps, setTaps] = useState(0);
  const tapVersion = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= 7 && !devOpen) {
      openDevTools();
      setDevOpen(true);
    }
  };
  const [installHint, setInstallHint] = useState(false);

  useEffect(() => {
    getApiKey().then((key) => setSaved(!!key));
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    getDisplayName().then(setName).catch(() => {});
  }, []);

  async function onSaveName() {
    setNameBusy(true);
    setNameMsg(null);
    try {
      await saveDisplayName(name);
      setNameMsg(name.trim() ? '저장했어요. 오늘 화면에 이름이 나와요.' : '이름을 지웠어요.');
    } catch {
      setNameMsg('저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setNameBusy(false);
    }
  }

  // 웹에서만, 아직 설치 안 했을 때만 보인다. 바로 설치 창을 못 띄우는 브라우저는 누르면 방법을 알려 준다.
  const installRow =
    install === 'ready' || install === 'ios' || install === 'manual'
      ? {
          icon: 'install-mobile' as const,
          title: '홈 화면에 앱 설치',
          sub:
            install === 'ready'
              ? '누르면 바로 설치돼요. 주소창 없이 앱처럼 열려요'
              : !installHint
                ? '홈 화면에 핏로그 아이콘을 만들어요'
                : install === 'ios'
                  ? '사파리 아래쪽 공유 버튼(□↑) → "홈 화면에 추가"를 눌러 주세요'
                  : '브라우저 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"를 눌러 주세요',
          onPress: () => (install === 'ready' ? promptInstall() : setInstallHint(true)),
        }
      : null;

  const rows: { icon: keyof typeof MaterialIcons.glyphMap; title: string; sub: string; onPress: () => unknown }[] = [
    ...(installRow ? [installRow] : []),
    ...(devOpen ? [{ icon: 'build' as const, title: '개발 도구', sub: '측정표, 최근 AI 오류, 이 기기 상태', onPress: () => router.push('/dev') }] : []),
    { icon: 'logout', title: '로그아웃', sub: email ? `로그인 계정: ${email} · 다른 계정으로 바꾸기` : '다른 계정으로 로그인', onPress: signOut },
  ];

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
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ ...card, padding: 20, gap: 12 }}>
          <Text style={{ ...text.section, fontSize: 20 }}>내 이름</Text>
          <Text style={text.caption}>오늘 화면에 “○○님”으로 나와요. 이 계정에 저장돼 다른 기기에서도 같아요.</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              placeholder="예) 지유"
              placeholderTextColor={color.muted}
              onSubmitEditing={onSaveName}
              style={{ flex: 1, borderWidth: 1, borderColor: color.inputLine, borderRadius: 12, padding: 14, backgroundColor: color.inputBg, fontFamily: font.body, color: color.ink }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이름 저장"
              onPress={onSaveName}
              disabled={nameBusy}
              style={{ backgroundColor: color.primaryDeep, borderRadius: radius.pill, paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center', opacity: nameBusy ? 0.5 : 1 }}
            >
              {nameBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.body, fontSize: 15, fontWeight: '800', color: '#fff' }}>저장</Text>}
            </Pressable>
          </View>
          {nameMsg && <Text style={{ ...text.caption, color: color.ink }}>{nameMsg}</Text>}
        </View>

        <ThemePicker />

        <VoiceSetting />

        <MyMissions />

        <View style={{ ...card, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...text.section, fontSize: 20 }}>Gemini API 키</Text>
            <View style={{ backgroundColor: saved ? color.primarySoft : color.chipBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: saved ? color.primary : color.muted }}>{saved ? '저장됨 ✅' : '없음'}</Text>
            </View>
          </View>
          <Text style={text.caption}>AI 자동 분석과 음성 인식에 쓰는 키예요. Google AI Studio(aistudio.google.com) → Get API key에서 발급해 붙여넣으세요.</Text>
          <Text style={{ ...text.caption, color: color.ink }}>API 키 입력</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="발급받은 API 키 붙여넣기"
            placeholderTextColor={color.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: color.inputLine, borderRadius: 12, padding: 14, backgroundColor: color.inputBg, fontFamily: font.body, color: color.ink }}
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
          {rows.map((row, i) => (
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
        {/* 배포 버전에서는 개발 도구를 숨긴다. 버전 글자를 7번 누르면 이 기기에서만 열린다(시연·점검용). */}
        <Pressable onPress={tapVersion} accessibilityLabel="앱 버전">
          <Text style={{ ...text.caption, textAlign: 'center' }}>FitLog AI v1.0</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
