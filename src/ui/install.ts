// PWA 설치(홈 화면에 추가). 크롬·엣지는 'beforeinstallprompt' 이벤트를 앱이 붙잡아 두었다가 버튼으로 설치 창을 띄울 수 있다.
// 이벤트는 페이지가 열리자마자 한 번 오므로 이 파일을 앱 시작 때(_layout) 불러 미리 받아 둔다.
// 아이폰 사파리는 이 기능이 없어 '공유 → 홈 화면에 추가' 안내만 한다.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
let deferred: InstallPromptEvent | null = null;
let installed = isWeb && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 크롬 기본 안내 대신 설정의 버튼으로 띄운다
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export type InstallState = 'native' | 'installed' | 'ready' | 'ios' | 'manual';

function getState(): InstallState {
  if (!isWeb) return 'native';
  if (installed) return 'installed';
  if (deferred) return 'ready';
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'manual';
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getState,
    getState,
  );
}

// 설치 창을 띄운다. 설치하면 true.
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null; // 이벤트는 한 번만 쓸 수 있다
  notify();
  return outcome === 'accepted';
}
