// 앱 안의 '기록이 바뀌었다' 알림 방송. A는 emit, B는 on.
import type { RecordsChangedEvent } from './types/contract';

type Listener = (event: RecordsChangedEvent) => void;
const listeners = new Set<Listener>();

export function emitRecordsChanged(event: Omit<RecordsChangedEvent, 'type'>): void {
  const full: RecordsChangedEvent = { type: 'records:changed', ...event };
  listeners.forEach((listener) => listener(full));
}

// 반환값을 호출하면 구독 해제. useEffect의 cleanup으로 그대로 돌려주면 된다.
export function onRecordsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
