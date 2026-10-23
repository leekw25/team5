import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIPS } from './voice-clips.ts';

test('미션 완료 음성: 슬롯 3개 + 전체 완수 + 칭호 30개', () => {
  assert.equal(Object.keys(CLIPS).length, 34);
  assert.ok(CLIPS['mission-diet'] && CLIPS['mission-life'] && CLIPS['mission-exercise'] && CLIPS['all-done']);
});

test('칭호 문장의 을/를 조사', () => {
  assert.equal(CLIPS['title-10'], '축하해요! 연속 10일, 새 칭호 점화자를 얻었어요!');
  assert.equal(CLIPS['title-20'], '축하해요! 연속 20일, 새 칭호 루틴 비기너를 얻었어요!');
  assert.equal(CLIPS['title-30'], '축하해요! 연속 30일, 새 칭호 습관의 개척자를 얻었어요!');
  assert.equal(CLIPS['title-40'], '축하해요! 연속 40일, 새 칭호 강철의 집중을 얻었어요!');
});
