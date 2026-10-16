import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// .env에 넣는 값. anon key는 공개돼도 되는 키이고, 데이터 보호는 DB의 RLS가 맡는다.
// service_role 키는 절대 앱에 넣지 않는다.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error('.env에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요 (.env.example 참고)');
}

export const supabase = createClient(url, anonKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

// 로그인돼 있으면 true. 아니면 .env의 계정으로 자동 로그인을 시도하고(개발용),
// 계정이 .env에 없으면 false → 로그인 화면을 보여 준다.
// 웹(Vercel) 배포에는 EXPO_PUBLIC_LOGIN_* 를 넣지 않는다. 넣으면 비밀번호가 공개 사이트 코드에 그대로 담긴다.
export async function ensureSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const email = process.env.EXPO_PUBLIC_LOGIN_EMAIL;
  const password = process.env.EXPO_PUBLIC_LOGIN_PASSWORD;
  if (!email || !password) return false;
  await signIn(email, password);
  return true;
}
