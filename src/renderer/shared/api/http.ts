import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth-store';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

/**
 * 요청에 Authorization 헤더를 자동으로 붙인다.
 * 토큰이 없는 요청(예: signup/login)은 그대로 보낸다.
 */
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableRequest extends InternalAxiosRequestConfig {
  _mallangRetried?: boolean;
}

/**
 * 401이 한 번이라도 발생하면 refresh를 시도하고 원본 요청을 한 번만 재시도한다.
 * refresh도 실패하면 store를 비우고 401을 그대로 던진다 — UI에서 /login으로 보낼지 결정.
 */
let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    try {
      const refreshToken = useAuthStore.getState().tokens?.refreshToken;
      if (!refreshToken) return null;

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
      return response.data.accessToken;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[http] refresh failed, signing out', error);
      }
      useAuthStore.getState().signOut();
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
      // refresh 호출 자체에서 401이 나면 다시 refresh하지 않는다.
      !original.url?.includes('/auth/refresh')
    ) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        original._mallangRetried = true;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return http.request(original);
      }
    }

    if (import.meta.env.DEV) {
      console.error('[http]', status, error.message);
    }
    return Promise.reject(error);
  },
);
