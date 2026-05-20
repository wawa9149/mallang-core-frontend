import { fetchSpeechBlob } from '../api/tts-api';

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
  /**
   * 마지막으로 enqueue 된 발화에 대한 토큰. 도중에 다른 발화가 들어오면 이전 진행을 무시할 때 쓴다.
   * 숫자가 단조 증가하면 충분.
   */
  private requestSeq = 0;

  /**
   * 텍스트를 백엔드 TTS 로 합성해 즉시 재생한다.
   * 호출자는 await 할 필요 없이 fire-and-forget 으로 부르면 된다(에러는 콘솔에만 남긴다).
   */
  async speak(text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      console.info('[tts-player] skip — empty text');
      return;
    }

    // 새 요청이 시작될 때마다 진행 중이던 음성은 즉시 중단해, 자막과 음성이 어긋나지 않게 한다.
    const seq = ++this.requestSeq;
    this.stopCurrent();
    console.info(
      `[tts-player] speak seq=${seq} preview="${trimmed.slice(0, 30)}"`,
    );

    let blob: Blob | null;
    try {
      blob = await fetchSpeechBlob(trimmed);
    } catch (error) {
      console.warn('[tts-player] fetch failed', error);
      return;
    }
    // 이 fetch 도중 더 새로운 발화가 들어와 있다면 그쪽을 우선한다.
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
      audio.preload = 'auto';
      this.audio = audio;
      this.currentObjectUrl = url;

      audio.addEventListener(
        'ended',
        () => {
          console.info(`[tts-player] seq=${seq} ended`);
          this.cleanupObjectUrl(url);
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
          this.cleanupObjectUrl(url);
        },
        { once: true },
      );

      await audio.play();
      console.info(`[tts-player] seq=${seq} playing (duration ~ unknown yet)`);
    } catch (error) {
      // user gesture 정책 등으로 autoplay 가 막힐 수 있다. Electron 메인 프로세스에서
      // BrowserWindow webPreferences.autoplayPolicy 를 'no-user-gesture-required' 로 둬야 안전.
      console.warn(
        `[tts-player] seq=${seq} play() rejected — autoplay policy 또는 codec 문제일 수 있다.`,
        error,
      );
      this.stopCurrent();
    }
  }

  /** 즉시 발화 중지. 토글을 끄거나 로그아웃할 때 호출. */
  stop(): void {
    this.requestSeq += 1;
    this.stopCurrent();
  }

  private stopCurrent(): void {
    const audio = this.audio;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // play 가 시작되지 않은 audio 일 수 있다. 무시한다.
      }
    }
    this.audio = null;
    if (this.currentObjectUrl) {
      this.cleanupObjectUrl(this.currentObjectUrl);
    }
  }

  private cleanupObjectUrl(url: string): void {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    if (this.currentObjectUrl === url) {
      this.currentObjectUrl = null;
    }
  }
}

export const mallangTtsPlayer = new MallangTtsPlayer();
