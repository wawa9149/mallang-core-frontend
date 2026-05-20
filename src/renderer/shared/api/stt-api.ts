import { http } from './http';

/**
 * 백엔드 /api/stt/transcribe 로 녹음 blob 을 보내 인식된 텍스트를 받는다.
 *
 * - 매고보이스가 인식한 모든 segment 가 공백으로 join 된 한 줄 문자열로 돌아온다.
 * - 인식된 음성이 없으면 빈 문자열을 돌려준다.
 * - 네트워크/업스트림 오류는 axios 에러로 그대로 던져서 호출자가 토스트/말풍선으로 알릴 수 있게 한다.
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  // 매고보이스가 확장자로 디코더를 고를 수 있게 mime 에 맞춘 파일명을 붙여 준다.
  const filename = pickFilename(blob.type);
  form.append('file', blob, filename);

  const { data } = await http.post<{ text: string }>('/stt/transcribe', form, {
    // axios 가 multipart boundary 를 자동으로 채우도록 Content-Type 헤더를 명시적으로 비워 둔다.
    // 일부 환경에서는 application/json 이 기본으로 덮어쓰일 수 있어 안전장치 차원에서 둔다.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  });
  return data?.text ?? '';
}

function pickFilename(mime: string): string {
  // 매고보이스가 디코더를 확장자로 고를 수 있게 정확한 확장자를 붙여 준다.
  // 현재 우리 녹음 경로는 항상 WAV 16-bit PCM 이지만, 미래에 다른 컨테이너를 끼울 수도 있어 분기를 둔다.
  if (mime.includes('wav')) return 'recording.wav';
  if (mime.includes('flac')) return 'recording.flac';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'recording.m4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'recording.mp3';
  if (mime.includes('aac')) return 'recording.aac';
  if (mime.includes('webm')) return 'recording.webm';
  if (mime.includes('ogg')) return 'recording.ogg';
  return 'recording.bin';
}
