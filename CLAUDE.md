# 핏로그 작업 규칙

Expo 관련 명령과 주의사항은 @AGENTS.md 를 따른다. 설계는 docs/ 의 구현 설계서를 따른다.

## 담당 폴더
- 자신의 담당 폴더만 수정한다.
  - A(쉬운 입력): src/features/input
  - B(미션·리워드): src/features/mission, src/features/reward
- src/shared, src/app, supabase 폴더는 멘토 담당이라 수정하지 않는다. 바꿔야 하면 작업을 멈추고 변경안만 제안한다.
- 담당 폴더의 index.ts에서 contract.ts에 적힌 컴포넌트를 export한다.
  - A: InputPanel, Timeline / B: MissionCards, RewardCalendar

## 데이터와 AI
- 데이터 타입은 src/shared/types/contract.ts에서 import하고 다시 정의하지 않는다.
- 날짜는 src/shared/date.ts로만 계산한다. records.day_key는 DB가 자동으로 채우므로 넣지 않는다.
- 기록 조회는 src/shared/records.ts의 fetchRecords를 쓴다.
- 기록 저장·수정·삭제가 성공한 뒤에만 src/shared/events.ts의 emitRecordsChanged를 1회 호출한다(A).
- AI는 Gemini만 쓰고, 호출은 src/shared/gemini.ts의 generateJson으로만 한다.
- API 키를 코드·.env·커밋에 절대 넣지 않는다. 키는 사용자가 설정 화면에서 입력한 값만 쓴다.
- Supabase service_role 키를 앱에 넣지 않는다.

## 작업 방식
- 패키지는 `npx expo install <이름>`으로 추가하고, PR 설명에 이유를 적는다.
- Expo Go에서 안 되는(개발 빌드가 필요한) 패키지는 추가하지 않는다.
- 한 번에 화면 하나 또는 기능 하나만 만든다.
- 판정·스트릭 같은 계산 로직은 React와 분리된 순수 함수로 만들고 `*.test.ts`(node:test)를 함께 쓴다. 상대 경로 import에는 `.ts` 확장자를 붙인다(테스트 실행에 필요).
- git 충돌이 나면 직접 해결하지 말고 멈춘 뒤 알린다.
- 무엇을 왜 바꿨는지 초심자도 이해할 수 있게 한국어로 설명한다.
- 작업을 마치면 `npm run lint`, `npm run typecheck`, `npm test`를 실행한다.
