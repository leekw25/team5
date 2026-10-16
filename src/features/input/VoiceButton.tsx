// A-F02 마이크 버튼(Stitch 디자인: 큰 파란 원 + 퍼지는 링). 누르면 녹음, 다시 누르면 끝내서 녹음을 위로 넘긴다.
// 웹(PWA)에서도 동작한다. 브라우저 마이크는 HTTPS 또는 localhost 에서만 열린다.
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { color } from '@/ui/theme';
import { Ripple } from '@/ui/motion';
import type { AudioInput } from './parse-core.ts';
import { useVoiceRecorder } from './voice-device';

const MSG_MIC_DENIED = '마이크 권한이 없어요. 휴대폰(브라우저) 설정에서 허용해 주세요.';
const MSG_MIC_FAILED = '녹음을 시작하지 못했어요. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.';
const MSG_VOICE_UNREADABLE = '녹음 파일을 읽지 못했어요. 다시 말해 주세요.';

interface VoiceButtonProps {
  disabled: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecorded: (audio: AudioInput, stoppedAt: number) => void;
  onProblem: (message: string) => void;
}

const SIZE = 76;

export function VoiceButton({ disabled, onRecordingChange, onRecorded, onProblem }: VoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const { start, stop } = useVoiceRecorder();

  async function onPress() {
    if (disabled || working) return;
    setWorking(true);
    try {
      if (!recording) {
        const started = await start();
        if (started === 'ok') {
          setRecording(true);
          onRecordingChange(true);
        } else {
          onProblem(started === 'denied' ? MSG_MIC_DENIED : MSG_MIC_FAILED);
        }
        return;
      }
      const pressedAt = Date.now();
      const stopped = await stop();
      setRecording(false);
      onRecordingChange(false);
      if (stopped.kind === 'ok') onRecorded(stopped.audio, pressedAt);
      else onProblem(MSG_VOICE_UNREADABLE);
    } finally {
      setWorking(false);
    }
  }

  const inactive = disabled || working;
  return (
    <View style={{ width: SIZE * 1.5, height: SIZE * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {!inactive && <Ripple size={SIZE} fast={recording} />}
      <View style={{ position: 'absolute', width: SIZE + 18, height: SIZE + 18, borderRadius: (SIZE + 18) / 2, backgroundColor: '#DCE6FF' }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? '녹음 끝내기' : '말해서 기록하기'}
        disabled={inactive}
        onPress={onPress}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: recording ? color.primaryDeep : color.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          shadowColor: color.primary,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {working || disabled ? <ActivityIndicator color="#fff" /> : <MaterialIcons name={recording ? 'stop' : 'mic'} size={34} color="#fff" />}
      </Pressable>
    </View>
  );
}
