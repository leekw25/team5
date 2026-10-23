-- 미션 200개·랜덤 배정·재배정·직접 체크·사용자 미션(이미경님 제안). 기존 행은 그대로 두고 칸만 늘린다.

-- 기록: 수면·신체 측정 종류 추가, 종류별 세부값(details)
-- details 예) sleep: {"sleep_min": 420, "bed_time": "23:30", "wake_time": "06:30"}
--             body:  {"weight_kg": 58.2, "waist_cm": 70, "condition": 4}
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check check (kind in ('meal', 'exercise', 'water', 'sleep', 'body'));
alter table public.records add column if not exists details jsonb not null default '{}';

-- 날짜별 미션: 직접 체크한 시각, 다시 뽑은 횟수(하루 합계 5회까지는 앱이 막는다), 사용자 미션 제목 사본
alter table public.daily_missions add column if not exists checked_at timestamptz;
alter table public.daily_missions add column if not exists reroll_count integer not null default 0;
alter table public.daily_missions add column if not exists title text;

-- 사용자가 직접 만든 미션(직접 체크형). 랜덤 배정·다시 뽑기 후보에 들어간다.
create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  slot text not null check (slot in ('diet', 'life', 'exercise')),
  title text not null check (char_length(title) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.user_missions enable row level security;
create policy "own rows" on public.user_missions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
