// 오늘의 기록(Stitch 디자인: 왼쪽 점선 레일 + 시간순 카드). '기록이 바뀌었다' 이벤트를 받으면 다시 읽는다.
// 카드를 길게 누르거나 '편집'을 누르면 카드 아래에 편집 상자(CardEditor)가 열린다(A-F13). 로직은 홍현정님 코드 그대로.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { recordsRepo } from '@/data';
import { onRecordsChanged } from '@/shared/events';
import type { HealthRecord, TimelineProps } from '@/shared/types/contract';
import { Reveal } from '@/ui/motion';
import { card, color, font, radius, text } from '@/ui/theme';
import { CardEditor } from './CardEditor';
import { toCardView } from './timeline-core.ts';
import type { CardView } from './timeline-core.ts';

interface Row {
  card: CardView;
  record: HealthRecord;
}

const ampm = (time: string) => (Number(time.slice(0, 2)) < 12 ? '오전' : '오후');

function Chip({ label, tone }: { label: string; tone: 'blue' | 'gray' | 'yellow' }) {
  const s = {
    blue: { bg: color.primarySoft, fg: color.primary, line: color.primarySoft },
    gray: { bg: '#F1F3F8', fg: color.muted, line: '#F1F3F8' },
    yellow: { bg: color.yellowSoft, fg: '#8A6A00', line: color.yellowLine },
  }[tone];
  return (
    <View style={{ backgroundColor: s.bg, borderColor: s.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 }}>
      <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '600', color: s.fg }}>{label}</Text>
    </View>
  );
}

export function Timeline({ dayKey }: TimelineProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    recordsRepo
      .listByDay(dayKey)
      .then((records) => {
        if (ignore) return;
        setRows(records.map((record) => ({ card: toCardView(record), record })));
        setFailed(false);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [dayKey, reloadCount]);

  useEffect(
    () =>
      onRecordsChanged((event) => {
        if (event.day_key === dayKey) setReloadCount((n) => n + 1);
      }),
    [dayKey],
  );

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={text.section}>
          오늘의 기록 <Text style={{ color: color.primary }}>•</Text>
        </Text>
        {rows && rows.length > 0 && <Text style={text.caption}>총 {rows.length}건 등록</Text>}
      </View>

      {failed ? (
        <View style={{ ...card, padding: 16, gap: 8 }}>
          <Text style={{ ...text.body, color: color.danger }}>기록을 불러오지 못했어요.</Text>
          <Pressable accessibilityRole="button" onPress={() => setReloadCount((n) => n + 1)}>
            <Text style={{ ...text.body, color: color.primary, fontWeight: '700' }}>다시 불러오기</Text>
          </Pressable>
        </View>
      ) : rows === null ? (
        <ActivityIndicator color={color.primary} />
      ) : rows.length === 0 ? (
        <View style={{ ...card, padding: 18, borderStyle: 'dashed' }}>
          <Text style={{ ...text.body, color: color.muted, textAlign: 'center' }}>아직 기록이 없어요. 위에서 말하거나 적어 보세요.</Text>
        </View>
      ) : (
        <View style={{ borderLeftWidth: 1.5, borderLeftColor: color.line, marginLeft: 6, paddingLeft: 18, gap: 12 }}>
          {rows.map(({ card: c, record }, i) => {
            const water = record.kind === 'water';
            return (
              <Reveal key={c.id} index={i}>
                <View style={{ position: 'absolute', left: -25, top: 18, width: 12, height: 12, borderRadius: 6, backgroundColor: water ? color.yellow : color.primary, borderWidth: 2, borderColor: color.surface }} />
                <Pressable onLongPress={() => setEditingId(c.id)} style={{ ...card, padding: 14, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '700', color: color.primary }}>
                      {c.time} ({ampm(c.time)})
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {c.needsCheck && <Chip label="확인 필요" tone="yellow" />}
                      {!!c.kcalLabel && <Chip label={c.kcalLabel} tone="blue" />}
                    </View>
                  </View>
                  {c.items.length > 1 ? (
                    c.items.map((item, k) => (
                      <View key={k + item.label}>
                        <Text style={{ ...text.body, fontWeight: '700' }}>{item.label}</Text>
                        <Text style={text.caption}>{item.detail}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...text.body, fontSize: 16, fontWeight: '700' }}>{water ? '💧 ' + c.title : c.title}</Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                      {!!c.proteinLabel && <Chip label={c.proteinLabel} tone="blue" />}
                      {record.source === 'quick' && <Chip label="빠른 기록" tone="gray" />}
                      {record.source === 'voice' && <Chip label="음성" tone="gray" />}
                      {record.source === 'photo' && <Chip label="사진" tone="gray" />}
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setEditingId(editingId === c.id ? null : c.id)} hitSlop={8}>
                      <Text style={{ ...text.caption, color: color.primary, fontWeight: '700' }}>{editingId === c.id ? '닫기' : '편집'}</Text>
                    </Pressable>
                  </View>
                  {editingId === c.id && <CardEditor key={record.id + record.occurred_at + c.items.length} record={record} onClose={() => setEditingId(null)} />}
                </Pressable>
              </Reveal>
            );
          })}
        </View>
      )}
    </View>
  );
}
