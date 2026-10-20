// 주간 리포트(Stitch 디자인 '핏로그 주간 리포트', docs/design/shots/07-report.png).
// 숫자·그래프는 그 주 기록으로 계산하고(report-core), AI 총평은 버튼을 눌렀을 때만 Gemini를 부른다.
// 미션 달성은 이미경님 판정 결과(daily_missions)를 읽는다. 배지 4개는 이 주 결과로 계산하는 임시 배지다(B 배지 P1 통합 전).
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { missionsRepo, recordsRepo } from '@/data';
import { addDays, toDayKey } from '@/shared/date';
import { onMissionsUpdated } from '@/features/mission/missionEvents.ts';
import { onRecordsChanged } from '@/shared/events';
import { generateJson } from '@/shared/gemini';
import { AppHeader } from '@/ui/chrome';
import { Pop, ProgressBar, Reveal, Underline } from '@/ui/motion';
import { mondayOf, summarizeWeek, weekDays, type WeekSummary } from '@/ui/report-core.ts';
import { card, color, font, radius, text } from '@/ui/theme';

const WEEKDAY = ['월', '화', '수', '목', '금', '토', '일'];
const CARB = '#BFD3FF';
const slotTint = () => ({ 식단: [color.primarySoft, color.primary], 생활: [color.yellowSoft, color.yellowInk], 운동: [color.chipBg, '#7C5CE0'] }) as const; // 테마가 바뀌면 다시 읽도록 함수

const md = (dayKey: string) => `${Number(dayKey.slice(5, 7))}.${Number(dayKey.slice(8, 10))}`;
// 그 달의 몇째 주(월요일 날짜 기준)
const weekLabel = (monday: string) => `${Number(monday.slice(5, 7))}월 ${Math.ceil(Number(monday.slice(8, 10)) / 7)}주차`;

function useWeek(monday: string, today: string) {
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let ignore = false;
    const days = weekDays(monday);
    Promise.all(
      days.map(async (dayKey) =>
        dayKey <= today
          ? { dayKey, records: await recordsRepo.listByDay(dayKey), missions: await missionsRepo.listByDay(dayKey) }
          : { dayKey, records: [], missions: [] },
      ),
    )
      .then((byDay) => !ignore && setWeek(summarizeWeek(byDay, today)))
      .catch(() => !ignore && setWeek(summarizeWeek(days.map((dayKey) => ({ dayKey, records: [], missions: [] })), today)));
    return () => {
      ignore = true;
    };
  }, [monday, today, tick]);
  useEffect(() => onRecordsChanged(() => setTick((n) => n + 1)), []);
  useEffect(() => onMissionsUpdated(() => setTick((n) => n + 1)), []);
  return week;
}

function Section({ title, right, index, children }: { title: string; right?: string; index: number; children: React.ReactNode }) {
  return (
    <Reveal index={index} style={{ ...card, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color.primary }} />
        <Text style={{ ...text.section, fontSize: 17, flex: 1 }}>{title}</Text>
        {!!right && <Text style={text.caption}>{right}</Text>}
      </View>
      {children}
    </Reveal>
  );
}

function DayCircle({ done, counted }: { done: number; counted: boolean }) {
  const size = 38;
  if (counted && done === 3)
    return (
      <Pop style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="check" size={20} color={color.onYellow} />
      </Pop>
    );
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: counted && done > 0 ? color.primary : color.line, alignItems: 'center', justifyContent: 'center' }}>
      {counted && done > 0 && <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.primary }}>{done}</Text>}
    </View>
  );
}

function MacroBars({ week }: { week: WeekSummary }) {
  const H = 120;
  const max = Math.max(1, ...week.days.map((d) => d.carb_g * 4 + d.protein_g * 4 + d.fat_g * 9));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: H + 22 }}>
      {week.days.map((d, i) => {
        const parts = [
          { c: color.yellow, v: d.fat_g * 9 },
          { c: color.primary, v: d.protein_g * 4 },
          { c: CARB, v: d.carb_g * 4 },
        ];
        return (
          <View key={d.dayKey} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <View style={{ width: 22, height: H, justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: d.counted ? color.chipBg : 'transparent' }}>
              {parts.map((p) => (
                <View key={p.c} style={{ height: (p.v / max) * H, backgroundColor: p.c }} />
              ))}
            </View>
            <Text style={{ ...text.caption, color: i >= 5 ? color.primary : color.muted }}>{WEEKDAY[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const SCHEMA = { type: 'object', properties: { comment: { type: 'string' } }, required: ['comment'] };

export default function ReportScreen() {
  const today = toDayKey();
  const [monday, setMonday] = useState(() => mondayOf(today));
  const week = useWeek(monday, today);
  const [ai, setAi] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const isThisWeek = monday === mondayOf(today);

  async function askAi() {
    if (!week) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const facts = {
        미션: `${week.total}개 중 ${week.done}개 달성(${week.rate}%)`,
        요일별_달성: week.days.filter((d) => d.counted).map((d, i) => `${WEEKDAY[i]} ${d.done}/3, ${Math.round(d.kcal)}kcal`),
        탄단지_비율: week.macroPct,
        평균_섭취_칼로리: week.avgKcal,
        주간_운동_소모_칼로리: week.burned,
        미션별_달성일수: week.missionDays,
      };
      const r = await generateJson<{ comment: string }>(
        [{ text: `건강 기록 앱 '핏로그'의 주간 코치로서, 아래 한 주 기록을 보고 친근한 해요체 2~3문장으로 총평을 써 주세요. 잘한 점 하나, 다음 주에 해 볼 것 하나를 꼭 넣고, 숫자를 지어내지 마세요.\n${JSON.stringify(facts)}` }],
        SCHEMA,
      );
      setAi((m) => ({ ...m, [monday]: r.comment }));
    } catch (e) {
      setAiError(String((e as Error).message ?? e).includes('API 키') ? '설정에서 Gemini API 키를 먼저 입력해 주세요.' : 'AI 총평을 받지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setAiBusy(false);
    }
  }

  const sunday = addDays(monday, 6);
  const next = [...(week?.missionDays ?? [])].sort((a, b) => a.days - b.days);
  const badges = [
    { icon: 'edit-note', label: '첫 기록', on: (week?.records ?? 0) > 0, tint: color.primary },
    { icon: 'star', label: '3/3 하루', on: (week?.days.some((d) => d.counted && d.done === 3) ?? false), tint: color.yellow },
    { icon: 'local-fire-department', label: '3일 연속', on: (week?.streak ?? 0) >= 3, tint: color.yellow },
    { icon: 'emoji-events', label: '7일 연속', on: (week?.streak ?? 0) >= 7, tint: color.yellow },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        {/* 주 이동 */}
        <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 14, ...card, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="지난주" onPress={() => setMonday(addDays(monday, -7))} hitSlop={8}>
            <MaterialIcons name="chevron-left" size={22} color={color.muted} />
          </Pressable>
          <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '700', color: color.ink }}>
            {weekLabel(monday)} <Text style={{ fontWeight: '400', color: color.muted }}>({md(monday)} – {md(sunday)})</Text>
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="다음 주" disabled={isThisWeek} onPress={() => setMonday(addDays(monday, 7))} hitSlop={8} style={{ opacity: isThisWeek ? 0.3 : 1 }}>
            <MaterialIcons name="chevron-right" size={22} color={color.muted} />
          </Pressable>
        </View>

        {!week ? (
          <ActivityIndicator color={color.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 요약 */}
            <Reveal key={monday} style={{ ...card, backgroundColor: color.cream, borderColor: color.creamLine, padding: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={text.script}>Weekly report ✨</Text>
                  <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30 }}>이번 주 미션 {week.total}개 중</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30, color: color.primary }}>{week.done}개</Text>
                      <Underline color={color.primary} />
                    </View>
                    <Text style={{ ...text.headline, fontSize: 22, lineHeight: 30 }}> 완료했어요!</Text>
                  </View>
                  {week.streak > 0 && (
                    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 4, backgroundColor: color.yellowSoft, borderColor: color.yellowLine, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 }}>
                      <Text>🔥</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '700', color: color.ink }}>3/3 연속 {week.streak}일</Text>
                    </View>
                  )}
                </View>
                <Image source={require('../../assets/illustrations/jiyu-report.jpg')} accessibilityLabel="차트 클립보드를 든 지유" style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 1, borderColor: color.line }} />
              </View>
              {/* 2×2 칸: 큰 숫자(10,000kcal 이상)나 좁은 폰에서도 구분선에 닿지 않게 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: color.creamLine, paddingTop: 4 }}>
                {[
                  ['완수율', `${week.rate}%`, color.primary],
                  ['기록', `${week.records}건`, color.ink],
                  ['섭취 일평균', week.avgKcal ? `${week.avgKcal.toLocaleString()} kcal` : '-', color.ink],
                  ['운동 소모', week.burned ? `${week.burned.toLocaleString()} kcal` : '-', color.ink],
                ].map(([label, value, c], i) => (
                  <View
                    key={label}
                    style={{ width: '50%', alignItems: 'center', gap: 2, paddingVertical: 8, borderLeftWidth: i % 2 ? 1 : 0, borderTopWidth: i >= 2 ? 1 : 0, borderColor: color.creamLine }}
                  >
                    <Text style={text.caption}>{label}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.body, fontSize: 17, fontWeight: '800', color: c }}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </Reveal>

            {/* 요일별 미션 달성 */}
            <Section index={1} title="요일별 미션 달성" right={`총 ${week.done} / ${week.total} 완수`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {week.days.map((d, i) => (
                  <View key={d.dayKey} style={{ alignItems: 'center', gap: 6 }}>
                    <Text style={{ ...text.caption, color: d.dayKey === today ? color.primary : color.muted, fontWeight: d.dayKey === today ? '700' : '400' }}>{WEEKDAY[i]}</Text>
                    <DayCircle done={d.done} counted={d.counted} />
                    <Text style={{ ...text.caption, color: d.done === 3 ? color.ink : color.muted, fontWeight: d.done === 3 ? '700' : '400' }}>{d.counted ? `${d.done}/3` : ' '}</Text>
                  </View>
                ))}
              </View>
            </Section>

            {/* 영양 균형 */}
            <Section index={2} title="영양 균형 (탄·단·지)" right="일별 섭취 칼로리">
              <MacroBars week={week} />
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12 }}>
                {[
                  ['탄수화물', week.macroPct.carb, CARB],
                  ['단백질', week.macroPct.protein, color.primary],
                  ['지방', week.macroPct.fat, color.yellow],
                ].map(([label, pct, c]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c as string }} />
                    <Text style={{ ...text.caption, color: color.ink }}>
                      {label} ({pct}%)
                    </Text>
                  </View>
                ))}
              </View>
              {week.avgKcal > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: color.primarySoft, borderRadius: radius.card, padding: 12 }}>
                  <MaterialIcons name="auto-awesome" size={18} color={color.primary} />
                  <Text style={{ ...text.caption, fontSize: 13, color: color.primary, flex: 1 }}>
                    {week.macroPct.protein >= 20 ? `단백질 비율이 주 평균 ${week.macroPct.protein}%로 목표(20%)를 넘었어요 👏` : `단백질 비율이 주 평균 ${week.macroPct.protein}%예요. 목표(20%)까지 조금 더 채워 봐요!`}
                  </Text>
                </View>
              )}
            </Section>

            {/* AI 주간 총평 */}
            <Section index={3} title="AI 주간 총평">
              {ai[monday] ? (
                <Text style={{ ...text.body, lineHeight: 24, backgroundColor: color.page, borderRadius: 12, padding: 14 }}>{ai[monday]}</Text>
              ) : (
                <Pressable accessibilityRole="button" onPress={askAi} disabled={aiBusy || week.records === 0} style={{ height: 46, borderRadius: radius.pill, backgroundColor: color.primarySoft, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', opacity: week.records === 0 ? 0.5 : 1 }}>
                  {aiBusy ? <ActivityIndicator color={color.primary} /> : <MaterialIcons name="auto-awesome" size={18} color={color.primary} />}
                  <Text style={{ fontFamily: font.body, fontSize: 14, fontWeight: '700', color: color.primary }}>{week.records === 0 ? '기록이 있어야 총평을 받을 수 있어요' : aiBusy ? 'Gemini가 한 주를 돌아보는 중…' : 'Gemini 총평 받기'}</Text>
                </Pressable>
              )}
              {aiError && <Text style={{ ...text.caption, color: color.danger }}>{aiError}</Text>}
            </Section>

            {/* 다음 주 추천 미션: 이번 주에 덜 달성한 순서 */}
            <Section index={4} title="다음 주에 더 챙길 미션" right="달성 일수 적은 순">
              {next.map((m) => (
                <View key={m.title} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: slotTint()[m.slot as keyof ReturnType<typeof slotTint>][0], borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: font.body, fontSize: 12, fontWeight: '700', color: slotTint()[m.slot as keyof ReturnType<typeof slotTint>][1] }}>{m.slot}</Text>
                    </View>
                    <Text style={{ ...text.body, fontWeight: '700', flex: 1 }}>{m.title}</Text>
                    <Text style={text.caption}>{m.days}일 달성</Text>
                  </View>
                  <ProgressBar ratio={m.days / 7} fill={color.primary} track={color.primarySoft} height={6} />
                </View>
              ))}
            </Section>

            {/* 배지 */}
            <Section index={5} title="이번 주 배지" right={`${badges.filter((b) => b.on).length} / ${badges.length} 달성`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {badges.map((b) => (
                  <View key={b.label} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: b.on ? b.tint : color.line, backgroundColor: b.on ? (b.tint === color.yellow ? color.yellowSoft : color.primarySoft) : color.page, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name={b.on ? b.icon : 'lock-outline'} size={22} color={b.on ? (b.tint === color.yellow ? color.yellowInk : color.primary) : color.muted} />
                    </View>
                    <Text style={{ ...text.caption, color: b.on ? color.ink : color.muted, fontWeight: b.on ? '700' : '400' }}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}
