// Stitch 디자인(docs/design/DESIGN.md) 토큰. 화면은 색·글꼴·모양을 여기서만 가져온다.
// 테마 5종(이미경님 제안): 블루(기본)·화이트·다크·핑크·그린. 고르면 color·card·text 값을 그 자리에서 바꾸고
// 앱 화면을 다시 그린다(_layout 의 key). 파일 맨 위에서 만든 StyleSheet 은 themedStyles 로 감싸야 따라 바뀐다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const blue = {
  primary: '#2F6BFF',
  primaryDeep: '#1F4FD8',
  primarySoft: '#E8EFFF',
  primaryLine: '#C9D8FF', // 연한 파란 테두리·마이크 고리
  cream: '#FFF9EE',
  creamLine: '#F3E6CC',
  surface: '#FFFFFF',
  page: '#F7F8FC',
  backdrop: '#E6EAF3', // PC 웹에서 휴대폰 틀 바깥
  ink: '#1B1F2A',
  muted: '#7A8194',
  line: '#E3E6EE',
  chipBg: '#F1F3F8',
  inputBg: '#F4F6FD',
  inputLine: '#D5DCF0',
  yellow: '#FFD43B',
  yellowSoft: '#FFF6D6',
  yellowLine: '#F5D77A',
  yellowInk: '#8A6A00', // 연한 노랑 위 글자
  successBg: '#FFFCF0', // 성공한 미션 카드
  onYellow: '#1B1F2A', // 노란 원 안 아이콘(테마와 무관하게 진한 색)
  overlay: 'rgba(27,31,42,0.35)',
  danger: '#F05252',
};
type Palette = typeof blue;

export const THEMES = {
  blue: { label: '블루', palette: blue },
  white: {
    label: '화이트',
    palette: { ...blue, primary: '#1B1F2A', primaryDeep: '#000000', primarySoft: '#EEF0F4', primaryLine: '#D5D8DE', cream: '#FFFFFF', creamLine: '#ECECEC', page: '#FAFAFA', backdrop: '#EDEDED', inputBg: '#F5F5F7', inputLine: '#DCDDE2' },
  },
  dark: {
    label: '다크',
    palette: {
      ...blue,
      primary: '#4A74E8', // 흰 글자와 대비 4:1 이상, 어두운 배경 위 파란 글자도 읽힘
      primaryDeep: '#3A63D6',
      primarySoft: '#24304D',
      primaryLine: '#33456E',
      cream: '#1E2230',
      creamLine: '#2E3345',
      surface: '#1A1D26',
      page: '#12141B',
      backdrop: '#0B0C10',
      ink: '#ECEEF4',
      muted: '#9097A8',
      line: '#2C3140',
      chipBg: '#262A36',
      inputBg: '#20242F',
      inputLine: '#333949',
      yellowSoft: '#3A331A',
      yellowLine: '#6E5E24',
      yellowInk: '#FFD43B',
      successBg: '#2A2718',
      overlay: 'rgba(0,0,0,0.55)',
      danger: '#FF6B6B',
    },
  },
  pink: {
    label: '핑크',
    palette: { ...blue, primary: '#E84C88', primaryDeep: '#C9356F', primarySoft: '#FDE8F0', primaryLine: '#F8C4D8', cream: '#FFF6F9', creamLine: '#F6DCE6', page: '#FCF7F9', backdrop: '#F3E3EA', chipBg: '#F7EEF2', inputBg: '#FBF1F5', inputLine: '#F0D3DF' },
  },
  green: {
    label: '그린',
    palette: { ...blue, primary: '#1E9E6A', primaryDeep: '#157A51', primarySoft: '#E3F6EC', primaryLine: '#BFE6D2', cream: '#F5FBF6', creamLine: '#D7ECDF', page: '#F6FAF7', backdrop: '#E2EFE7', chipBg: '#EEF5F1', inputBg: '#F0F8F3', inputLine: '#CFE6D8' },
  },
} satisfies Record<string, { label: string; palette: Palette }>;
export type ThemeName = keyof typeof THEMES;

// 화면이 import 해서 쓰는 값. 테마를 바꾸면 같은 객체의 값이 바뀐다.
export const color: Palette = { ...blue };

// 웹은 Google Fonts(public/index.html), 휴대폰은 시스템 글꼴. 한글은 시스템 글꼴로 대체된다.
export const font = {
  body: Platform.select({ web: '"Plus Jakarta Sans", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', default: undefined }),
  script: Platform.select({ web: 'Caveat, cursive', default: undefined }),
} as const;

export const radius = { card: 16, pill: 999 } as const;

const makeCard = () => ({ backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line });
const makeText = () =>
  ({
    headline: { fontFamily: font.body, fontSize: 26, fontWeight: '800', color: color.ink, lineHeight: 34 },
    section: { fontFamily: font.body, fontSize: 18, fontWeight: '700', color: color.ink },
    body: { fontFamily: font.body, fontSize: 15, color: color.ink },
    caption: { fontFamily: font.body, fontSize: 12, color: color.muted },
    script: { fontFamily: font.script, fontSize: 20, color: color.primary, fontStyle: Platform.OS === 'web' ? 'normal' : 'italic' },
  }) as const;

export const card = makeCard();
export const text = makeText();

// ── 테마 바꾸기 ──
const STORAGE_KEY = 'fitlog:theme';
let current: ThemeName = 'blue';
let version = 0;
const listeners = new Set<() => void>();

export const getTheme = () => current;
export const getThemeVersion = () => version;
export const subscribeTheme = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function apply(name: ThemeName) {
  current = name;
  Object.assign(color, THEMES[name].palette);
  Object.assign(card, makeCard());
  const next = makeText();
  for (const key of Object.keys(next) as (keyof typeof next)[]) Object.assign(text[key], next[key]);
  version += 1;
  if (typeof document !== 'undefined') document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color.cream); // 상태 표시줄 = 헤더 색
  listeners.forEach((l) => l());
}

export async function setTheme(name: ThemeName) {
  apply(name);
  await AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {});
}

// 앱 시작 때 한 번: 이 기기에 저장된 테마를 불러온다
export async function loadTheme() {
  const saved = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  if (saved && saved in THEMES && saved !== current) apply(saved as ThemeName);
}

// 파일 맨 위 StyleSheet 용: 테마가 바뀌면 처음 쓸 때 다시 만든다. 사용법 const styles = themedStyles(() => StyleSheet.create({...}))
export function themedStyles<T extends object>(make: () => T): T {
  let cache = make();
  let builtAt = version;
  return new Proxy({} as T, {
    get(_, key) {
      if (builtAt !== version) {
        cache = make();
        builtAt = version;
      }
      return cache[key as keyof T];
    },
  });
}
