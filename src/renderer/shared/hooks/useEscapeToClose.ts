import { useEffect } from 'react';

/**
 * ESC 키를 누르면 전달받은 닫기 함수를 호출한다.
 * 마이페이지/그룹처럼 보조 창에서 키보드만으로 닫을 수 있도록 한다.
 */
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}
