// 기록 입력 로직(홍현정님 InputPanel 에서 그대로 옮김): 음성·문장·사진 → Gemini 파싱 → 확인 시트 → 저장 → 이벤트, 빠른 기록.
// 입력 카드(InputPanel)와 하단 + 버튼 메뉴(RecordFab)가 같이 쓴다.
import { useEffect, useState } from 'react';
import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import type { ParseResult } from '@/shared/types/contract';
import type { AudioInput } from './parse-core.ts';
import { parseAudio, parseImage, parseText } from './parse-text';
import { pickPhoto } from './photo-device';
import type { QuickChip } from './quick-core.ts';
import { saveRecords } from './save-core.ts';
import { runStepsSync } from './steps-sync';
import { formatSeconds } from './voice-core.ts';
import { recordVoiceRun } from './voice-timing-log.ts';

const MSG_SAVE_FAILED = '저장 중 문제가 생겼어요. 다시 시도해 주세요.';
const MSG_PHOTO_DENIED = '사진 접근 권한이 없어요. 휴대폰 설정에서 허용해 주세요.';
const MSG_PHOTO_UNREADABLE = '사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.';

export function useRecordInput(onSaved?: () => void) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<{ result: ParseResult; seconds: string | null; fromText: boolean } | null>(null);
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
      onSaved?.();
    });

  const onSubmit = () => {
    if (!text.trim()) return;
    const t0 = Date.now();
    run(async () => review(await parseText(text), formatSeconds(Date.now() - t0), true));
  };

  const onQuick = (chip: QuickChip) =>
    run(async () => {
      await saveRecords(recordsRepo, emitRecordsChanged, [chip.build(new Date())]);
      setNotice(chip.label + ' 저장했어요.');
      onSaved?.();
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

  return {
    text,
    setText,
    busy,
    recording,
    setRecording,
    locked,
    notice,
    setNotice,
    warnings,
    pending,
    onConfirm,
    cancelPending: () => setPending(null),
    onSubmit,
    onQuick,
    onPhoto,
    onRecorded,
    onMicProblem,
  };
}
