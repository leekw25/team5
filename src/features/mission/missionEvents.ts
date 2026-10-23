// 미션 기능 안의 알림. src/shared/events.ts(기록 변경)와 별개로, 판정 결과를 달력과 폭죽 연출에 알린다.
type DayListener = (dayKey: string) => void;
type CelebrateListener = (dayKey: string, missionIds: string[]) => void;

const missionsListeners = new Set<DayListener>();
const celebrateListeners = new Set<CelebrateListener>();

// 미션 상태가 저장소에서 바뀌었다(달력·스트릭을 다시 읽으라는 신호)
export function emitMissionsUpdated(dayKey: string): void {
  missionsListeners.forEach((listener) => listener(dayKey));
}

export function onMissionsUpdated(listener: DayListener): () => void {
  missionsListeners.add(listener);
  return () => {
    missionsListeners.delete(listener);
  };
}

// B-F07 같은 미션으로 폭죽이 두 번 나오지 않게, 연출한(또는 이미 성공 상태로 본) 미션 id를 앱이 켜져 있는 동안 기억한다.
// 앱을 다시 켜도 성공으로 저장된 미션은 처음 판정할 때 markCelebrated로 기억하므로, 기록을 지웠다 다시 넣어도 반복하지 않는다.
const celebrated = new Set<string>();

export function markCelebrated(missionIds: string[]): void {
  missionIds.forEach((id) => celebrated.add(id));
}

// 처음 성공한 미션만 골라 화면에 떠 있는 모든 MissionCards에 알리고, 고른 id를 돌려준다.
export function celebrate(dayKey: string, missionIds: string[]): string[] {
  const fresh = missionIds.filter((id) => !celebrated.has(id));
  fresh.forEach((id) => celebrated.add(id));
  if (fresh.length > 0) celebrateListeners.forEach((listener) => listener(dayKey, fresh));
  return fresh;
}

export function onCelebrate(listener: CelebrateListener): () => void {
  celebrateListeners.add(listener);
  return () => {
    celebrateListeners.delete(listener);
  };
}
