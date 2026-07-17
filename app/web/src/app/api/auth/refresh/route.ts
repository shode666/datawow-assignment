import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  REFRESH_COOKIE,
  clearSession,
  readRefreshToken,
  writeSession,
} from '@/lib/session';

interface RefreshResponse {
  accessToken: string;
  tokenType: 'Bearer';
}

interface ApiError {
  message?: string | string[];
}

export async function POST() {
  const apiUrl = process.env.API_INTERNAL_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { message: 'API_INTERNAL_URL is not configured' },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: 'Refresh token is missing' },
      { status: 401 },
    );
  }

  const apiResponse = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: `${REFRESH_COOKIE}=${refreshToken}`,
    },
    cache: 'no-store',
  });

  const responseBody = (await apiResponse.json()) as
    | RefreshResponse
    | ApiError;

  if (!apiResponse.ok) {
    // refresh token หมดอายุหรือถูกเพิกถอน ล้าง session ทิ้งไม่ให้ค้าง
    await clearSession();

    return NextResponse.json(responseBody, {
      status: apiResponse.status,
    });
  }

  const result = responseBody as RefreshResponse;

  await writeSession({
    accessToken: result.accessToken,
    refreshToken: readRefreshToken(apiResponse),
  });

  return NextResponse.json({ tokenType: result.tokenType });
}
