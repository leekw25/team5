// "지유야, 다음 끼니 뭐 먹지?" — 오늘 남은 단백질에 맞춰 메뉴 3개를 추천하고, '먹었어요'를 누르면 바로 기록한다.
// Gemini 키가 있으면 맞춤 추천, 없거나 실패하면 기본 메뉴표(suggest-core)에서 고른다.
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import { generateJson, getApiKey } from '@/shared/gemini';
import { Pop, Reveal } from './motion';
import { pickSuggestions, suggestPrompt, SUGGEST_SCHEMA, type Suggestion } from './suggest-core.ts';
import { card, color, font, radius, text } from './theme';

async function suggest(dayKey: string): Promise<Suggestion[]> {
  const records = await recordsRepo.listByDay(dayKey);
  if (await getApiKey()) {
    try {
      const r = await generateJson<{ items: Omit<Suggestion, 'tags'>[] }>([{ text: suggestPrompt(records) }], SUGGEST_SCHEMA);
      const items = (r.items ?? []).slice(0, 3).map((m) => ({ ...m, tags: [] }));
      if (items.length) return items;
    } catch {
      // 기본 메뉴표로
    }
  }
  return pickSuggestions(records);
}

export function MealSuggest({ dayKey }: { dayKey: string }) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const ask = async () => {
    setBusy(true);
    setSaved(null);
    setItems(await suggest(dayKey).catch(() => []));
    setBusy(false);
  };

  const eat = async (m: Suggestion) => {
    setBusy(true);
    try {
      const { reason: _reason, ...food } = m;
      const [record] = await recordsRepo.insertMany([
        { occurred_at: new Date().toISOString(), kind: 'meal', source: 'text', raw_text: `지유 추천: ${m.name}`, foods: [food], exercises: [], water_ml: null, confidence: 0.8 },
      ]);
      emitRecordsChanged({ day_key: record.day_key, reason: 'created', record_ids: [record.id] }); // 저장 성공 뒤 1회
      setSaved(m.name);
      setItems(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal style={{ ...card, padding: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20 }}>🍱</Text>
        <Text style={{ ...text.section, flex: 1 }}>지유의 다음 끼니 추천</Text>
      </View>
      {saved && <Text style={{ ...text.caption, color: color.primary }}>「{saved}」를 기록했어요. 미션을 다시 확인할게요!</Text>}
      {items === null ? (
        <Pressable accessibilityRole="button" onPress={ask} disabled={busy} style={{ height: 46, borderRadius: radius.pill, backgroundColor: color.primarySoft, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={color.primary} /> : <MaterialIcons name="restaurant" size={18} color={color.primary} />}
          <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '700', color: color.primary }}>{busy ? '지유가 메뉴를 고르는 중…' : '지유야, 다음 끼니 뭐 먹지?'}</Text>
        </Pressable>
      ) : items.length === 0 ? (
        <Text style={text.caption}>추천을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.</Text>
      ) : (
        items.map((m, i) => (
          <Pop key={m.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: color.line, borderRadius: radius.card, padding: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...text.body, fontWeight: '800' }}>{m.name}</Text>
              <Text style={text.caption}>
                {Math.round(m.kcal)} kcal · 단백질 {Math.round(m.protein_g)}g
              </Text>
              <Text style={{ ...text.caption, color: color.primary }}>{m.reason}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${m.name} 먹었어요`} onPress={() => eat(m)} disabled={busy} style={{ paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: color.primary, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '800', color: '#fff' }}>먹었어요</Text>
            </Pressable>
          </Pop>
        ))
      )}
      {items && items.length > 0 && (
        <Pressable accessibilityRole="button" onPress={() => setItems(null)} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={text.caption}>닫기</Text>
        </Pressable>
      )}
    </Reveal>
  );
}
