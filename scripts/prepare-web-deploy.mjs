// 웹 빌드(dist)를 Vercel에 올리기 전에 정리·검사한다.  사용: npm run build:web
// 1) Vercel은 업로드 때 node_modules 폴더를 빼므로, 아이콘 글꼴 등이 든 assets/node_modules 를 assets/vendor 로 옮긴다.
// 2) 공개 사이트에 비밀번호·이전 Supabase 주소가 들어가지 않았는지 검사하고, 있으면 실패로 끝낸다.
// 3) SPA 주소 되돌리기용 vercel.json 을 dist 에 넣는다.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const from = path.join(DIST, 'assets', 'node_modules');
if (fs.existsSync(from)) fs.renameSync(from, path.join(DIST, 'assets', 'vendor'));

const textFiles = walk(DIST).filter((f) => /\.(js|html|json|css|map)$/.test(f));
for (const f of textFiles) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('/assets/node_modules/')) fs.writeFileSync(f, s.replaceAll('/assets/node_modules/', '/assets/vendor/'));
}

const all = textFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const problems = [];
if (process.env.EXPO_PUBLIC_LOGIN_PASSWORD && all.includes(process.env.EXPO_PUBLIC_LOGIN_PASSWORD)) problems.push('로그인 비밀번호가 빌드에 들어 있음');
if (process.env.EXPO_PUBLIC_LOGIN_EMAIL && all.includes(process.env.EXPO_PUBLIC_LOGIN_EMAIL)) problems.push('로그인 이메일이 빌드에 들어 있음');
if (!url || !all.includes(url)) problems.push('현재 .env 의 Supabase 주소가 빌드에 없음(캐시 문제일 수 있음: --clear 로 다시 빌드)');
if (all.includes('/assets/node_modules/')) problems.push('node_modules 경로가 남아 있음');
if (problems.length) {
  console.error('배포 중단:\n- ' + problems.join('\n- '));
  process.exit(1);
}

fs.writeFileSync(path.join(DIST, 'vercel.json'), JSON.stringify({ cleanUrls: true, rewrites: [{ source: '/:path*', destination: '/' }] }, null, 2));
console.log('웹 배포 준비 완료: ' + DIST + ' (Supabase ' + url + ')');
