// "오늘의 합계" 카드: 그날 기록을 모두 더해 총 섭취 칼로리, 총 단백질, 총 운동 소모 칼로리를 보여 준다.
// 입력한 정보만 보여 주므로 기록이 없으면 카드 자체를 그리지 않고, 운동 기록이 없으면 소모 칸도 없다.
// '기록이 바뀌었다' 이벤트를 받으면 다시 계산한다. 통합 때 쓸지는 멘토가 정한다(입력 앱에만 있는 추가 컴포넌트).
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { card, color, font, text } from '@/ui/theme';
import { recordsRepo } from '@/data';
import { onRecordsChanged } from '@/shared/events';
import { computeTotals, toTotalCells } from './totals-core.ts';
import type { TotalCell } from './totals-core.ts';

export interface DailyTotalsProps {
  dayKey: string;
}

export function DailyTotals({ dayKey }: DailyTotalsProps) {
  const [cells, setCells] = useState<TotalCell[]>([]);
  const [reloadCount, setReloadCount] = useState(0); // 값이 바뀔 때마다 다시 계산한다

  // 기록 읽기. 화면이 사라지거나 날짜가 바뀐 뒤 늦게 도착한 응답은 무시한다. 읽기에 실패하면 카드를 숨긴다(타임라인이 오류를 보여 준다).
  useEffect(() => {
    let ignore = false;
    recordsRepo
      .listByDay(dayKey)
      .then((records) => {
        if (!ignore) setCells(toTotalCells(computeTotals(records)));
      })
      .catch(() => {
        if (!ignore) setCells([]);
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

  if (cells.length === 0) return null;

  return (
    <View style={{ ...card, padding: 16, gap: 12 }}>
      <Text style={text.section}>오늘의 합계</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {cells.map((cell) => (
          <View key={cell.label} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: color.primarySoft, alignItems: 'center' }}>
            <Text style={text.caption}>{cell.label}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 22, fontWeight: '800', color: color.primary }}>{cell.value}</Text>
            <Text style={text.caption}>{cell.unit}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...text.caption, fontSize: 11 }}>음식과 운동 수치는 AI가 추정한 값을 더한 것이라 실제와 다를 수 있어요.</Text>
    </View>
  );
}
