// AI 분석 결과 확인 시트(Stitch 디자인 '음성 기록 결과'). 저장하기를 눌러야 저장된다.
import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { NewHealthRecord, ParseResult } from '@/shared/types/contract';
import { color, font, radius, text } from '@/ui/theme';
import { formatTime } from './timeline-core.ts';

interface Row {
  icon: keyof typeof MaterialIcons.glyphMap;
  name: string;
  qty: string;
  tags: string[];
  macro: string;
  kcal: string;
}

const TAG_LABEL: Record<string, string> = { fried: '튀김', zero_sugar_drink: '제로 음료', sugary_drink: '가당 음료', alcohol: '술', snack: '간식' };

function rows(records: NewHealthRecord[]): Row[] {
  return records.flatMap((r): Row[] => {
    if (r.kind === 'meal')
      return r.foods.map((f) => ({
        icon: f.tags.includes('zero_sugar_drink') || f.tags.includes('sugary_drink') ? 'local-drink' : 'restaurant',
        name: f.name,
        qty: f.quantity > 0 ? `${f.quantity}${f.unit}` : '',
        tags: f.tags.map((t) => TAG_LABEL[t]).filter(Boolean),
        macro: `탄 ${Math.round(f.carb_g)}g · 단 ${Math.round(f.protein_g)}g · 지 ${Math.round(f.fat_g)}g`,
        kcal: `${Math.round(f.kcal)} kcal`,
      }));
    if (r.kind === 'exercise')
      return r.exercises.map((e) => ({
        icon: 'fitness-center',
        name: e.name,
        qty: e.sets && e.reps ? `${e.sets}세트×${e.reps}회` : e.duration_min ? `${e.duration_min}분` : '',
        tags: [],
        macro: '운동',
        kcal: `${Math.round(e.kcal_burned)} kcal 소모`,
      }));
    return [{ icon: 'water-drop', name: '물', qty: `${r.water_ml ?? 0}ml`, tags: [], macro: '수분', kcal: '' }];
  });
}

const MEAL_BY_HOUR = (h: number) => (h < 10 ? '아침' : h < 15 ? '점심' : h < 17 ? '간식' : '저녁');

interface Props {
  result: ParseResult | null;
  seconds: string | null; // '1.8초'
  busy: boolean;
  onSave: () => void;
  onRetry: () => void;
}

export function ResultSheet({ result, seconds, busy, onSave, onRetry }: Props) {
  if (!result) return null;
  const list = rows(result.records);
  const first = result.records[0];
  const time = first ? formatTime(first.occurred_at) : '';
  const when = first?.kind === 'meal' ? `${MEAL_BY_HOUR(Number(time.slice(0, 2)))} ${time}` : time;
  const kcal = result.records.flatMap((r) => r.foods).reduce((s, f) => s + f.kcal, 0);
  const protein = result.records.flatMap((r) => r.foods).reduce((s, f) => s + f.protein_g, 0);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onRetry}>
      <View style={{ flex: 1, backgroundColor: 'rgba(27,31,42,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: color.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxHeight: '88%', width: '100%', maxWidth: 430, alignSelf: 'center' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.line, marginBottom: 14 }} />
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text>✨</Text>
              <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.primary }}>AI 분석 완료{seconds ? ` · ${seconds}` : ''}</Text>
            </View>
            {result.transcript && (
              <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.card, padding: 14, backgroundColor: color.page }}>
                <Text style={{ ...text.body, color: color.ink }}>“ {result.transcript} ”</Text>
              </View>
            )}
            <Text style={{ ...text.section, fontSize: 20 }}>
              {when ? `${when} · ` : ''}
              <Text style={{ color: color.primary }}>{list.length}개</Text> 항목을 찾았어요
            </Text>
            {list.map((r, i) => (
              <View key={i + r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: color.line, borderRadius: radius.card, padding: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#C9D8FF', backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name={r.icon} size={22} color={color.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ ...text.body, fontSize: 16, fontWeight: '700' }}>{r.name}</Text>
                    {!!r.qty && <Text style={text.caption}>{r.qty}</Text>}
                    {r.tags.map((t) => (
                      <View key={t} style={{ borderWidth: 1, borderColor: color.yellowLine, backgroundColor: color.yellowSoft, borderRadius: radius.pill, paddingHorizontal: 8 }}>
                        <Text style={{ fontFamily: font.body, fontSize: 11, color: '#8A6A00' }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={text.caption}>{r.macro}</Text>
                </View>
                {!!r.kcal && <Text style={{ ...text.body, fontWeight: '700' }}>{r.kcal}</Text>}
              </View>
            ))}
            {kcal > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: color.primarySoft, borderRadius: radius.card, padding: 14 }}>
                <Text style={{ ...text.body, fontSize: 14 }}>● 합계</Text>
                <Text style={{ ...text.body, fontWeight: '800' }}>
                  {Math.round(kcal)} kcal · <Text style={{ color: color.primary }}>단백질 {Math.round(protein)}g</Text>
                </Text>
              </View>
            )}
            {result.warnings.map((w) => (
              <View key={w} style={{ borderWidth: 1.5, borderColor: color.yellowLine, backgroundColor: '#FFFCF0', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ ...text.caption, color: color.ink }}>{w}</Text>
              </View>
            ))}
            <Text style={{ ...text.caption, textAlign: 'center' }}>저장한 뒤 오늘의 기록에서 시간 변경·삭제를 할 수 있어요</Text>
          </ScrollView>
          <View style={{ gap: 10, marginTop: 14 }}>
            <Pressable accessibilityRole="button" onPress={onRetry} disabled={busy} style={{ height: 50, borderRadius: radius.pill, borderWidth: 2, borderColor: color.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MaterialIcons name="mic-none" size={20} color={color.primary} />
              <Text style={{ fontFamily: font.body, fontSize: 16, fontWeight: '700', color: color.primary }}>다시 말하기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onSave} disabled={busy} style={{ height: 52, borderRadius: radius.pill, backgroundColor: color.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: busy ? 0.6 : 1 }}>
              <Text style={{ fontFamily: font.body, fontSize: 17, fontWeight: '800', color: '#fff' }}>저장하기</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
