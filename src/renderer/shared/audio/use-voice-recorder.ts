import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 마이크 녹음 hook (WAV 16-bit PCM 출력).
 *
 * - 매고보이스(STT 업스트림)가 공식적으로 지원하는 컨테이너는 WAV/FLAC/AAC/MP3/MP4 다.
 *   브라우저 MediaRecorder 가 만드는 webm/opus 를 그대로 보내면 매고보이스가 디코드에
 *   실패해 빈 텍스트로 응답하기 때문에, 클라이언트에서 직접 WAV 로 인코딩해 보낸다.
 * - 구현은 Web Audio API: getUserMedia → AudioContext.createMediaStreamSource →
 *   ScriptProcessorNode 로 PCM 샘플을 수집 → stop 시 WAV 헤더를 붙여 Blob 으로 반환.
 *   ScriptProcessorNode 는 deprecated 이지만 Electron Chromium 에서 안정적으로 동작하고,
 *   AudioWorklet 처럼 별도 worklet 파일을 번들에 끼우지 않아도 되어 단순하다.
 * - 채널은 단일(mono), 비트심도는 16-bit. sample rate 는 AudioContext 기본값(보통 48 kHz).
 *   매고보이스는 RIFF 헤더의 sample rate 를 그대로 따라 resample 하므로 별도 변환 불필요.
 *
 * 언마운트 시에는 stream / AudioContext 자원을 안전하게 정리한다.
 */
export interface VoiceRecorderHandle {
  isRecording: boolean;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

interface ActiveSession {
  stream: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
}

export function useVoiceRecorder(): VoiceRecorderHandle {
  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<ActiveSession | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    // AudioContext 는 일부 환경에서 webkit prefix 만 있을 수 있어 둘 다 본다.
    typeof (
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    ) === 'function';

  const teardown = useCallback((session: ActiveSession | null) => {
    if (!session) return;
    try {
      session.processor.disconnect();
    } catch {
      // ignore
    }
    try {
      session.source.disconnect();
    } catch {
      // ignore
    }
    // onaudioprocess 핸들러를 떼어 두지 않으면 disconnect 후에도 잠깐 한 번 더 호출될 수 있다.
    session.processor.onaudioprocess = null;
    for (const track of session.stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
    // close 는 비동기지만 호출만 하면 충분(에러는 무시).
    session.context.close().catch(() => {
      // ignore
    });
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      throw new Error('VOICE_NOT_SUPPORTED');
    }
    if (sessionRef.current) {
      // 이미 진행 중이면 재호출은 무시.
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const context = new Ctor();
    const source = context.createMediaStreamSource(stream);
    // 4096 샘플 버퍼는 지연/CPU 사이의 표준적인 절충값. 단일 채널 입/출력.
    const processor = context.createScriptProcessor(4096, 1, 1);

    const chunks: Float32Array[] = [];
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      // 이벤트 버퍼는 재사용되므로 반드시 복사해 둬야 한다.
      chunks.push(new Float32Array(input));
    };

    source.connect(processor);
    // ScriptProcessorNode 는 destination 에 연결되어 있어야 onaudioprocess 가 호출된다.
    // 출력은 무음(GainNode 0) 으로 흘려 보내, 사용자가 자기 목소리를 듣는 echo 가 안 생기게 한다.
    const muteGain = context.createGain();
    muteGain.gain.value = 0;
    processor.connect(muteGain);
    muteGain.connect(context.destination);

    sessionRef.current = { stream, context, source, processor, chunks };
    setIsRecording(true);
  }, [isSupported]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const session = sessionRef.current;
    if (!session) return null;
    sessionRef.current = null;
    setIsRecording(false);
    const sampleRate = session.context.sampleRate;
    const chunks = session.chunks;
    teardown(session);
    if (chunks.length === 0) return null;
    return encodeWav(chunks, sampleRate);
  }, [teardown]);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setIsRecording(false);
    teardown(session);
  }, [teardown]);

  // 언마운트 시 자원 누수 방지.
  useEffect(
    () => () => {
      cancel();
    },
    [cancel],
  );

  return { isRecording, isSupported, start, stop, cancel };
}

/**
 * Float32 PCM 청크들을 모아 16-bit RIFF WAV Blob 으로 인코딩한다.
 * 매고보이스가 그대로 디코드할 수 있는 표준 PCM/WAV 컨테이너다.
 */
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0);
  const samples = new Float32Array(totalSamples);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  // Float32 [-1, 1] → Int16 [-32768, 32767]
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const bytesPerSample = 2; // 16-bit
  const numChannels = 1;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM = 16 byte fmt chunk
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM 본문
  let writeOffset = 44;
  for (let i = 0; i < pcm.length; i++, writeOffset += 2) {
    view.setInt16(writeOffset, pcm[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i));
  }
}
