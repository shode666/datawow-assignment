import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import {
  clearSession,
  readSession,
  writeSession,
} from '@/lib/session';
import { REFRESH_COOKIE } from '@/lib/api-cookie';

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
};

export async function POST() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json(
      { message: 'Not signed in' },
      { status: 401 },
    );
  }

  const result = await callApi<RefreshResponse>(
    '/auth/refresh',
    { cookie: `${REFRESH_COOKIE}=${session.refreshToken}` },
  );

  if (!result.ok) {
    // refresh token หมดอายุหรือถูกเพิกถอน ล้าง session ทิ้งไม่ให้ค้าง
    await clearSession();

    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const refreshed = result.body as RefreshResponse;

  // user ไม่เปลี่ยนตอน refresh คงของเดิมไว้
  await writeSession({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    user: session.user,
  });

  return NextResponse.json({
    tokenType: refreshed.tokenType,
  });
}
