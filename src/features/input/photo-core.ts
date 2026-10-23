// A-F11 사진 식단 입력의 계산 부분. 사진 선택기가 준 값에서 Gemini에 보낼 이미지를 뽑는다.
import type { PhotoInput } from './parse-core.ts';

// expo-image-picker 가 돌려주는 사진 한 장 중 필요한 부분만 본 모양
export interface PickedAsset {
  base64?: string | null;
  mimeType?: string | null;
  uri?: string | null;
}

function imageMime(mime: string | null | undefined): string {
  return mime && mime.startsWith('image/') ? mime : 'image/jpeg';
}

// base64 가 있으면 그대로, 없으면(웹) data: 주소에서 꺼낸다. 읽을 수 없으면 null.
export function extractImage(asset: PickedAsset | null | undefined): PhotoInput | null {
  if (!asset) return null;
  if (asset.base64) {
    const data = asset.base64.startsWith('data:') ? asset.base64.slice(asset.base64.indexOf(',') + 1) : asset.base64;
    return data ? { mimeType: imageMime(asset.mimeType), base64: data } : null;
  }
  const match = asset.uri ? /^data:([^;,]*);base64,(.+)$/.exec(asset.uri) : null;
  return match ? { mimeType: imageMime(match[1] || asset.mimeType), base64: match[2] } : null;
}
