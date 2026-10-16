// Stitch 디자인(docs/design/DESIGN.md) 토큰. 화면은 색·글꼴·모양을 여기서만 가져온다.
import { Platform } from 'react-native';

export const color = {
  primary: '#2F6BFF',
  primaryDeep: '#1F4FD8',
  primarySoft: '#E8EFFF',
  cream: '#FFF9EE',
  surface: '#FFFFFF',
  page: '#F7F8FC',
  ink: '#1B1F2A',
  muted: '#7A8194',
  line: '#E3E6EE',
  yellow: '#FFD43B',
  yellowSoft: '#FFF6D6',
  yellowLine: '#F5D77A',
  danger: '#F05252',
} as const;

// 웹은 Google Fonts(public/index.html), 휴대폰은 시스템 글꼴. 한글은 시스템 글꼴로 대체된다.
export const font = {
  body: Platform.select({ web: '"Plus Jakarta Sans", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', default: undefined }),
  script: Platform.select({ web: 'Caveat, cursive', default: undefined }),
} as const;

export const radius = { card: 16, pill: 999 } as const;

export const card = {
  backgroundColor: color.surface,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: color.line,
} as const;

export const text = {
  headline: { fontFamily: font.body, fontSize: 26, fontWeight: '800', color: color.ink, lineHeight: 34 },
  section: { fontFamily: font.body, fontSize: 18, fontWeight: '700', color: color.ink },
  body: { fontFamily: font.body, fontSize: 15, color: color.ink },
  caption: { fontFamily: font.body, fontSize: 12, color: color.muted },
  script: { fontFamily: font.script, fontSize: 20, color: color.primary, fontStyle: Platform.OS === 'web' ? 'normal' : 'italic' },
} as const;
