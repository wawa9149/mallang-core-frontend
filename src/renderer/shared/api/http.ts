import axios, { AxiosHeaders } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth-store';
import { signOutAndReturnToLogin } from '../window/sign-out';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

/**
 * axios 1.x 에서는 config.headers가 AxiosHeaders 인스턴스로 들어오는 경우가 있어,
 * 단순 객체 할당을 하면 직렬화 단계에서 무시될 수 있다. set() 호출로 항상 안전하게 적용한다.
 */
function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
): void {
  const value = `Bearer ${token}`;
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', value);
    return;
  }
  // 일반 객체로 들어온 케이스(거의 없지만 안전망)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (config.headers as any).Authorization = value;
}

/**
 * 요청에 Authorization 헤더를 자동으로 붙인다.
 * 토큰이 없는 요청(예: signup/login)은 그대로 보낸다.
 */
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken;
  const hasAuth =
    config.headers instanceof AxiosHeaders
      ? Boolean(config.headers.get('Authorization'))
      : Boolean(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config.headers as any)?.Authorization,
        );
  if (token && !hasAuth) {
    setAuthorizationHeader(config, token);
  }
  return config;
});

interface RetriableRequest extends InternalAxiosRequestConfig {
  _mallangRetried?: boolean;
}

/**
 * 401이 한 번이라도 발생하면 refresh를 시도하고 원본 요청을 한 번만 재시도한다.
 * refresh까지 실패하면 강제 로그아웃 플로우(말랑이/부속 창 정리 + 로그인 창 띄우기)를
 * 실행해서 화면이 인증 만료 상태로 멈춰 있지 않도록 한다.
 */
let pendingRefresh: Promise<string | null> | null = null;

/**
 * 같은 만료 이벤트에서 여러 요청이 동시에 401을 받아도 강제 로그아웃 흐름은 한 번만 돌게 막는다.
 * sign-out이 완료된 뒤에는 다시 잠금을 풀어, 다음 세션에서 또 만료가 감지될 수 있도록 한다.
 */
let isForcingSignOut = false;
function triggerForcedSignOut(): void {
  if (isForcingSignOut) return;
  // 이미 로그아웃 상태(로그인 화면 등)에서 401이 떨어진 거라면 굳이 sign-out 플로우를 돌리지 않는다.
  if (!useAuthStore.getState().isAuthenticated) return;

  isForcingSignOut = true;
  signOutAndReturnToLogin()
    .catch((error) => {
      console.error('[http] forced sign-out failed', error);
      useAuthStore.getState().signOut();
    })
    .finally(() => {
      // 새 로그인이 끝나기 충분한 시간 뒤에 잠금을 풀어 둔다.
      setTimeout(() => {
        isForcingSignOut = false;
      }, 2000);
    });
}

async function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    try {
      // 멀티 윈도우 환경 안전망: storage 이벤트를 놓쳤더라도, refresh 직전에
      // localStorage 에서 가장 최신 token 을 다시 읽어와 메모리에 반영한다.
      // 다른 BrowserWindow 가 이미 rotation 시킨 새 refresh token 이 있을 수 있다.
      try {
        await useAuthStore.persist.rehydrate();
      } catch (rehydrateError) {
        if (import.meta.env.DEV) {
          console.warn(
            '[http] auth rehydrate before refresh failed',
            rehydrateError,
          );
        }
      }
      const refreshToken = useAuthStore.getState().tokens?.refreshToken;
      if (!refreshToken) {
        if (import.meta.env.DEV) {
          console.warn('[http] refresh skipped: no refreshToken in store');
        }
        return null;
      }

      if (import.meta.env.DEV) {
        console.info('[http] refreshing access token via POST /auth/refresh');
      }

      // 인터셉터를 우회해서(Authorization 헤더 없이) 원초적인 axios 인스턴스로 호출한다.
      const response = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 10_000, withCredentials: true },
      );

      useAuthStore.getState().setTokens(response.data);
      if (import.meta.env.DEV) {
        console.info(
          '[http] refresh ok, new access token length =',
          response.data.accessToken.length,
        );
      }
      return response.data.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError?.response?.status;
      if (import.meta.env.DEV) {
        console.warn(
          '[http] refresh failed, will force sign-out. status=',
          status,
          'data=',
          axiosError?.response?.data,
          'message=',
          axiosError?.message,
        );
      }
      // refresh 실패 = 토큰 만료/취소. 화면이 멈춘 채로 401만 쏟아지지 않도록
      // 모든 부속 창을 닫고 로그인 창을 띄우는 흐름을 명시적으로 호출한다.
      triggerForcedSignOut();
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._mallangRetried &&
      // refresh/login/signup 자체에서 401이 나면 retry 의미가 없으므로 제외한다.
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/signup')
    ) {
      if (import.meta.env.DEV) {
        console.info(
          '[http] 401 detected on',
          original.method?.toUpperCase(),
          original.url,
          '→ attempting refresh',
        );
      }
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        original._mallangRetried = true;
        // AxiosHeaders 안전한 set 헬퍼 사용. (직접 할당 시 axios v1에서 적용 안 되는 케이스 차단)
        setAuthorizationHeader(original, newAccess);
        if (import.meta.env.DEV) {
          console.info(
            '[http] retrying',
            original.method?.toUpperCase(),
            original.url,
            'with refreshed token',
          );
        }
        return http.request(original);
      }
    }

    if (import.meta.env.DEV) {
      console.error(
        '[http]',
        status,
        original?.method?.toUpperCase(),
        original?.url,
        '-',
        error.message,
      );
    }
    return Promise.reject(error);
  },
);
