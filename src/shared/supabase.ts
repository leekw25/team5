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

// 시연·개발용: .env의 계정으로 자동 로그인. 각자 자기 계정을 .env에 넣는다.
export async function ensureSignedIn(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const email = process.env.EXPO_PUBLIC_LOGIN_EMAIL;
  const password = process.env.EXPO_PUBLIC_LOGIN_PASSWORD;
  if (!email || !password) throw new Error('.env에 EXPO_PUBLIC_LOGIN_EMAIL, EXPO_PUBLIC_LOGIN_PASSWORD를 넣어 주세요');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
