-- Supabase 어드바이저(unindexed_foreign_keys): 사용자 미션 조회·계정 삭제 시 user_id 인덱스 사용
create index if not exists user_missions_user_id on public.user_missions (user_id);
