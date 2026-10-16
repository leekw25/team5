// 로컬 DB 계층 (요구사항 A-F03). 홍현정님이 구현한다.
// - 휴대폰 로컬 저장소(AsyncStorage)에 JSON 배열로 저장한다. 키는 LOCAL_KEYS.records.
// - 함수 이름과 모양(RecordsRepo)은 바꾸지 않는다. 통합 때 멘토가 이 파일만 Supabase 버전으로 바꾼다.
// - 실제 로직은 local-records.ts 에 있고(테스트 가능하게 분리), 이 파일은 진짜 저장소와 UUID 생성기를 꽂아 준다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createRecordsRepo } from './local-records.ts';

export const recordsRepo = createRecordsRepo({ storage: AsyncStorage, randomUUID });
