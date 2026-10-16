// A-F13 기록 편집 상자: 타임라인 카드를 길게 누르거나 '편집' 을 누르면 카드 아래에 열린다.
// 시간 변경, 항목(음식·운동) 하나 삭제, 기록 삭제를 한다. 성공하면 이벤트가 나가고 타임라인이 알아서 다시 그려진다.
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { color, font, radius, text } from '@/ui/theme';

import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import type { HealthRecord } from '@/shared/types/contract';
import { buildOccurredAt, deleteRecord, itemCount, removeItem, updateRecord } from './edit-core.ts';
import { formatTime, toCardView } from './timeline-core.ts';

// 디자인 알약 버튼. kind: primary(파랑 채움) · outline(파랑 테두리) · danger(빨강 글자)
function Btn({ title, onPress, disabled, kind = 'outline' }: { title: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'outline' | 'danger' }) {
  const bg = kind === 'primary' ? color.primary : color.surface;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? color.danger : color.primary;
  const line = kind === 'danger' ? '#F8C4C4' : color.primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ paddingHorizontal: 14, height: 38, borderRadius: radius.pill, borderWidth: 1.5, borderColor: line, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: fg }}>{title}</Text>
    </Pressable>
  );
}

const MSG_EDIT_FAILED = '고치는 중 문제가 생겼어요. 다시 시도해 주세요.';
const MSG_BAD_TIME = '시간을 08:30 처럼 시와 분으로 입력해 주세요.';

interface CardEditorProps {
  record: HealthRecord;
  onClose: () => void;
}

export function CardEditor({ record, onClose }: CardEditorProps) {
  const [timeText, setTimeText] = useState(formatTime(record.occurred_at));
  const [confirmDelete, setConfirmDelete] = useState(false); // 삭제는 한 번 더 눌러야 지운다
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const labels = toCardView(record).items.map((item) => item.label);
  const canRemoveItem = itemCount(record) > 1;

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch {
      setMessage(MSG_EDIT_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const onSaveTime = () =>
    run(async () => {
      const occurredAt = buildOccurredAt(record.day_key, timeText);
      if (!occurredAt) {
        setMessage(MSG_BAD_TIME);
        return;
      }
      await updateRecord(recordsRepo, emitRecordsChanged, record, { occurred_at: occurredAt });
      onClose();
    });

  const onRemoveItem = (index: number) => run(async () => void (await removeItem(recordsRepo, emitRecordsChanged, record, index)));

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    return run(() => deleteRecord(recordsRepo, emitRecordsChanged, record));
  };

  return (
    <View style={{ marginTop: 6, padding: 12, borderRadius: 12, backgroundColor: color.page, gap: 10 }}>
      <Text style={{ ...text.body, fontWeight: '700' }}>이 기록 고치기</Text>

      <View style={{ gap: 4 }}>
        <Text style={text.caption}>시간 (같은 날, 예: 08:30)</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={timeText}
            onChangeText={setTimeText}
            keyboardType="numbers-and-punctuation"
            editable={!busy}
            style={{ flex: 1, borderWidth: 1, borderColor: color.line, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: color.surface, fontFamily: font.body, color: color.ink }}
          />
          <Btn title="시간 변경" kind="primary" onPress={onSaveTime} disabled={busy} />
        </View>
      </View>

      {canRemoveItem && (
        <View style={{ gap: 4 }}>
          <Text style={text.caption}>항목 하나만 지우기</Text>
          {labels.map((label, index) => (
            <View key={index + label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ ...text.body, flex: 1 }}>{label}</Text>
              <Btn title="삭제" kind="danger" onPress={() => onRemoveItem(index)} disabled={busy} />
            </View>
          ))}
        </View>
      )}

      <Btn title={confirmDelete ? '정말 이 기록을 지울까요? 한 번 더 누르세요' : '기록 전체 삭제'} kind="danger" onPress={onDelete} disabled={busy} />
      {message && <Text style={{ ...text.caption, color: color.danger }}>{message}</Text>}
      <Btn title="닫기" onPress={onClose} disabled={busy} />
    </View>
  );
}
