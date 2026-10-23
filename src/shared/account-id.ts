// 참석자 계정: 사람은 '이름'으로 로그인하고, Supabase 에는 이름에서 만든 이메일 주소로 저장한다.
// (Supabase 로그인은 이메일이 필요하고, 한글은 이메일 주소에 쓸 수 없어서 이름의 UTF-8 바이트를 16진수로 바꾼다)
// 계정 만들기 스크립트(scripts/create-attendees.mjs)와 로그인 화면이 같은 규칙을 쓴다.
export const ATTENDEE_DOMAIN = 'fitlog.ap';

export function loginEmail(idOrEmail: string): string {
  const id = idOrEmail.trim();
  if (id.includes('@')) return id; // 이메일로 만든 기존 계정(멘토·시연)
  const hex = Array.from(new TextEncoder().encode(id.normalize('NFC')), (b) => b.toString(16).padStart(2, '0')).join('');
  return `p-${hex}@${ATTENDEE_DOMAIN}`;
}
