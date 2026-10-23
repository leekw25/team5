-- 발표 화면(/live)용 오늘 집계. 개인 기록은 내보내지 않고 숫자 합계만 돌려준다(로그인 없이 볼 수 있어야 해서 security definer).
create or replace function public.live_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select (now() at time zone 'Asia/Seoul')::date as d)
  select json_build_object(
    'people', (select count(distinct r.user_id) from public.records r, t where r.day_key = t.d),
    'records', (select count(*) from public.records r, t where r.day_key = t.d),
    'kcal', (select coalesce(round(sum((f ->> 'kcal')::numeric)), 0) from public.records r cross join t cross join lateral jsonb_array_elements(r.foods) f where r.day_key = t.d),
    'missions_done', (select count(*) from public.daily_missions m, t where m.day_key = t.d and m.status = 'success'),
    'perfect_days', (select count(*) from public.v_day_status s, t where s.day_key = t.d and s.success_count >= 3),
    'guests', (select count(*) from auth.users u, t where u.is_anonymous and u.created_at >= (t.d::timestamp at time zone 'Asia/Seoul'))
  );
$$;

revoke all on function public.live_stats() from public;
grant execute on function public.live_stats() to anon, authenticated;
