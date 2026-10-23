// 설정의 테마 고르기(이미경님 제안: 다크·화이트·블루·핑크·그린). 이 기기에 저장되고 바로 화면 전체에 적용된다.
import { MaterialIcons } from '@expo/vector-icons';
import { useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { card, color, font, getTheme, getThemeVersion, setTheme, subscribeTheme, text, THEMES, type ThemeName } from './theme';

const ORDER: ThemeName[] = ['blue', 'white', 'dark', 'pink', 'green'];

export function ThemePicker() {
  useSyncExternalStore(subscribeTheme, getThemeVersion, getThemeVersion);
  const current = getTheme();
  return (
    <View style={{ ...card, padding: 20, gap: 12 }}>
      <Text style={{ ...text.section, fontSize: 20 }}>테마</Text>
      <Text style={text.caption}>앱 전체 색을 바꿔요. 이 기기에만 저장돼요.</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ORDER.map((name) => {
          const p = THEMES[name].palette;
          const on = name === current;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${THEMES[name].label} 테마`}
              onPress={() => setTheme(name)}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 50, height: 50, borderRadius: 25, padding: 3, borderWidth: 2, borderColor: on ? color.primary : 'transparent' }}>
                <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: p.line, backgroundColor: p.page, flexDirection: 'row' }}>
                  <View style={{ flex: 1, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <MaterialIcons name="check" size={16} color="#fff" />}
                  </View>
                  <View style={{ flex: 1, backgroundColor: p.cream }} />
                </View>
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: on ? '800' : '500', color: on ? color.primary : color.muted }}>{THEMES[name].label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
