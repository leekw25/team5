// 설정: 지유 목소리 켜기/끄기(이 기기에 저장). 브라우저가 음성 읽기를 지원하지 않으면 보이지 않는다.
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { card, color, text } from './theme';
import { isVoiceOn, setVoiceOn, speak, voiceSupported } from './voice';

export function VoiceSetting() {
  const [on, setOn] = useState(isVoiceOn);
  if (!voiceSupported()) return null;
  const toggle = (next: boolean) => {
    setVoiceOn(next);
    setOn(next);
    if (next) speak('안녕하세요, 지유예요. 오늘도 같이 해 봐요!');
  };
  return (
    <View style={{ ...card, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ ...text.section, fontSize: 20 }}>지유 목소리</Text>
        <Text style={text.caption}>기록하거나 미션을 체크하면 지유가 한마디를 소리 내어 읽어 줘요.</Text>
      </View>
      <Switch value={on} onValueChange={toggle} trackColor={{ true: color.primary, false: color.line }} thumbColor="#fff" accessibilityLabel="지유 목소리" />
    </View>
  );
}
