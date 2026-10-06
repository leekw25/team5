import { supabase } from './supabase';
import type { HealthRecord } from './types/contract';

// 그날 기록 전체(시간순). A의 타임라인과 B의 판정이 같이 쓴다.
export async function fetchRecords(dayKey: string): Promise<HealthRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('day_key', dayKey)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return data as HealthRecord[];
}
