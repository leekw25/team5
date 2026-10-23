// 개발 도구 공개 조건: 개발 모드이거나, 설정의 버전 글자를 7번 눌러 이 기기에서 연 경우만.
// 배포 버전의 일반 사용자에게 '전체 초기화'·원본 JSON 이 보이지 않게 한다.
const KEY = 'fitlog:devtools';
const store = typeof localStorage !== 'undefined' ? localStorage : null; // 휴대폰 앱(네이티브)은 개발 모드에서만

export const isDevToolsOpen = () => __DEV__ || store?.getItem(KEY) === '1';
export const openDevTools = () => store?.setItem(KEY, '1');
