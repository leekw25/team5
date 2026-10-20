// 발표 참석자 계정 만들기(멘토가 직접 실행). 이름 목록: supabase/.local/attendees.txt (한 줄에 한 명, git 에 올리지 않음)
// 각 이름은 앱 로그인 규칙(src/shared/account-id.ts)과 같은 이메일로 만들고, 화면 이름(user_metadata.name)은 그 이름으로 둔다.
// 필요한 값은 실행할 때만 넣는다(파일·코드에 저장하지 않음):
//   SUPABASE_SERVICE_ROLE_KEY : Supabase 대시보드 → Project Settings → API Keys 의 service_role(secret) 키
//   ATTENDEE_PASSWORD        : 참석자 공통 비밀번호(Supabase 기본 최소 길이 6자)
// 이미 있는 계정은 건너뛴다. 다시 실행해도 안전하다.
import fs from 'node:fs';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.ATTENDEE_PASSWORD;
if (!URL || !KEY || !PASSWORD) {
  console.error('EXPO_PUBLIC_SUPABASE_URL(.env), SUPABASE_SERVICE_ROLE_KEY, ATTENDEE_PASSWORD 가 필요합니다. 사용법은 파일 맨 위 주석 참고.');
  process.exit(1);
}

const loginEmail = (name) => `p-${Buffer.from(name.trim().normalize('NFC'), 'utf8').toString('hex')}@fitlog.ap`; // account-id.ts 와 같은 규칙
const names = [...new Set(fs.readFileSync('supabase/.local/attendees.txt', 'utf8').split(/\r?\n/).map((n) => n.trim()).filter(Boolean))];

let made = 0;
for (const name of names) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginEmail(name), password: PASSWORD, email_confirm: true, user_metadata: { name } }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    made += 1;
    console.log(`만듦   ${name}`);
  } else if (/already|exists|registered/i.test(JSON.stringify(body))) {
    console.log(`있음   ${name} (건너뜀)`);
  } else {
    console.log(`실패   ${name}: ${body.msg ?? body.message ?? res.status}`);
    if (/password/i.test(JSON.stringify(body))) {
      console.error('비밀번호 규칙에 맞지 않습니다. 6자 이상으로 하거나 대시보드 Authentication → Policies 에서 최소 길이를 낮추세요.');
      process.exit(1);
    }
  }
}
console.log(`\n총 ${names.length}명 중 새로 만든 계정 ${made}개. 앱 로그인: 이름 + 비밀번호`);
