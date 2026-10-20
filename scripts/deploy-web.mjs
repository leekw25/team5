// dist 를 Vercel(fitlog-team5)에 올리고, 실제 사이트가 방금 빌드한 코드로 바뀌었는지 확인한다.  사용: npm run deploy:web
// - Vercel CLI 결과(JSON)의 status 로 성공/실패를 판단한다(출력 형식이 바뀌어도 'Aliased' 같은 문구에 기대지 않는다).
// - 일시 오류로 실패하면 한 번 더 시도한다.
// - 마지막에 운영 주소의 앱 코드 파일 이름이 로컬 dist 와 같은지 비교한다.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://fitlog-team5.vercel.app';
const DIST = 'dist';
const entryOf = (html) => html.match(/\/_expo\/static\/js\/web\/entry-[a-z0-9]+\.js/)?.[0] ?? null;

function deployOnce() {
  const r = spawnSync('npx vercel deploy --prod --yes --cwd dist', { shell: true, encoding: 'utf8' });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  // 출력 안의 JSON 덩어리 중 status 가 있는 것
  const json = [...out.matchAll(/\{[\s\S]*?"status"[\s\S]*?\n\}/g)].map((m) => {
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }).find(Boolean);
  const ok = r.status === 0 && (json ? json.status === 'ok' : /Aliased|Production:/i.test(out));
  return { ok, json, out };
}

let result = deployOnce();
if (!result.ok) {
  console.log('배포 첫 시도 실패, 10초 뒤 한 번 더 시도합니다…');
  console.log((result.json?.message ?? result.out.trim().split('\n').slice(-5).join('\n')) || '(메시지 없음)');
  await new Promise((r) => setTimeout(r, 10_000));
  result = deployOnce();
}
fs.rmSync(path.join(DIST, '.env.local'), { force: true }); // vercel 이 내려받는 파일. 남겨 두지 않는다

if (!result.ok) {
  console.error('배포 실패:\n' + (result.json ? JSON.stringify(result.json, null, 2) : result.out.trim().split('\n').slice(-15).join('\n')));
  process.exit(1);
}
console.log(`배포 완료: ${result.json?.deployment?.url ?? '(주소 미표시)'} (${result.json?.deployment?.readyState ?? 'READY'})`);

// 운영 주소가 새 코드로 바뀌었는지 확인(바로 반영 안 될 수 있어 몇 번 다시 본다)
const local = entryOf(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'));
for (let i = 0; i < 6; i++) {
  const live = entryOf(await (await fetch(SITE, { cache: 'no-store' })).text());
  if (live === local) {
    console.log(`운영 반영 확인: ${SITE} → ${live}`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5_000));
}
console.error(`배포는 됐지만 ${SITE} 가 아직 새 코드가 아닙니다(로컬 ${local}). Vercel 대시보드에서 Production 연결을 확인하세요.`);
process.exit(1);
