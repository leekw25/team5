-- 시연 계정 초기화 + 시드. 리허설·발표 직전마다 SQL Editor에서 Run.
-- 결과: 어제까지 10일 연속 완수, 오늘은 물·스쿼트 성공 + 단백질 진행 중(2/3), 아침 기록 1개.
-- 시연 문장으로 단백질이 달성되면 3/3 → 폭죽, 스탬프, 스트릭 11일.
--
-- 단백질 목표(target_g)는 시연 문장을 여러 번 파싱해 본 "아침+점심 단백질 합"의 최솟값보다 낮게 맞춘다.

do $$
declare
  v_email text := 'demo@fitlog.app';  -- 시연 계정 이메일
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

  -- 어제부터 10일 전까지 매일 3개 완수
  insert into public.daily_missions (user_id, day_key, slot, mission_code, params, status, achieved_at)
  select v_user, v_today - d, m.slot, m.code, m.params::jsonb, 'success', (v_today - d + time '20:00') at time zone 'Asia/Seoul'
  from generate_series(1, 10) as d
  cross join (values
    ('diet', 'protein_min', format('{"target_g": %s}', v_protein_target)),
    ('life', 'water_min', '{"target_ml": 1500}'),
    ('exercise', 'squat_min', '{"target": 30}')
  ) as m(slot, code, params);

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
end $$;
