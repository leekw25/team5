// 데이터 저장소 — Supabase 버전(통합). 기능 코드는 이 파일의 recordsRepo 만 쓴다(RecordsRepo 약속 그대로).
// - user_id 는 DB 기본값 auth.uid(), day_key 는 DB가 occurred_at 으로 자동 계산한다. 앱은 넣지 않는다.
// - 다른 사람 기록은 RLS 가 막는다(로그인한 본인 행만 읽고 쓴다).
// - local-records.ts 는 홍현정님 로컬 저장소 구현으로, 테스트의 가짜 저장소로 계속 쓰인다(지우지 않는다).
import { supabase } from '@/shared/supabase';
import type { HealthRecord, NewHealthRecord, RecordsRepo } from '@/shared/types/contract';

const TABLE = 'records';

// DB에 보내도 되는 칸만 고른다(id·user_id·day_key·created_at 은 DB가 채운다).
function writable(r: Partial<NewHealthRecord>) {
  const { occurred_at, kind, source, raw_text, foods, exercises, water_ml, confidence } = r;
  return Object.fromEntries(
    Object.entries({ occurred_at, kind, source, raw_text, foods, exercises, water_ml, confidence }).filter(([, v]) => v !== undefined),
  );
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export const recordsRepo: RecordsRepo = {
  async listByDay(dayKey) {
    return check<HealthRecord[]>(await supabase.from(TABLE).select('*').eq('day_key', dayKey).order('occurred_at', { ascending: true }));
  },

  async insertMany(records) {
    if (records.length === 0) return [];
    return check<HealthRecord[]>(await supabase.from(TABLE).insert(records.map(writable)).select('*'));
  },

  async update(id, patch) {
    return check<HealthRecord>(await supabase.from(TABLE).update(writable(patch)).eq('id', id).select('*').single());
  },

  async remove(id) {
    check(await supabase.from(TABLE).delete().eq('id', id));
  },
};
