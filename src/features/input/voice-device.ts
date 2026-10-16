// A-F02: 마이크 녹음(expo-audio)을 부르는 얇은 연결 파일. 판단 로직은 voice-core.ts 에 있다.
// 휴대폰과 웹(PWA) 모두에서 쓴다. 웹은 녹음 읽기만 브라우저 방식으로 다르다.
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { recordAiError } from './ai-error-log.ts';
import { Platform } from 'react-native';
import { MIN_AUDIO_BYTES } from './parse-core.ts';
import type { AudioInput } from './parse-core.ts';
import { audioFromBase64, extractAudio } from './voice-core.ts';

export type StartResult = 'ok' | 'denied' | 'failed'; // denied: 마이크 권한 거부
export type StopResult = { kind: 'ok'; audio: AudioInput } | { kind: 'unreadable' };

// 녹음 파일 주소 → base64 글자와 디스크에 저장된 실제 파일 크기.
// fetch 로 읽으면 휴대폰에서 14바이트만 읽히는 문제가 있어서 공식 파일 읽기(expo-file-system)를 쓴다.
async function readFile(uri: string): Promise<{ base64: string; bytes: number }> {
  const file = new File(uri);
  const bytes = file.exists ? file.size : 0;
  return { base64: bytes > 0 ? await file.base64() : '', bytes };
}

// 웹(PWA): 녹음은 blob: 주소라 expo-file-system 으로 못 읽는다. 브라우저 방식으로 data URL 을 만들어
// extractAudio 로 형식(audio/webm 등)과 base64 를 뽑는다.
async function readWebAudio(uri: string): Promise<{ audio: AudioInput | null; bytes: number }> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { audio: extractAudio(dataUrl, null), bytes: blob.size };
}

// 파일을 읽는 단계에서 실패하면 원인을 '최근 AI 오류'(개발 도구)에 남긴다. 녹음 길이와 파일 크기가 함께 남는다.
function logReadProblem(reason: string, note: string): void {
  recordAiError('voice', new Error(reason), new Date(), note);
}

// 녹음기. start 로 녹음을 시작하고, stop 으로 끝내면 Gemini 에 보낼 오디오(형식 + base64)를 돌려준다.
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function start(): Promise<StartResult> {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return 'denied';
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return 'ok';
    } catch {
      return 'failed';
    }
  }

  async function stop(): Promise<StopResult> {
    let note = '녹음 ' + recorder.currentTime.toFixed(1) + '초'; // 끝내기 직전의 녹음 길이
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        logReadProblem('녹음 파일 주소가 없습니다', note);
        return { kind: 'unreadable' };
      }
      let audio: AudioInput | null;
      if (Platform.OS === 'web') {
        const web = await readWebAudio(uri);
        note += ', 웹 녹음 ' + web.bytes + '바이트';
        audio = web.bytes >= MIN_AUDIO_BYTES ? web.audio : null;
      } else {
        const { base64, bytes } = await readFile(uri);
        note += ', 디스크 파일 ' + bytes + '바이트';
        audio = audioFromBase64(base64, uri);
      }
      if (!audio) {
        logReadProblem('녹음 파일이 비어 있거나 읽지 못했습니다', note);
        return { kind: 'unreadable' };
      }
      return { kind: 'ok', audio: { ...audio, note } };
    } catch (error) {
      logReadProblem('녹음을 끝내거나 읽다가 오류: ' + String(error), note);
      return { kind: 'unreadable' };
    }
  }

  return { start, stop };
}
