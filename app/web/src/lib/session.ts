import { cookies } from 'next/headers';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const USER_COOKIE = 'auth_user';

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Nest คืน refresh token มาทาง Set-Cookie เท่านั้น ไม่ได้อยู่ใน body
 * และ fetch ฝั่ง server ไม่ forward ต่อให้ browser จึงต้องดึงออกมาเอง
 */
export function readRefreshToken(
  response: Response,
): string | undefined {
  const header = response.headers
    .getSetCookie()
    .find((cookie) =>
      cookie.startsWith(`${REFRESH_COOKIE}=`),
    );

  if (!header) {
    return undefined;
  }

  const value = header
    .split(';')[0]
    .slice(`${REFRESH_COOKIE}=`.length);

  return value || undefined;
}

export async function writeSession(input: {
  accessToken: string;
  refreshToken?: string;
  user?: SessionUser;
}) {
  const store = await cookies();

  store.set(ACCESS_COOKIE, input.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  // ข้อมูลโชว์อย่างเดียว ไม่ใช่ credential จึงอยู่ได้เท่าอายุ session
  // ถ้าให้หมดพร้อม access token UI จะไม่รู้จัก user ทันทีที่ token หมดอายุ
  if (input.user) {
    store.set(USER_COOKIE, JSON.stringify(input.user), {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    });
  }

  if (input.refreshToken) {
    store.set(REFRESH_COOKIE, input.refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

export async function clearSession() {
  const store = await cookies();

  store.delete(ACCESS_COOKIE);
  store.delete(USER_COOKIE);
  store.delete(REFRESH_COOKIE);
}
