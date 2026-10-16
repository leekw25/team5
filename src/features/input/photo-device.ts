// A-F11: 사진 선택기(expo-image-picker)를 부르는 얇은 연결 파일. 판단 로직은 photo-core.ts 에 있다.
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { PhotoInput } from './parse-core.ts';
import { extractImage } from './photo-core.ts';

export type PhotoSource = 'library' | 'camera';
export type PickResult =
  | { kind: 'ok'; image: PhotoInput }
  | { kind: 'canceled' }
  | { kind: 'denied' } // 권한 거부
  | { kind: 'unreadable' }; // 사진은 골랐지만 내용을 읽지 못함

// 갤러리에서 고르거나 카메라로 찍는다. 크기를 줄이려고 품질 0.5 로 받는다.
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  // 웹은 권한 창이 없고, 버튼을 누른 직후에 바로 선택창을 열어야 해서 권한 요청을 건너뛴다.
  if (Platform.OS !== 'web') {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
  if (result.canceled) return { kind: 'canceled' };
  const image = extractImage(result.assets[0]);
  return image ? { kind: 'ok', image } : { kind: 'unreadable' };
}
