// A-F09 개발 도구: 저장된 기록(원문 + JSON) 보기, 시연용 아침 기록 넣기, 전체 초기화.
// 통합 앱에서는 쓰지 않는 개발 전용 화면이다.
import { useEffect, useState } from 'react';
import { Button, Platform, ScrollView, Text, View } from 'react-native';
import { recordsRepo } from '@/data';
import { emitRecordsChanged } from '@/shared/events';
import { getApiKey } from '@/shared/gemini';
import type { HealthRecord } from '@/shared/types/contract';
import { clearAiErrors, getAiErrors } from './ai-error-log.ts';
import type { AiSource } from './ai-error-log.ts';
import { DEMO_SENTENCE } from './demo-cache.ts';
import { buildMorningRecord, clearAll, listRecent } from './dev-core.ts';
import { measureRun, toTableText } from './measure-core.ts';
import type { RunResult } from './measure-core.ts';
import { parseText } from './parse-text';
import { saveRecords } from './save-core.ts';
import { formatTime } from './timeline-core.ts';
import { clearVoiceRuns, getVoiceRuns, voiceTableText } from './voice-timing-log.ts';

const MEASURE_COUNT = 5;
const SOURCE_LABEL: Record<AiSource, string> = { text: '글', voice: '음성', photo: '사진' };

export function DevTools() {
  const [keySaved, setKeySaved] = useState<boolean | null>(null); // 이 기기에 Gemini 키가 저장되어 있는가(키 내용은 읽지 않는다)
  const [records, setRecords] = useState<HealthRecord[] | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [table, setTable] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    listRecent(recordsRepo)
      .then((list) => {
        if (!ignore) setRecords(list);
      })
      .catch(() => {
        if (!ignore) setMessage('기록을 불러오지 못했어요.');
      });
    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  useEffect(() => {
    let ignore = false;
    getApiKey()
      .then((key) => {
        if (!ignore) setKeySaved(!!key);
      })
      .catch(() => {
        if (!ignore) setKeySaved(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  const reload = () => setReloadCount((n) => n + 1);
  const aiErrors = getAiErrors(); // 새로고침 버튼을 누르면 다시 읽는다
  const voiceRuns = getVoiceRuns();

  async function onAddMorning() {
    try {
      await saveRecords(recordsRepo, emitRecordsChanged, [buildMorningRecord()]);
      setMessage('시연용 아침 기록을 넣었어요.');
      reload();
    } catch {
      setMessage('아침 기록을 넣지 못했어요.');
    }
  }

  // A-F10: 시연 문장을 캐시 없이 5번 파싱해 단백질·시간 표를 만든다. 저장은 하지 않는다.
  async function onMeasure() {
    if (measuring) return;
    setMeasuring(true);
    setTable(null);
    const runs: RunResult[] = [];
    try {
      for (let i = 0; i < MEASURE_COUNT; i += 1) {
        runs.push(await measureRun(() => parseText(DEMO_SENTENCE, new Date(), { useCache: false })));
      }
      setTable(toTableText(DEMO_SENTENCE, runs));
    } finally {
      setMeasuring(false);
    }
  }

  async function onClear() {
    if (!confirmClear) {
      setConfirmClear(true); // 한 번 더 눌러야 지운다
      return;
    }
    setConfirmClear(false);
    try {
      const removed = await clearAll(recordsRepo, emitRecordsChanged);
      setMessage(removed + '개 기록을 모두 지웠어요.');
      reload();
    } catch {
      setMessage('초기화 중 문제가 생겼어요.');
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: '#666' }}>최근 14일과 내일까지의 기록입니다. 최신 날짜가 위에 나옵니다.</Text>
      <View style={{ gap: 8 }}>
        <Button title="시연용 아침 기록 넣기" onPress={onAddMorning} />
        <Button title="새로고침" onPress={reload} />
        <Button
          title={measuring ? '측정 중입니다. 잠시만 기다려 주세요' : '단백질 5회 측정 (AI를 5번 호출, 저장 안 함)'}
          onPress={onMeasure}
          disabled={measuring}
        />
        <Button
          title={confirmClear ? '정말 모두 지울까요? 한 번 더 누르세요' : '전체 초기화'}
          color="#c00"
          onPress={onClear}
        />
      </View>
      {message && <Text style={{ color: '#2a7a3b' }}>{message}</Text>}
      <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#b45309', gap: 6 }}>
        <Text style={{ fontWeight: 'bold' }}>이 기기 상태</Text>
        <Text>
          Gemini 키: {keySaved === null ? '확인 중' : keySaved ? '저장됨 ✅' : '없음 (설정 화면에서 입력해 주세요)'} · 환경: {Platform.OS}
        </Text>
        <Text style={{ fontWeight: 'bold' }}>최근 AI 오류 {aiErrors.length}건</Text>
        {aiErrors.length === 0 ? (
          <Text style={{ color: '#666' }}>없습니다. 글·음성·사진 입력이 실패하면 여기에 원인이 쌓입니다. 앱을 다시 켜면 사라집니다.</Text>
        ) : (
          aiErrors.map((entry) => (
            <View key={entry.at + entry.source + entry.message} style={{ gap: 2 }}>
              <Text style={{ fontWeight: 'bold' }}>
                {formatTime(entry.at)} · {SOURCE_LABEL[entry.source]} · {entry.context}
              </Text>
              <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: '#b91c1c' }}>
                {entry.message}
              </Text>
            </View>
          ))
        )}
        {aiErrors.length > 0 && (
          <Button
            title="오류 기록 지우기"
            onPress={() => {
              clearAiErrors();
              reload();
            }}
          />
        )}
      </View>
      <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2a7a3b', gap: 6 }}>
        <Text style={{ fontWeight: 'bold' }}>음성 지연 측정 {voiceRuns.length}회</Text>
        {voiceRuns.length === 0 ? (
          <Text style={{ color: '#666' }}>
            홈에서 🎤 버튼으로 말해서 기록할 때마다 끝내기 버튼을 누른 뒤 저장까지 걸린 시간이 쌓입니다. 5번 이상 한 뒤 새로고침을 누르세요. 앱을 다시 켜면 사라집니다.
          </Text>
        ) : (
          <>
            <Text selectable style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {voiceTableText(voiceRuns)}
            </Text>
            <Button
              title="측정 기록 지우기"
              onPress={() => {
                clearVoiceRuns();
                reload();
              }}
            />
          </>
        )}
      </View>
      {table && (
        <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2a7a3b', gap: 6 }}>
          <Text style={{ fontWeight: 'bold' }}>측정 결과 (그대로 복사해서 멘토에게 전달)</Text>
          <Text selectable style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {table}
          </Text>
        </View>
      )}
      <Text style={{ fontWeight: 'bold' }}>기록 {records ? records.length + '개' : '불러오는 중'}</Text>
      {records?.map((record) => (
        <View key={record.id} style={{ padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', gap: 6 }}>
          <Text style={{ fontWeight: 'bold' }}>
            {record.day_key} {formatTime(record.occurred_at)} · {record.kind} · 확신도 {record.confidence}
          </Text>
          <Text>원문: {record.raw_text ?? '(없음)'}</Text>
          <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: '#333' }}>
            {JSON.stringify(record, null, 2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
