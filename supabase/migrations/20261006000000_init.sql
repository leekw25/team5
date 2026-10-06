-- 핏로그 초기 스키마. Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 Run.
-- 모든 테이블은 RLS로 "로그인한 본인 행만" 읽고 쓴다.

-- 기록 (A가 쓰고 A·B가 읽음)
create table public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  occurred_at timestamptz not null,
  -- 한국 날짜. occurred_at에서 DB가 자동 계산하므로 앱은 넣지 않는다.
  day_key date generated always as ((occurred_at at time zone 'Asia/Seoul')::date) stored,
  kind text not null check (kind in ('meal', 'exercise', 'water')),
  source text not null check (source in ('voice', 'text', 'photo', 'quick', 'health')),
  raw_text text,
  foods jsonb not null default '[]',
  exercises jsonb not null default '[]',
  water_ml integer,
  confidence real not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);
create index records_user_day on public.records (user_id, day_key);
-- 휴대폰 걸음 수(source='health')는 하루 1개만. upsert로 덮어쓴다.
create unique index records_one_health_per_day on public.records (user_id, day_key) where source = 'health';

-- 날짜별 미션 3개와 판정 결과 (B)
create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day_key date not null,
  slot text not null check (slot in ('diet', 'life', 'exercise')),
  mission_code text not null,
  params jsonb not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'success', 'failed')),
  achieved_at timestamptz,
  unique (user_id, day_key, slot)
);

-- 배지 (B, P1)
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  badge_code text not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

-- 날짜별 성공 미션 수 (달력·스트릭용). security_invoker로 RLS가 그대로 적용된다.
create view public.v_day_status with (security_invoker = true) as
select user_id, day_key, count(*) filter (where status = 'success')::int as success_count
from public.daily_missions
group by user_id, day_key;

alter table public.records enable row level security;
alter table public.daily_missions enable row level security;
alter table public.user_badges enable row level security;

create policy "own rows" on public.records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.daily_missions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.user_badges for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
