import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import {
  REFRESH_COOKIE,
  clearSession,
  readRefreshToken,
  writeSession,
} from '@/lib/session';

type RefreshResponse = {
  accessToken: string;
  tokenType: 'Bearer';
};

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: 'Refresh token is missing' },
      { status: 401 },
    );
  }

  const result = await callApi<RefreshResponse>(
    '/auth/refresh',
    { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
  );

  if (!result.ok) {
    // refresh token หมดอายุหรือถูกเพิกถอน ล้าง session ทิ้งไม่ให้ค้าง
    await clearSession();

    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const refreshed = result.body as RefreshResponse;

  await writeSession({
    accessToken: refreshed.accessToken,
    refreshToken: readRefreshToken(result.response),
  });

  return NextResponse.json({
    tokenType: refreshed.tokenType,
  });
}
