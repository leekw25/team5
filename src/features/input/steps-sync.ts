// A-F12: 앱을 열 때 오늘 걸음 수를 읽어 하루 기록 1개로 반영한다. 걸음 수 조회는 iOS 에서만 되므로 그 밖의 환경에서는 건너뛴다.
import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import { startOfDayIso, toDayKey } from '@/shared/date';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { syncSteps } from './steps-core.ts';
import type { SyncOutcome } from './steps-core.ts';

// 오늘 0시(한국)부터 지금까지의 걸음 수. 읽을 수 없으면 null.
async function readTodaySteps(now: Date = new Date()): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  if (!(await Pedometer.isAvailableAsync())) return null;
  const permission = await Pedometer.requestPermissionsAsync();
  if (!permission.granted) return null;
  const { steps } = await Pedometer.getStepCountAsync(new Date(startOfDayIso(toDayKey(now))), now);
  return steps;
}

// 같은 때에 두 번 실행되어 기록이 2개 생기는 일을 막기 위해, 진행 중이면 그 결과를 같이 쓴다.
let inflight: Promise<SyncOutcome> | null = null;

export function runStepsSync(): Promise<SyncOutcome> {
  if (!inflight) {
    inflight = (async () => {
      try {
        return await syncSteps(recordsRepo, emitRecordsChanged, await readTodaySteps());
      } catch {
        return 'skipped' as const; // 걸음 수는 부가 기능이라 실패해도 앱은 계속 동작한다
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}
