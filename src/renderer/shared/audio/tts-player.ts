import { fetchSpeechBlob, type TtsSpeakOptions } from '../api/tts-api';

export interface TtsEmotionStyle {
  emotion?: string;
  score?: number;
}

/**
 * 말랑이 발화 음성을 시리얼하게 재생하는 작은 플레이어.
 *
 * - 한 BrowserWindow 안에서 동시에 두 발화가 겹치지 않도록 단일 HTMLAudioElement 를 재사용한다.
 * - 새 발화가 들어오면 이전 audio 는 stop 하고 새 audio 로 교체한다.
 * - 토글이 꺼져 있거나 서버가 503 을 주면 자연스럽게 silent 로 동작한다(자막은 유지).
 */
class MallangTtsPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private requestSeq = 0;

  async speak(text: string, style?: TtsEmotionStyle): Promise<void> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      console.info('[tts-player] skip — empty text');
      return;
    }

    const seq = ++this.requestSeq;
    this.stopCurrent();
    console.info(
      `[tts-player] speak seq=${seq} preview="${trimmed.slice(0, 30)}" emotion=${style?.emotion ?? '-'}`,
    );

    const options: TtsSpeakOptions | undefined = style?.emotion
      ? { emotion: style.emotion, emotionScore: style.score }
      : undefined;

    let blob: Blob | null;
    try {
      blob = await fetchSpeechBlob(trimmed, options);
    } catch (error) {
      console.warn('[tts-player] fetch failed', error);
      return;
    }
    if (seq !== this.requestSeq) {
      console.info(
        `[tts-player] seq=${seq} dropped (superseded by ${this.requestSeq})`,
      );
      return;
    }
    if (!blob) {
      console.info(`[tts-player] seq=${seq} no blob — silent`);
      return;
    }
    if (blob.size === 0) {
      console.warn(
        `[tts-player] seq=${seq} blob is 0 bytes — playback skipped`,
      );
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audio = audio;
      this.currentObjectUrl = url;

      const cleanup = () => {
        if (this.audio === audio) {
          this.audio = null;
        }
        if (this.currentObjectUrl === url) {
          this.currentObjectUrl = null;
        }
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      };

      audio.addEventListener(
        'ended',
        () => {
          console.info(`[tts-player] seq=${seq} ended`);
          cleanup();
        },
        { once: true },
      );

      audio.addEventListener(
        'error',
        () => {
          console.warn(
            `[tts-player] seq=${seq} HTMLAudioElement error`,
            audio.error,
          );
          cleanup();
        },
        { once: true },
      );

      await audio.play();
      console.info(`[tts-player] seq=${seq} playing`);
    } catch (error) {
      console.warn(`[tts-player] seq=${seq} play() rejected`, error);
      this.stopCurrent();
    }
  }

  stop(): void {
    this.requestSeq += 1;
    this.stopCurrent();
  }

  private stopCurrent(): void {
    const audio = this.audio;
    const url = this.currentObjectUrl;
    this.audio = null;
    this.currentObjectUrl = null;

    if (audio) {
      try {
        audio.pause();
        audio.src = '';
        audio.load();
      } catch {
        // ignore
      }
    }
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  }
}

export const mallangTtsPlayer = new MallangTtsPlayer();
