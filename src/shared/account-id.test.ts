import assert from 'node:assert/strict';
import test from 'node:test';
import { loginEmail } from './account-id.ts';

test('이름은 같은 규칙의 이메일로, 앞뒤 공백은 무시', () => {
  assert.equal(loginEmail('홍길동'), 'p-ed998deab8b8eb8f99@fitlog.ap');
  assert.equal(loginEmail(' 홍길동 '), loginEmail('홍길동'));
  assert.notEqual(loginEmail('홍길동'), loginEmail('홍길순'));
});

test('이메일을 넣으면 그대로(기존 계정 로그인)', () => {
  assert.equal(loginEmail('demo@fitlog.ap'), 'demo@fitlog.ap');
});
