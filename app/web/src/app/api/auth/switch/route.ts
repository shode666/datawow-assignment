import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import {
  ACCESS_COOKIE,
  type SessionUser,
  readRefreshToken,
  writeSession,
} from '@/lib/session';

type SwitchResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
};

export async function POST() {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Access token is missing' },
      { status: 401 },
    );
  }

  const result = await callApi<SwitchResponse>(
    '/auth/switch',
    { cookie: `${ACCESS_COOKIE}=${accessToken}` },
  );

  if (!result.ok) {
    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const switched = result.body as SwitchResponse;

  await writeSession({
    accessToken: switched.accessToken,
    refreshToken: readRefreshToken(result.response),
    user: switched.user,
  });

  return NextResponse.json({ user: switched.user });
}
