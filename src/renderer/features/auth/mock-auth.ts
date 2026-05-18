/**
 * 백엔드가 붙기 전까지 사용하는 임시 인증 저장소.
 * localStorage에 평문으로 보관하므로 MVP 검증 용도로만 쓰고,
 * 실서비스 단계에서는 keytar + secure storage로 교체한다.
 */

const STORAGE_KEY = 'mallang.mock-users';

interface StoredAccount {
  email: string;
  password: string;
  createdAt: string;
}

export type AuthErrorCode =
  | 'EMAIL_TAKEN'
  | 'EMAIL_NOT_FOUND'
  | 'WRONG_PASSWORD';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export interface MockAuthResult {
  email: string;
  createdAt: string;
}

export async function mockSignup(
  email: string,
  password: string,
): Promise<MockAuthResult> {
  await delay(500);
  const normalized = normalizeEmail(email);
  const accounts = readAccounts();

  if (accounts.some((account) => account.email === normalized)) {
    throw new AuthError('EMAIL_TAKEN', '이미 가입된 이메일이야.');
  }

  const account: StoredAccount = {
    email: normalized,
    password,
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  return { email: account.email, createdAt: account.createdAt };
}

export async function mockLogin(
  email: string,
  password: string,
): Promise<MockAuthResult> {
  await delay(400);
  const normalized = normalizeEmail(email);
  const accounts = readAccounts();
  const account = accounts.find((entry) => entry.email === normalized);

  if (!account) {
    throw new AuthError(
      'EMAIL_NOT_FOUND',
      '등록되지 않은 이메일이야. 먼저 계정을 만들어 줘.',
    );
  }
  if (account.password !== password) {
    throw new AuthError('WRONG_PASSWORD', '비밀번호가 일치하지 않아.');
  }

  return { email: account.email, createdAt: account.createdAt };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
