import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  type SessionUser,
  readRefreshToken,
  writeSession,
} from '@/lib/session';

interface SwitchResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
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
  const accessToken =
    cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Access token is missing' },
      { status: 401 },
    );
  }

  // fetch ฝั่ง server ไม่ส่ง cookie ของ browser ต่อให้ ต้องแนบเอง
  const apiResponse = await fetch(`${apiUrl}/auth/switch`, {
    method: 'POST',
    headers: {
      Cookie: `${ACCESS_COOKIE}=${accessToken}`,
    },
    cache: 'no-store',
  });

  const responseBody = (await apiResponse.json()) as
    | SwitchResponse
    | ApiError;

  if (!apiResponse.ok) {
    return NextResponse.json(responseBody, {
      status: apiResponse.status,
    });
  }

  const result = responseBody as SwitchResponse;

  await writeSession({
    accessToken: result.accessToken,
    refreshToken: readRefreshToken(apiResponse),
    user: result.user,
  });

  return NextResponse.json({
    user: result.user,
  });
}
