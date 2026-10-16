// 입력 카드(Stitch 디자인 'Tell FitLog AI'). 음성·문장·사진 → Gemini 파싱 → 결과 확인 시트 → 저장 → 이벤트.
// 빠른 기록 칩은 AI 없이 바로 저장한다. 앱을 열 때 오늘 걸음 수도 한 번 반영한다(iOS 만).
// 로직은 홍현정님 코드 그대로이고, 통합 때 화면을 디자인에 맞추고 '확인 후 저장' 단계를 더했다.
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import type { InputPanelProps, ParseResult } from '@/shared/types/contract';
import { card, color, font, radius, text } from '@/ui/theme';
import type { AudioInput } from './parse-core.ts';
import { parseAudio, parseImage, parseText } from './parse-text';
import { pickPhoto } from './photo-device';
import { QUICK_CHIPS } from './quick-core.ts';
import type { QuickChip } from './quick-core.ts';
import { ResultSheet } from './ResultSheet';
import { saveRecords } from './save-core.ts';
import { runStepsSync } from './steps-sync';
import { formatSeconds } from './voice-core.ts';
import { recordVoiceRun } from './voice-timing-log.ts';
import { VoiceButton } from './VoiceButton';

const MSG_SAVE_FAILED = '저장 중 문제가 생겼어요. 다시 시도해 주세요.';
const MSG_PHOTO_DENIED = '사진 접근 권한이 없어요. 휴대폰 설정에서 허용해 주세요.';
const MSG_PHOTO_UNREADABLE = '사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.';

const QUICK_SHORT: Record<string, string> = { squat: '스쿼트 15×2', pushup: '푸시업 10×2', walking: '걷기 30분' };

export function InputPanel(_props: InputPanelProps) {
  const [text_, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<{ result: ParseResult; seconds: string | null; fromText: boolean } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const locked = busy || recording;

  useEffect(() => {
    runStepsSync();
  }, []);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    setWarnings([]);
    try {
      await task();
    } catch {
      setWarnings([MSG_SAVE_FAILED]);
    } finally {
      setBusy(false);
    }
  }

  // 분석 결과: 기록이 있으면 확인 시트를 띄우고, 없으면 안내만 보여 준다.
  function review(result: ParseResult, seconds: string | null, fromText = false) {
    if (result.records.length > 0) setPending({ result, seconds, fromText });
    else setWarnings(result.warnings);
  }

  const onConfirm = () =>
    pending &&
    run(async () => {
      await saveRecords(recordsRepo, emitRecordsChanged, pending.result.records);
      setNotice(pending.result.records.length + '건을 저장했어요.');
      if (pending.fromText) setText('');
      setPending(null);
    });

  const onSubmit = () => {
    if (!text_.trim()) return;
    const t0 = Date.now();
    run(async () => review(await parseText(text_), formatSeconds(Date.now() - t0), true));
  };

  const onQuick = (chip: QuickChip) =>
    run(async () => {
      await saveRecords(recordsRepo, emitRecordsChanged, [chip.build(new Date())]);
      setNotice(chip.label + ' 저장했어요.');
    });

  const onPhoto = () =>
    run(async () => {
      const picked = await pickPhoto('library');
      if (picked.kind === 'denied') return setWarnings([MSG_PHOTO_DENIED]);
      if (picked.kind === 'unreadable') return setWarnings([MSG_PHOTO_UNREADABLE]);
      if (picked.kind === 'canceled') return;
      const t0 = Date.now();
      review(await parseImage(picked.image), formatSeconds(Date.now() - t0));
    });

  // 녹음이 끝나면 AI 1번으로 받아 적기 + 기록 정리. 끝내기를 누른 순간부터 결과가 나올 때까지 잰다(개발 도구 측정표용).
  const onRecorded = (audio: AudioInput, stoppedAt: number) =>
    run(async () => {
      const result = await parseAudio(audio);
      const ms = Date.now() - stoppedAt;
      recordVoiceRun({ at: new Date().toISOString(), ms, ok: result.records.length > 0, transcript: result.transcript ?? '' });
      review(result, formatSeconds(ms));
    });

  const onMicProblem = (message: string) => {
    setNotice(null);
    setWarnings([message]);
  };

  const circle = { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: color.line, backgroundColor: '#F1F3FA', alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.4 : 1 } as const;

  return (
    <View style={{ ...card, padding: 18, gap: 14, backgroundColor: '#FBFCFF' }}>
      <View style={{ gap: 2 }}>
        <Text style={{ ...text.script, fontSize: 18 }}>Tell FitLog AI •</Text>
        <Text style={{ ...text.section, fontSize: 19 }}>간편하게 말하거나 터치해서 기록해요</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {QUICK_CHIPS.map((chip) => (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityLabel={chip.label + ' 바로 기록'}
            disabled={locked}
            onPress={() => onQuick(chip)}
            style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, backgroundColor: '#F1F3FA', opacity: locked ? 0.4 : 1 }}
          >
            <Text style={{ fontFamily: font.body, fontSize: 12.5, color: color.ink }}>+ {QUICK_SHORT[chip.id] ?? chip.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="사진으로 기록" disabled={locked} onPress={onPhoto} style={circle}>
          <MaterialIcons name="photo-camera" size={22} color={color.muted} />
        </Pressable>
        <VoiceButton disabled={busy} onRecordingChange={setRecording} onRecorded={onRecorded} onProblem={onMicProblem} />
        <Pressable accessibilityRole="button" accessibilityLabel="글로 입력" disabled={locked} onPress={() => inputRef.current?.focus()} style={circle}>
          <MaterialIcons name="edit-note" size={24} color={color.muted} />
        </Pressable>
      </View>

      <Text style={{ ...text.caption, textAlign: 'center' }}>
        {recording ? '듣고 있어요… 다 말했으면 버튼을 한 번 더 누르세요' : busy ? 'AI가 분석하고 있어요…' : (
          <>
            버튼을 누르고 <Text style={{ color: color.primary, fontWeight: '700' }}>“점심으로 닭가슴살 샐러드 먹었어”</Text>라고 말해 보세요
          </>
        )}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, backgroundColor: '#EEF2FB', paddingLeft: 18, paddingRight: 6, minHeight: 50 }}>
        <TextInput
          ref={inputRef}
          value={text_}
          onChangeText={setText}
          onSubmitEditing={onSubmit}
          placeholder="말하거나 적어서 기록해요"
          placeholderTextColor={color.muted}
          editable={!locked}
          returnKeyType="send"
          style={{ flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, paddingVertical: 12 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="기록하기"
          onPress={onSubmit}
          disabled={locked || !text_.trim()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', opacity: locked || !text_.trim() ? 0.5 : 1 }}
        >
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="arrow-upward" size={20} color="#fff" />}
        </Pressable>
      </View>

      {notice && <Text style={{ ...text.caption, color: color.primary, textAlign: 'center', fontWeight: '700' }}>{notice}</Text>}
      {warnings.map((w) => (
        <View key={w} style={{ borderWidth: 1.5, borderColor: color.yellowLine, backgroundColor: '#FFFCF0', borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ ...text.caption, color: color.ink }}>{w}</Text>
        </View>
      ))}

      <ResultSheet result={pending?.result ?? null} seconds={pending?.seconds ?? null} busy={busy} onSave={onConfirm} onRetry={() => setPending(null)} />
    </View>
  );
}
