import { http } from './http';

/**
 * 백엔드 /api/tts/speak 를 호출해 mp3 binary 를 가져온다.
 *
 * 응답 시나리오
 * - 200: blob 으로 반환. 호출자가 ObjectURL 로 만들어 HTMLAudioElement 에 흘려 넣으면 된다.
 * - 403: 사용자가 마이페이지에서 TTS 를 꺼 둠 → null 반환(호출자는 자막만 유지).
 * - 503: 서버에 Clova 키가 없거나 업스트림 오류 → null 반환.
 * - 그 외 axios 에러: 그대로 throw.
 */
export async function fetchSpeechBlob(text: string): Promise<Blob | null> {
  try {
    const { data, status } = await http.post<Blob>(
      '/tts/speak',
      { text },
      {
        responseType: 'blob',
        // 401 retry 인터셉터를 그대로 타도록 timeout 만 따로 늘려 둔다.
        // Clova 응답은 보통 1~2초 안쪽이지만, 긴 문장에서 약간 길어질 수 있다.
        timeout: 15_000,
      },
    );
    console.info(
      `[tts-api] /tts/speak ok status=${status} bytes=${data?.size ?? 0} type=${data?.type ?? '-'}`,
    );
    return data;
  } catch (error) {
    // 백엔드가 403/503 일 때만 silent fail. 그 외 (401 인증 만료, 500 등) 는 throw 해서
    // 호출자가 콘솔 경고를 띄울 수 있게 둔다. 어느 쪽이든 어떤 상태에서 멈췄는지 항상 로그를 남긴다.
    const status = extractStatus(error);
    if (status === 403) {
      console.info(
        '[tts-api] /tts/speak skipped — backend says TTS_DISABLED (403). ' +
          '마이페이지에서 TTS 토글이 꺼져 있거나, 토글이 다른 창에서만 켜져서 백엔드에 반영되지 않았을 수 있다.',
      );
      return null;
    }
    if (status === 503) {
      console.info(
        '[tts-api] /tts/speak skipped — upstream unavailable (503). ' +
          'Clova API 키가 비어 있거나 네트워크가 막혀 있을 수 있다.',
      );
      return null;
    }
    console.warn(
      `[tts-api] /tts/speak failed status=${status ?? 'n/a'}`,
      error,
    );
    throw error;
  }
}

function extractStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const maybe = error as { response?: { status?: number } };
  return typeof maybe.response?.status === 'number'
    ? maybe.response.status
    : null;
}
