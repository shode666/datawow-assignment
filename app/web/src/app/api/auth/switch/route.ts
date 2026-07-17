import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import {
  type SessionUser,
  readSession,
  writeSession,
} from '@/lib/session';
import { ACCESS_COOKIE } from '@/lib/api-cookie';

type SwitchResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
};

export async function POST() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json(
      { message: 'Not signed in' },
      { status: 401 },
    );
  }

  const result = await callApi<SwitchResponse>(
    '/auth/switch',
    { cookie: `${ACCESS_COOKIE}=${session.accessToken}` },
  );

  if (!result.ok) {
    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const switched = result.body as SwitchResponse;

  await writeSession({
    accessToken: switched.accessToken,
    refreshToken: switched.refreshToken,
    user: switched.user,
  });

  return NextResponse.json({ user: switched.user });
}
