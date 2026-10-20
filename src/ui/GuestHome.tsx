// 로그인 전 첫 화면: Stitch '핏로그 온보딩 랜딩'(지유 버전, docs/design-prototype 브랜치 01-onboarding.html).
// 우측 상단 '시작하기'나 하단 '오늘 미션 보기'를 누르면 화면 이동 없이 이메일·비밀번호 칸이 튀어나온다(scale+fade 스프링).
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signIn, signInAsGuest } from '@/shared/supabase';
import { Loop, Pop, Reveal, Underline } from './motion';
import { card, color, font, radius, text } from './theme';

const NATIVE = Platform.OS !== 'web';

// 서버에 닿지 못한 오류(인터넷 끊김, Supabase 일시정지 등)인지. 이 경우 비밀번호 문제가 아니다.
export const isNetworkError = (e: unknown) => /fetch|network|timeout/i.test(String((e as Error)?.message ?? e));
export const MSG_NETWORK = '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';

function LoginPopover({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [v] = useState(() => new Animated.Value(0));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 7, tension: 140, useNativeDriver: NATIVE }).start();
  }, [v]);

  const close = () => Animated.timing(v, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }).start(onClose);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
      onDone();
    } catch (e) {
      setMessage(isNetworkError(e) ? MSG_NETWORK : '이메일 또는 비밀번호가 맞지 않아요.');
      setBusy(false);
    }
  }

  const disabled = busy || !email || !password;
  const input = { borderWidth: 1, borderColor: color.line, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15, backgroundColor: color.page, color: color.ink, fontFamily: font.body } as const;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.overlay, opacity: v }}>
        <Pressable accessibilityLabel="닫기" onPress={close} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top + 56,
          left: 16,
          right: 16,
          maxWidth: 360,
          marginHorizontal: 'auto',
          backgroundColor: color.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: color.line,
          padding: 18,
          gap: 10,
          boxShadow: '0 12px 32px rgba(27,31,42,0.18)',
          transformOrigin: 'top center',
          opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) }, { scale: v }] }}>
            <Image source={require('../../assets/illustrations/jiyu-ok.jpg')} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.line }} accessibilityLabel="손으로 OK 사인을 하는 지유" />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...text.section, fontSize: 16 }}>로그인</Text>
            <Text style={text.caption}>멘토가 만들어 준 계정으로 들어와요</Text>
          </View>
        </View>
        <TextInput value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={color.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus style={input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" placeholderTextColor={color.muted} secureTextEntry autoComplete="current-password" onSubmitEditing={() => !disabled && submit()} style={input} />
        {message && <Text style={{ ...text.caption, color: color.danger }}>{message}</Text>}
        <Pressable accessibilityRole="button" onPress={submit} disabled={disabled} style={{ backgroundColor: color.primary, borderRadius: radius.pill, height: 46, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.body, color: '#fff', fontWeight: '700', fontSize: 15 }}>로그인</Text>}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const IMG = {
  hero: require('../../assets/illustrations/landing-hero.jpg'),
  mic: require('../../assets/illustrations/landing-step-mic.jpg'),
  nutrition: require('../../assets/illustrations/landing-feat-nutrition.jpg'),
  missions: require('../../assets/illustrations/landing-feat-missions.jpg'),
  stamp: require('../../assets/illustrations/landing-feat-stamp.jpg'),
};

const white = (a: number) => `rgba(255,255,255,${a})`;
// 프로토타입 keyframes: gentle-bounce(아래로 6px), pulse-ring(0.95↔1.1배, 0.8↔0.3)
const bounce = (v: Animated.Value) => ({ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] });
const pulse = (v: Animated.Value) => ({
  opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.3] }),
  transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
});
const center = { alignItems: 'center', justifyContent: 'center' } as const;

interface FeatureProps {
  index: number;
  img: ImageSourcePropType;
  alt: string;
  badge: ReactNode;
  chip: string;
  title: string;
  desc: string;
}

function Feature({ index, img, alt, badge, chip, title, desc }: FeatureProps) {
  return (
    <Reveal index={index} style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ marginBottom: 12 }}>
        <Image source={img} accessibilityLabel={alt} style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: color.primary }} />
        {badge}
      </View>
      <View style={{ backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
        <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary }}>{chip}</Text>
      </View>
      <Text style={text.section}>{title}</Text>
      <Text style={{ ...text.body, fontSize: 14, color: color.muted, textAlign: 'center', lineHeight: 22, maxWidth: 340 }}>{desc}</Text>
    </Reveal>
  );
}

const iconBadge = (name: keyof typeof MaterialIcons.glyphMap) => (
  <View style={{ position: 'absolute', right: -4, bottom: -4, backgroundColor: color.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: color.line }}>
    <MaterialIcons name={name} size={16} color={color.primary} />
  </View>
);

const streakBadge = () => (
  <View style={{ position: 'absolute', bottom: -10, alignSelf: 'center', backgroundColor: color.ink, borderRadius: radius.pill, borderWidth: 1, borderColor: '#fff', paddingHorizontal: 10, paddingVertical: 2 }}>
    <Text style={{ fontFamily: font.body, fontSize: 11, fontWeight: '700', color: '#fff' }}>🔥 연속 11일</Text>
  </View>
);

const divider = () => <View style={{ width: 48, height: 1, backgroundColor: color.line, alignSelf: 'center' }} />;

export function GuestHome({ onSignedIn }: { onSignedIn: () => void }) {
  const [open, setOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const [stepY, setStepY] = useState(0);
  const login = () => setOpen(true);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  // 체험 계정(익명 로그인)으로 바로 시작. 발표 화면 QR 은 ?guest=1 로 같은 일을 자동으로 한다.
  const tryAsGuest = async () => {
    setGuestBusy(true);
    setGuestError(null);
    try {
      await signInAsGuest();
      onSignedIn();
    } catch {
      setGuestError('지금은 체험 모드를 쓸 수 없어요. 잠시 뒤 다시 시도해 주세요.');
      setGuestBusy(false);
    }
  };
  const toStep = () => scroll.current?.scrollTo({ y: stepY });

  return (
    <View style={{ flex: 1, backgroundColor: color.surface }}>
      <View style={{ backgroundColor: color.cream, borderBottomWidth: 1, borderBottomColor: color.line, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color.primary, ...center }}>
            <MaterialIcons name="fitness-center" size={20} color="#fff" />
          </View>
          <Text style={{ fontFamily: font.body, fontSize: 20, fontWeight: '800', color: color.ink }}>핏로그</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={login} style={{ borderWidth: 1, borderColor: color.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.primary }}>시작하기</Text>
        </Pressable>
      </View>

      <ScrollView ref={scroll}>
        {/* 히어로 */}
        <View style={{ backgroundColor: color.cream, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40, gap: 12 }}>
          <Reveal>
            <Text style={{ ...text.script, transform: [{ rotate: '-1deg' }] }}>Just say it, FitLog logs it!</Text>
          </Reveal>
          <Reveal index={1}>
            <Text style={{ ...text.headline, fontSize: 30, lineHeight: 40 }}>말 한마디로 끝나는{'\n'}식단·운동 기록,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ ...text.headline, fontSize: 30, lineHeight: 40, color: color.primary }}>핏로그</Text>
                <Underline color={color.primary} />
              </View>
              <Text style={{ ...text.headline, fontSize: 30, lineHeight: 40 }}>와 함께하세요.</Text>
            </View>
          </Reveal>
          <Reveal index={2}>
            <Text style={{ ...text.body, color: color.muted, lineHeight: 24 }}>손으로 일일이 적지 마세요. 말하거나 사진 찍으면 AI가 영양소 분석부터 미션 체크까지 알아서!</Text>
          </Reveal>
          <Reveal index={3} style={{ ...card, padding: 16, marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: '100%', aspectRatio: 1.25 }}>
              <Image source={IMG.hero} accessibilityLabel="햄버거 세트 앞에서 휴대폰에 말하는 지유" style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="contain" />
            </View>
            <View style={{ position: 'absolute', left: 16, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.cream, borderWidth: 1, borderColor: color.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Pop style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.yellow }} />
              <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '600', color: color.ink }}>음성 인식 준비 완료</Text>
            </View>
          </Reveal>
          <Pressable accessibilityRole="button" accessibilityLabel="아래로 스크롤" onPress={toStep} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
            <Text style={{ fontFamily: font.body, fontSize: 11, fontWeight: '600', letterSpacing: 1, color: color.muted }}>SCROLL</Text>
            <Loop duration={2000} make={bounce} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: color.line, ...center }}>
              <MaterialIcons name="arrow-downward" size={16} color={color.primary} />
            </Loop>
          </Pressable>
        </View>

        {/* 핵심 기능(파란 섹션) */}
        <View onLayout={(e) => setStepY(e.nativeEvent.layout.y)} style={{ backgroundColor: color.primary, paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center' }}>
          <Text style={{ position: 'absolute', top: 20, left: 24, fontSize: 22, color: color.yellow }}>✦</Text>
          <Reveal style={{ backgroundColor: white(0.2), borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '600', color: '#fff' }}>핵심 기능</Text>
          </Reveal>
          <Reveal index={1}>
            <Text style={{ fontFamily: font.body, fontSize: 24, lineHeight: 32, fontWeight: '800', color: '#fff', textAlign: 'center' }}>기록은 3초,{'\n'}성취감은 하루 종일!</Text>
          </Reveal>
          <Reveal index={2} style={{ width: 176, height: 176, marginVertical: 24, ...center }}>
            <Loop duration={2500} make={pulse} style={{ position: 'absolute', width: 176, height: 176, borderRadius: 88, borderWidth: 1, borderColor: white(0.2) }} />
            <View style={{ position: 'absolute', width: 144, height: 144, borderRadius: 72, borderWidth: 1, borderColor: white(0.4) }} />
            <Image source={IMG.mic} accessibilityLabel="휴대폰 마이크 버튼을 누르는 손" style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: '#fff' }} />
            <Pop style={{ position: 'absolute', top: 22, right: 22, backgroundColor: color.yellow, borderRadius: 999, padding: 4, borderWidth: 2, borderColor: '#fff' }}>
              <MaterialIcons name="auto-awesome" size={16} color={color.onYellow} />
            </Pop>
          </Reveal>
          <Reveal index={3} style={{ alignItems: 'center' }}>
            <Text style={{ ...text.section, color: '#fff', marginBottom: 8 }}>말하거나 찍어서 기록</Text>
            <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 22, color: white(0.85), textAlign: 'center' }}>
              오늘 먹은 점심, 가볍게 한마디 남겨보세요.{'\n'}사진 한 장이면 칼로리와 탄단지까지 즉시 정리됩니다.
            </Text>
          </Reveal>
        </View>

        {/* 기능 3종 */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 48, gap: 40 }}>
          <Feature
            index={0}
            img={IMG.nutrition}
            alt="돋보기로 영양 성분을 보는 지유"
            badge={iconBadge('restaurant')}
            chip="AI가 자동으로 분석해요"
            title="음식명·칼로리·영양소 자동 기록"
            desc={'복잡한 식단 계산기는 이제 그만.\n자연스러운 일상 언어를 AI가 알아듣고 영양 성분을 분석합니다.\n부족한 단백질과 주의할 당류까지 한눈에 피드백해 드려요.'}
          />
          {divider()}
          <Feature
            index={1}
            img={IMG.missions}
            alt="체크된 미션 카드를 든 지유"
            badge={iconBadge('checklist')}
            chip="작은 습관이 만드는 변화"
            title="오늘의 미션 3종 세트"
            desc={'무리한 다이어트 대신 매일 지킬 수 있는 3가지 맞춤 미션.\n물 1.5L 마시기, 단백질 채우기, 15분 산책하기처럼\n쉽고 가벼운 실천으로 건강한 루틴을 완성하세요.'}
          />
          {divider()}
          <Feature
            index={2}
            img={IMG.stamp}
            alt="달력에 도장을 찍는 지유"
            badge={streakBadge()}
            chip="매일 쌓이는 뿌듯함"
            title="달력을 채우는 성취감"
            desc={'미션을 완료할 때마다 달력에 찍히는 노란 성공 도장!\n연속 달성 스트릭으로 지속 가능한 동기부여를 얻고\n한 달 후 눈에 띄게 달라진 나의 건강 변화를 확인하세요.'}
          />
        </View>

        {/* 하단 CTA */}
        <View style={{ backgroundColor: color.primary, paddingHorizontal: 24, paddingVertical: 56, alignItems: 'center', overflow: 'hidden' }}>
          <Pop style={{ position: 'absolute', top: 4, right: 32 }}>
            <Text style={{ fontSize: 30, color: color.yellow }}>★</Text>
          </Pop>
          <Text style={{ position: 'absolute', top: 36, left: 28, fontSize: 18, color: white(0.5) }}>★</Text>
          <Reveal>
            <Text style={{ fontFamily: font.body, fontSize: 22, lineHeight: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
              이제 기록은 핏로그와 함께,{'\n'}오늘 미션부터 시작해 보세요.
            </Text>
          </Reveal>
          <Reveal index={1}>
            <Text style={{ fontFamily: font.body, fontSize: 14, color: white(0.9), textAlign: 'center', marginBottom: 32 }}>가입 즉시 나만의 맞춤 건강 미션 3개가 배정됩니다.</Text>
          </Reveal>
          <Reveal index={2} style={{ width: '100%', maxWidth: 320, gap: 12 }}>
            <Pressable accessibilityRole="button" onPress={login} style={{ height: 56, borderRadius: radius.pill, backgroundColor: '#fff', flexDirection: 'row', gap: 8, ...center }}>
              <Text style={{ fontFamily: font.body, fontSize: 16, fontWeight: '700', color: color.primary }}>오늘 미션 보기</Text>
              <MaterialIcons name="arrow-forward" size={20} color={color.primary} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={tryAsGuest} disabled={guestBusy} style={{ height: 48, borderRadius: radius.pill, borderWidth: 1.5, borderColor: '#fff', ...center }}>
              <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '600', color: '#fff' }}>{guestBusy ? '체험 준비 중…' : '로그인 없이 체험하기'}</Text>
            </Pressable>
            {guestError && <Text style={{ fontFamily: font.body, fontSize: 13, color: '#fff', textAlign: 'center' }}>{guestError}</Text>}
          </Reveal>
        </View>

        {/* 푸터 */}
        <View style={{ backgroundColor: color.ink, paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: color.primary, ...center }}>
                <MaterialIcons name="fitness-center" size={14} color="#fff" />
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 18, fontWeight: '700', color: '#fff' }}>핏로그</Text>
            </View>
            <Text style={{ ...text.caption, textAlign: 'center' }}>말 한마디, 사진 한 장으로 끝내는 AI 건강 다이어리</Text>
          </View>
          <Text style={{ ...text.caption, fontSize: 11, textAlign: 'center', lineHeight: 18 }}>
            (주)마크애니 | 사업자등록번호: 101-81-47345{'\n'}서울특별시 중구 퇴계로 286 13층 | 5team@markany.com
          </Text>
          <Text style={{ ...text.caption, fontSize: 11, textAlign: 'center', opacity: 0.7 }}>© 2026 FitLog AI. All rights reserved.</Text>
        </View>
      </ScrollView>
      {open && <LoginPopover onClose={() => setOpen(false)} onDone={onSignedIn} />}
    </View>
  );
}
