// 내 미션 만들기(이미경님 제안). 만든 미션은 랜덤 배정·다시 뽑기 후보에 들어가고, 직접 체크로 완료한다.
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { userMissionsRepo } from '@/data';
import type { MissionSlot, UserMission } from '@/shared/types/contract';
import { card, color, font, radius, text } from '@/ui/theme';
import { SLOT_LABELS } from './catalog.ts';
import { SLOTS } from './pool.ts';

const TITLE_MAX = 60;

export function MyMissions() {
  const [list, setList] = useState<UserMission[] | null>(null);
  const [slot, setSlot] = useState<MissionSlot>('life');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    userMissionsRepo.list().then(setList, () => setMessage('내 미션을 불러오지 못했어요.'));
  }, []);
  useEffect(load, [load]);

  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage(done);
      load();
    } catch {
      setMessage('저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const add = () => title.trim() && run(() => userMissionsRepo.add(slot, title).then(() => setTitle('')), '추가했어요. 내일 배정이나 다시 뽑기에서 나올 수 있어요.');

  return (
    <View style={{ ...card, padding: 20, gap: 12 }}>
      <Text style={{ ...text.section, fontSize: 20 }}>내 미션</Text>
      <Text style={text.caption}>기본 미션 200개 말고 나만의 미션을 만들어요. 랜덤 배정·다시 뽑기 후보에 들어가고, 카드에서 「완료」를 눌러 체크해요.</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {SLOTS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ selected: slot === s }}
            onPress={() => setSlot(s)}
            style={{ paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: slot === s ? color.primary : color.line, backgroundColor: slot === s ? color.primarySoft : color.surface }}
          >
            <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: slot === s ? color.primary : color.muted }}>{SLOT_LABELS[s]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={TITLE_MAX}
          placeholder="예) 영양제 챙겨 먹기"
          placeholderTextColor={color.muted}
          onSubmitEditing={add}
          style={{ flex: 1, borderWidth: 1, borderColor: color.inputLine, borderRadius: 12, padding: 14, backgroundColor: color.inputBg, fontFamily: font.body, color: color.ink }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="내 미션 추가"
          onPress={add}
          disabled={busy || !title.trim()}
          style={{ backgroundColor: color.primaryDeep, borderRadius: radius.pill, paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center', opacity: busy || !title.trim() ? 0.5 : 1 }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.body, fontSize: 15, fontWeight: '800', color: '#fff' }}>추가</Text>}
        </Pressable>
      </View>
      {message && <Text style={{ ...text.caption, color: color.ink }}>{message}</Text>}
      {list === null ? (
        <ActivityIndicator color={color.primary} />
      ) : list.length === 0 ? (
        <Text style={text.caption}>아직 만든 미션이 없어요.</Text>
      ) : (
        list.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 10 }}>
            <View style={{ backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontFamily: font.body, fontSize: 11, fontWeight: '700', color: color.primary }}>{SLOT_LABELS[m.slot]}</Text>
            </View>
            <Text style={{ ...text.body, flex: 1 }}>{m.title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${m.title} 삭제`} onPress={() => run(() => userMissionsRepo.remove(m.id), '삭제했어요.')} disabled={busy} hitSlop={8}>
              <MaterialIcons name="delete-outline" size={20} color={color.muted} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}
