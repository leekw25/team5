// Gemini 호출은 이 파일로만 한다. API 키는 코드에 넣지 않고, 사용자가 설정 화면에서 입력한 값을
// 휴대폰 보안 저장소(SecureStore)에 보관해 쓴다.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_NAME = 'gemini_api_key';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// 빠르고 저렴한 모델. 바꾸려면 멘토에게 요청(계약 변경과 같은 절차).
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// 웹(개발용 미리보기)에는 SecureStore가 없어 브라우저 localStorage에 둔다.
const isWeb = Platform.OS === 'web';
export const getApiKey = async () => (isWeb ? localStorage.getItem(KEY_NAME) : SecureStore.getItemAsync(KEY_NAME));
export const saveApiKey = async (key: string) =>
  isWeb ? localStorage.setItem(KEY_NAME, key.trim()) : SecureStore.setItemAsync(KEY_NAME, key.trim());
export const deleteApiKey = async () => (isWeb ? localStorage.removeItem(KEY_NAME) : SecureStore.deleteItemAsync(KEY_NAME));

// 키가 유효한지 모델 목록 조회로 확인
export async function testApiKey(key: string): Promise<boolean> {
  const res = await fetch(`${BASE}/models?pageSize=1`, { headers: { 'x-goog-api-key': key.trim() } });
  return res.ok;
}

// 텍스트 또는 파일(음성·사진, base64)
export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

// 프롬프트와 JSON 스키마를 주면 그 스키마 모양의 객체를 돌려준다. temperature 0으로 결과를 최대한 고정.
export async function generateJson<T>(parts: GeminiPart[], responseSchema: object): Promise<T> {
  const key = await getApiKey();
  if (!key) throw new Error('Gemini API 키가 없습니다. 설정 화면에서 입력해 주세요.');
  const res = await fetch(`${BASE}/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema },
    }),
  });
  if (!res.ok) throw new Error(`Gemini 오류 ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const text: string | undefined = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답이 비어 있습니다');
  return JSON.parse(text) as T;
}
