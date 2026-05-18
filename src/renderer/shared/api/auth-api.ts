import axios from 'axios';
import type { AxiosError } from 'axios';
import type { User } from '../../../shared/types/domain';
import { useAuthStore } from '../stores/auth-store';
import { applyAuthenticatedSession } from '../window/apply-session';
import { http } from './http';
import { toFrontendUser } from './mappers';
import type { BackendPublicUser } from './types';

/**
 * 백엔드 NestJS의 /api/auth/* 엔드포인트를 감싸는 클라이언트.
 *
 * mock-auth.ts 시절의 AuthError 시그니처(EMAIL_TAKEN / EMAIL_NOT_FOUND / WRONG_PASSWORD)를
 * 그대로 유지해서 LoginPage/SignupPage의 에러 표시 코드를 손대지 않아도 되도록 했다.
 */

export type AuthErrorCode =
  | 'EMAIL_TAKEN'
  | 'EMAIL_NOT_FOUND'
  | 'WRONG_PASSWORD'
  | 'INVALID_REFRESH_TOKEN'
  | 'UNKNOWN';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: BackendPublicUser;
}

export interface AuthResult {
  user: User;
  raw: BackendPublicUser;
}

function toAuthError(
  error: unknown,
  fallback: AuthErrorCode = 'UNKNOWN',
): AuthError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    const message =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data?.message.join(', ')
          : error.message;
    const code = isAuthErrorCode(message)
      ? message
      : mapStatusToCode(error, fallback);
    return new AuthError(code, friendlyMessage(code, message));
  }
  if (error instanceof Error) {
    return new AuthError(fallback, error.message);
  }
  return new AuthError(fallback, '알 수 없는 오류가 발생했어.');
}

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return (
    value === 'EMAIL_TAKEN' ||
    value === 'EMAIL_NOT_FOUND' ||
    value === 'WRONG_PASSWORD' ||
    value === 'INVALID_REFRESH_TOKEN'
  );
}

function mapStatusToCode(
  error: AxiosError,
  fallback: AuthErrorCode,
): AuthErrorCode {
  const status = error.response?.status;
  if (status === 401) return 'WRONG_PASSWORD';
  if (status === 409) return 'EMAIL_TAKEN';
  return fallback;
}

function friendlyMessage(code: AuthErrorCode, fallback: string): string {
  switch (code) {
    case 'EMAIL_TAKEN':
      return '이미 가입된 이메일이야.';
    case 'EMAIL_NOT_FOUND':
      return '등록되지 않은 이메일이야. 먼저 계정을 만들어 줘.';
    case 'WRONG_PASSWORD':
      return '비밀번호가 일치하지 않아.';
    case 'INVALID_REFRESH_TOKEN':
      return '세션이 만료됐어. 다시 로그인해 줘.';
    default:
      return fallback || '인증 중 오류가 발생했어.';
  }
}

export async function signup(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  try {
    const { data } = await http.post<AuthResponseBody>('/auth/signup', {
      email,
      password,
      name,
    });
    const user = toFrontendUser(data.user);
    applyAuthenticatedSession(user, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return { user, raw: data.user };
  } catch (error) {
    throw toAuthError(error, 'EMAIL_TAKEN');
  }
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data } = await http.post<AuthResponseBody>('/auth/login', {
      email,
      password,
    });
    const user = toFrontendUser(data.user);
    applyAuthenticatedSession(user, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return { user, raw: data.user };
  } catch (error) {
    throw toAuthError(error, 'WRONG_PASSWORD');
  }
}

export async function fetchMe(): Promise<{
  user: User;
  raw: BackendPublicUser;
}> {
  const { data } = await http.get<BackendPublicUser>('/auth/me');
  return { user: toFrontendUser(data), raw: data };
}

export async function logout(): Promise<void> {
  const refreshToken = useAuthStore.getState().tokens?.refreshToken;
  if (refreshToken) {
    // 백엔드 토큰 폐기는 best-effort. 실패해도 클라이언트 store는 무조건 비운다.
    try {
      await http.post('/auth/logout', { refreshToken });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[auth] logout API failed', error);
      }
    }
  }
  useAuthStore.getState().signOut();
}
