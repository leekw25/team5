// 사용자 이름: Supabase 로그인 계정의 정보(user_metadata.name)에 저장한다. 기기를 바꿔도 같은 이름이 나온다.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from '@/shared/supabase';

export const NAME_MAX = 12;

export async function getDisplayName(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return String(data.session?.user.user_metadata?.name ?? '').trim();
}

export async function saveDisplayName(name: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { name: name.trim().slice(0, NAME_MAX) } });
  if (error) throw error;
}

// 화면이 보일 때마다 이름을 다시 읽는다(설정에서 바꾸고 돌아오면 바로 반영).
export function useDisplayName(): string {
  const [name, setName] = useState('');
  useFocusEffect(
    useCallback(() => {
      getDisplayName().then(setName).catch(() => {});
    }, []),
  );
  return name;
}
