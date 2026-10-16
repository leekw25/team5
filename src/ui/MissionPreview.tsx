// ponytail: 이미경님 MissionCards·판정 코드가 통합되기 전까지 쓰는 임시 미리보기.
// 오늘 기록을 바로 합산해 미션 3개(단백질·물·스쿼트) 진행률을 보여 준다. 통합 때 이 파일은 지우고 MissionCards로 바꾼다.
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { recordsRepo } from '@/data';
import { onRecordsChanged } from '@/shared/events';
import type { HealthRecord } from '@/shared/types/contract';
import { Pop, ProgressBar, Reveal } from './motion';
import { card, color, font, radius, text } from './theme';

interface Mission {
  slot: '식단' | '생활' | '운동';
  title: string;
  value: number;
  target: number;
  unit: string;
  doneNote: string;
}

function toMissions(records: HealthRecord[]): Mission[] {
  const protein = records.flatMap((r) => r.foods).reduce((s, f) => s + f.protein_g, 0);
  const water = records.reduce((s, r) => s + (r.water_ml ?? 0), 0);
  const squat = records.flatMap((r) => r.exercises).filter((e) => e.code === 'squat').reduce((s, e) => s + (e.sets ?? 1) * (e.reps ?? 0), 0);
  return [
    { slot: '식단', title: '단백질 30g 채우기', value: Math.round(protein), target: 30, unit: 'g', doneNote: '오늘 단백질 목표를 채웠어요!' },
    { slot: '생활', title: '물 1.5L 마시기', value: water, target: 1500, unit: 'ml', doneNote: '하루 수분 권장량 달성 완료!' },
    { slot: '운동', title: '스쿼트 30개 하기', value: squat, target: 30, unit: '개', doneNote: '오늘 운동 미션 완료!' },
  ];
}

export function useTodayMissions(dayKey: string) {
  const [missions, setMissions] = useState<Mission[]>(toMissions([]));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let ignore = false;
    recordsRepo.listByDay(dayKey).then((r) => !ignore && setMissions(toMissions(r))).catch(() => {});
    return () => {
      ignore = true;
    };
  }, [dayKey, tick]);
  useEffect(() => onRecordsChanged((e) => e.day_key === dayKey && setTick((n) => n + 1)), [dayKey]);
  return missions;
}

// 오늘 달성한 미션 수(0~3)에 따라 바뀌는 지유 일러스트
const JIYU = [
  { src: require('../../assets/illustrations/jiyu-ok.jpg'), label: '손으로 OK 사인을 하는 지유' },
  { src: require('../../assets/illustrations/jiyu-water.jpg'), label: '물병을 들고 엄지척하는 지유' },
  { src: require('../../assets/illustrations/jiyu-v.jpg'), label: '브이를 하며 윙크하는 지유' },
  { src: require('../../assets/illustrations/jiyu-cool.jpg'), label: '선글라스를 쓰고 자신감 있게 웃는 지유' },
];

export function HeroCard({ missions, name }: { missions: Mission[]; name?: string }) {
  const done = missions.filter((m) => m.value >= m.target).length;
  const rate = Math.round((done / missions.length) * 100);
  return (
    <Reveal style={{ ...card, backgroundColor: color.cream, borderColor: '#F3E6CC', padding: 18, flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={text.script}>Good job today! ✨</Text>
        {!!name && <Text style={{ ...text.section, color: color.primary }}>{name}님,</Text>}
        <Text style={text.headline}>
          오늘 미션 3개 중{'\n'}
          <Text style={{ color: color.primary, textDecorationLine: 'underline' }}>{done}개</Text> 완료했어요!
        </Text>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text>🔥</Text>
          <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.ink }}>연속 10일 달성</Text>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3E6CC', gap: 18 }}>
          <View>
            <Text style={text.caption}>남은 미션</Text>
            <Text style={{ ...text.body, fontWeight: '700' }}>{done === 3 ? '모두 완료!' : `앞으로 ${3 - done}개`}</Text>
          </View>
          <View>
            <Text style={text.caption}>오늘 달성률</Text>
            <Text style={{ ...text.body, fontWeight: '700', color: color.primary }}>{rate}% 달성</Text>
          </View>
        </View>
      </View>
      <View style={{ width: 112, borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: '#fff', overflow: 'hidden', alignSelf: 'center' }}>
        <Pop key={done}>
          <Image source={JIYU[done].src} style={{ width: 112, height: 132 }} resizeMode="cover" accessibilityLabel={JIYU[done].label} />
        </Pop>
      </View>
    </Reveal>
  );
}

export function MissionList({ missions }: { missions: Mission[] }) {
  const done = missions.filter((m) => m.value >= m.target).length;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={text.section}>오늘의 미션</Text>
        <View style={{ backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: color.primary }}>3개 중 {done}개</Text>
        </View>
      </View>
      {missions.map((m, i) => {
        const ok = m.value >= m.target;
        return (
          <Reveal
            key={m.slot}
            index={i}
            style={{ ...card, padding: 16, gap: 8, backgroundColor: ok ? '#FFFCF0' : color.surface, borderColor: ok ? color.yellowLine : color.line }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: ok ? color.yellowSoft : color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 }}>
                <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: ok ? '#8A6A00' : color.primary }}>{m.slot}</Text>
              </View>
              <Text style={{ ...text.caption, color: ok ? color.ink : color.muted, fontWeight: ok ? '700' : '400' }}>
                {Math.min(m.value, m.target).toLocaleString()} / {m.target.toLocaleString()}
                {m.unit}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...text.body, fontSize: 16, fontWeight: '700', textDecorationLine: ok ? 'line-through' : 'none', color: ok ? color.muted : color.ink }}>{m.title}</Text>
                {ok && <Text style={{ ...text.caption, color: color.primary }}>✨ {m.doneNote}</Text>}
              </View>
              {ok && (
                <Pop style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="check" size={22} color={color.ink} />
                </Pop>
              )}
            </View>
            {!ok && <ProgressBar ratio={m.value / m.target} fill={color.primary} track={color.primarySoft} />}
          </Reveal>
        );
      })}
    </View>
  );
}
