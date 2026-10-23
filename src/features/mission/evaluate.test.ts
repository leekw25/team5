import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoMissions, lunchRecord, morningRecord } from '../../shared/mocks/demo.ts';
import type { DailyMission, HealthRecord } from '../../shared/types/contract.ts';
import { evaluateMissions } from './evaluate.ts';

const NOW = new Date('2026-10-06T03:30:05.000Z');
const pending = (mission: DailyMission): DailyMission => ({ ...mission, status: 'in_progress', achieved_at: null });
const [protein, water, squat] = demoMissions.map(pending);
const steps: DailyMission = { ...squat, id: 'mock-steps', mission_code: 'steps_min', params: { target: 7000 } };

let seq = 0;
function record(fields: Partial<HealthRecord>): HealthRecord {
  seq += 1;
  return { ...morningRecord, id: `r${seq}`, foods: [], exercises: [], water_ml: null, ...fields };
}
const waterRecord = (ml: number) => record({ kind: 'water', water_ml: ml });
const squatRecord = (sets: number | undefined, reps: number) =>
  record({ kind: 'exercise', exercises: [{ name: '스쿼트', code: 'squat', body_parts: [], sets, reps, kcal_burned: 0 }] });
const walkRecord = (count: number) =>
  record({ kind: 'exercise', exercises: [{ name: '걷기', code: 'walking', body_parts: [], steps: count, kcal_burned: 0 }] });
const evaluateOne = (mission: DailyMission, records: HealthRecord[]) => evaluateMissions([mission], records, NOW)[0];

test('아침만 먹으면 단백질 미션은 진행 중', () => {
  const result = evaluateOne(protein, [morningRecord]);
  assert.equal(result.status, 'in_progress');
  assert.equal(result.current, 12.9);
  assert.equal(result.target, 30);
  assert.equal(result.achieved_at, null);
});

test('점심이 추가되면 성공하고 달성 시각은 판정 시각', () => {
  const result = evaluateOne(protein, [morningRecord, lunchRecord]);
  assert.equal(result.status, 'success');
  assert.equal(result.current, 40.9);
  assert.equal(result.achieved_at, NOW.toISOString());
});

test('점심 기록을 지우면 다시 진행 중', () => {
  const succeeded: DailyMission = { ...protein, status: 'success', achieved_at: NOW.toISOString() };
  const result = evaluateOne(succeeded, [morningRecord]);
  assert.equal(result.status, 'in_progress');
  assert.equal(result.achieved_at, null);
});

test('이미 성공한 미션은 처음 달성 시각을 유지', () => {
  const first = '2026-10-06T03:00:00.000Z';
  const result = evaluateOne({ ...protein, status: 'success', achieved_at: first }, [morningRecord, lunchRecord]);
  assert.equal(result.achieved_at, first);
});

test('물: 1,499ml는 진행 중, 1,500ml는 성공', () => {
  assert.equal(evaluateOne(water, [waterRecord(500), waterRecord(999)]).status, 'in_progress');
  const result = evaluateOne(water, [waterRecord(500), waterRecord(1000)]);
  assert.equal(result.status, 'success');
  assert.equal(result.current, 1500);
});

test('스쿼트: 세트 × 세트당 횟수, 세트가 없으면 1세트', () => {
  assert.equal(evaluateOne(squat, [squatRecord(2, 14)]).current, 28);
  assert.equal(evaluateOne(squat, [squatRecord(2, 14)]).status, 'in_progress');
  assert.equal(evaluateOne(squat, [squatRecord(2, 15)]).status, 'success');
  assert.equal(evaluateOne(squat, [squatRecord(undefined, 30)]).status, 'success');
});

test('걸음 수: 6,999보는 진행 중, 7,000보는 성공', () => {
  assert.equal(evaluateOne(steps, [walkRecord(6999)]).status, 'in_progress');
  assert.equal(evaluateOne(steps, [walkRecord(3000), walkRecord(4000)]).status, 'success');
});

test('카탈로그 밖 코드는 판정하지 않는다', () => {
  assert.deepEqual(evaluateMissions([{ ...protein, mission_code: 'fasting_12h' }], [morningRecord], NOW), []);
});

test('다른 날 기록은 세지 않는다', () => {
  const yesterdayWater = record({ kind: 'water', water_ml: 2000, day_key: '2026-10-05' });
  assert.equal(evaluateOne(water, [yesterdayWater]).status, 'in_progress');
});
