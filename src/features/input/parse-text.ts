// A-F01, A-F02, A-F11: 문장·음성·사진을 Gemini로 보내 ParseResult 로 받는다. AI 호출은 shared/gemini.ts 의 generateJson 만 쓴다.
// 시연 문장은 A-F08 캐시가 먼저 처리한다(options.useCache = false 로 끌 수 있다).
import { generateJson } from '@/shared/gemini';
import type { ParseResult } from '@/shared/types/contract';
import { parseAudioWith, parseImageWith, parseWith } from './parse-core.ts';
import type { AudioInput, ParseOptions, PhotoInput } from './parse-core.ts';

export function parseText(text: string, now: Date = new Date(), options: ParseOptions = {}): Promise<ParseResult> {
  return parseWith(generateJson, text, now, options);
}

export function parseImage(image: PhotoInput, now: Date = new Date()): Promise<ParseResult> {
  return parseImageWith(generateJson, image, now);
}

export function parseAudio(audio: AudioInput, now: Date = new Date()): Promise<ParseResult> {
  return parseAudioWith(generateJson, audio, now);
}
