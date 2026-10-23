-- 시연 계정 초기화를 DB 함수로(관리자만 실행). 시연 당일 아침 자동 실행을 예약한다.
-- 함수 본문은 supabase/demo/reset-demo.sql 과 같다(그 파일은 이제 이 함수를 부른다).
create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text := 'demo@fitlog.ap';  -- 시연 계정 이메일
  v_protein_target int := 30;          -- 단백질 목표(g)
  v_user uuid;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception '% 계정이 없습니다. Authentication → Users → Add user로 먼저 만드세요.', v_email;
  end if;

  delete from public.records where user_id = v_user;
  delete from public.daily_missions where user_id = v_user;
  delete from public.user_badges where user_id = v_user;
  delete from public.user_missions where user_id = v_user;

  -- 어제부터 19일 전까지 매일 3개 완수(오늘 완수하면 20일 = 두 번째 칭호)
  insert into public.daily_missions (user_id, day_key, slot, mission_code, params, status, achieved_at)
  select v_user, v_today - d, m.slot, m.code, m.params::jsonb, 'success', (v_today - d + time '20:00') at time zone 'Asia/Seoul'
  from generate_series(1, 19) as d
  cross join (values
    ('diet', 'protein_min', format('{"target_g": %s}', v_protein_target)),
    ('life', 'water_min', '{"target_ml": 1500}'),
    ('exercise', 'squat_min', '{"target": 30}')
  ) as m(slot, code, params);

  -- 연속 이전 이틀: 달력에 1/3·2/3 링이 보이도록
  insert into public.daily_missions (user_id, day_key, slot, mission_code, params, status, achieved_at)
  select v_user, v_today - x.d, m.slot, m.code, m.params::jsonb,
         case when m.n <= x.ok then 'success' else 'in_progress' end,
         case when m.n <= x.ok then (v_today - x.d + time '20:00') at time zone 'Asia/Seoul' end
  from (values (20, 2), (21, 1)) as x(d, ok)
  cross join (values
    (1, 'diet', 'protein_min', format('{"target_g": %s}', v_protein_target)),
    (2, 'life', 'water_min', '{"target_ml": 1500}'),
    (3, 'exercise', 'squat_min', '{"target": 30}')
  ) as m(n, slot, code, params);

  -- 지난 19일 기록: 미션 성공과 맞는 하루(세 끼 단백질 30g 이상 · 물 1.5L · 스쿼트 30개) + 걷기·수면·체중.
  -- 메뉴는 날짜마다 돌아가며 바꿔 리포트 그래프가 자연스럽게 보이게 한다.
  insert into public.records (user_id, occurred_at, kind, source, raw_text, foods, exercises, water_ml, details, confidence)
  select v_user, (v_today - d + r.t) at time zone 'Asia/Seoul', r.kind, r.source, r.raw_text, r.foods::jsonb, r.exercises::jsonb, r.water_ml, r.details::jsonb, 0.95
  from generate_series(1, 19) as d
  cross join lateral (values
    (time '07:10', 'sleep', 'voice', '어젯밤 11시 반에 자서 7시에 일어났어', '[]', '[]', null::int,
      format('{"sleep_min": %s, "bed_time": "%s", "wake_time": "07:00"}', 390 + (d % 4) * 15, (array['23:00','23:15','23:30','23:45'])[1 + d % 4])),
    (time '07:20', 'body', 'text', '아침 체중', '[]', '[]', null,
      format('{"weight_kg": %s, "condition": %s}', round((58.4 + d * 0.06)::numeric, 1), 3 + d % 3)),
    (time '07:40', 'exercise', 'quick', null, '[]',
      '[{"name":"스쿼트","code":"squat","body_parts":["하체"],"sets":2,"reps":15,"kcal_burned":20}]', null, '{}'),
    (time '08:10', 'meal', 'voice', (array['아침에 계란 2개랑 고구마','그릭요거트에 견과류','토스트랑 우유','바나나랑 삶은 계란'])[1 + d % 4],
      (array[
        '[{"name":"삶은 계란","quantity":2,"unit":"개","kcal":155,"carb_g":1,"protein_g":12.6,"fat_g":10.6,"tags":[]},{"name":"고구마","quantity":1,"unit":"개","kcal":130,"carb_g":31,"protein_g":1.6,"fat_g":0.2,"tags":[]}]',
        '[{"name":"그릭요거트","quantity":1,"unit":"컵","kcal":150,"carb_g":8,"protein_g":15,"fat_g":6,"tags":[]},{"name":"견과류","quantity":1,"unit":"줌","kcal":120,"carb_g":4,"protein_g":4,"fat_g":10,"tags":["snack"]}]',
        '[{"name":"통밀 토스트","quantity":1,"unit":"장","kcal":180,"carb_g":30,"protein_g":7,"fat_g":3,"tags":[]},{"name":"우유","quantity":1,"unit":"잔","kcal":125,"carb_g":10,"protein_g":6,"fat_g":7,"tags":[]}]',
        '[{"name":"바나나","quantity":1,"unit":"개","kcal":105,"carb_g":27,"protein_g":1.3,"fat_g":0.4,"tags":[]},{"name":"삶은 계란","quantity":1,"unit":"개","kcal":78,"carb_g":0.5,"protein_g":6.3,"fat_g":5.3,"tags":[]}]'
      ])[1 + d % 4], '[]', null, '{}'),
    (time '10:00', 'water', 'quick', null, '[]', '[]', 800, '{}'),
    (time '12:30', 'meal', 'voice', (array['점심 닭가슴살 샐러드','점심 비빔밥','점심 김치찌개 백반','점심 연어 포케','점심 순두부찌개'])[1 + d % 5],
      (array[
        '[{"name":"닭가슴살 샐러드","quantity":1,"unit":"그릇","kcal":320,"carb_g":14,"protein_g":32,"fat_g":14,"tags":[]}]',
        '[{"name":"비빔밥","quantity":1,"unit":"그릇","kcal":600,"carb_g":90,"protein_g":18,"fat_g":16,"tags":[]}]',
        '[{"name":"김치찌개","quantity":1,"unit":"인분","kcal":350,"carb_g":12,"protein_g":20,"fat_g":22,"tags":[]},{"name":"쌀밥","quantity":1,"unit":"공기","kcal":300,"carb_g":66,"protein_g":5,"fat_g":0.5,"tags":[]}]',
        '[{"name":"연어 포케","quantity":1,"unit":"그릇","kcal":520,"carb_g":58,"protein_g":28,"fat_g":18,"tags":[]}]',
        '[{"name":"순두부찌개","quantity":1,"unit":"인분","kcal":450,"carb_g":55,"protein_g":20,"fat_g":15,"tags":[]}]'
      ])[1 + d % 5], '[]', null, '{}'),
    (time '15:00', 'water', 'quick', null, '[]', '[]', 700, '{}'),
    (time '18:40', 'exercise', 'voice', '저녁 먹기 전에 30분 걸었어', '[]',
      format('[{"name":"걷기","code":"walking","body_parts":["전신"],"duration_min":30,"steps":%s,"kcal_burned":%s}]', 6000 + (d % 5) * 800, 110 + (d % 5) * 15), null, '{}'),
    (time '19:30', 'meal', 'voice', (array['저녁 고등어구이 정식','저녁 소고기 미역국','저녁 닭가슴살 포케','저녁 두부조림'])[1 + d % 4],
      (array[
        '[{"name":"고등어구이 정식","quantity":1,"unit":"인분","kcal":620,"carb_g":70,"protein_g":30,"fat_g":22,"tags":[]}]',
        '[{"name":"소고기 미역국","quantity":1,"unit":"그릇","kcal":220,"carb_g":6,"protein_g":18,"fat_g":12,"tags":[]},{"name":"잡곡밥","quantity":1,"unit":"공기","kcal":300,"carb_g":64,"protein_g":6,"fat_g":1.5,"tags":[]}]',
        '[{"name":"닭가슴살 포케","quantity":1,"unit":"그릇","kcal":480,"carb_g":55,"protein_g":35,"fat_g":10,"tags":[]}]',
        '[{"name":"두부조림","quantity":1,"unit":"접시","kcal":240,"carb_g":10,"protein_g":18,"fat_g":14,"tags":[]},{"name":"현미밥","quantity":1,"unit":"공기","kcal":300,"carb_g":64,"protein_g":6,"fat_g":2,"tags":[]}]'
      ])[1 + d % 4], '[]', null, '{}')
  ) as r(t, kind, source, raw_text, foods, exercises, water_ml, details);

  -- 오늘 미션
  insert into public.daily_missions (user_id, day_key, slot, mission_code, params, status, achieved_at) values
    (v_user, v_today, 'diet', 'protein_min', jsonb_build_object('target_g', v_protein_target), 'in_progress', null),
    (v_user, v_today, 'life', 'water_min', '{"target_ml": 1500}', 'success', (v_today + time '10:00') at time zone 'Asia/Seoul'),
    (v_user, v_today, 'exercise', 'squat_min', '{"target": 30}', 'success', (v_today + time '07:30') at time zone 'Asia/Seoul');

  -- 오늘 기록: 스쿼트, 아침, 물
  insert into public.records (user_id, occurred_at, kind, source, raw_text, foods, exercises, water_ml, confidence) values
    (v_user, (v_today + time '07:30') at time zone 'Asia/Seoul', 'exercise', 'quick', null, '[]',
      '[{"name":"스쿼트","code":"squat","body_parts":["하체"],"sets":2,"reps":15,"kcal_burned":20}]', null, 1),
    (v_user, (v_today + time '08:10') at time zone 'Asia/Seoul', 'meal', 'voice', '아침에 사과 반 개랑 계란 2개 먹었어',
      '[{"name":"사과","quantity":0.5,"unit":"개","kcal":48,"carb_g":13,"protein_g":0.3,"fat_g":0.2,"tags":[]},
        {"name":"삶은 계란","quantity":2,"unit":"개","kcal":155,"carb_g":1,"protein_g":12.6,"fat_g":10.6,"tags":[]}]',
      '[]', null, 0.95),
    (v_user, (v_today + time '10:00') at time zone 'Asia/Seoul', 'water', 'quick', null, '[]', '[]', 1500, 1);
end
$fn$;

revoke all on function public.reset_demo() from public, anon, authenticated;

-- 시연일 2026-10-29 06:00(한국) = 2026-10-28 21:00(UTC)에 한 번 실행하고 예약을 지운다
create extension if not exists pg_cron;
select cron.schedule(
  'fitlog-demo-reset-1029',
  '0 21 28 10 *',
  $job$select public.reset_demo(); select cron.unschedule('fitlog-demo-reset-1029');$job$
);
