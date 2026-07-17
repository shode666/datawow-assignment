import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import {
  type SessionUser,
  writeSession,
} from '@/lib/session';

const ROLES = ['user', 'admin'] as const;

type Role = (typeof ROLES)[number];

function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ role: string }> },
) {
  const { role } = await context.params;

  if (!isRole(role)) {
    return NextResponse.json(
      { message: 'Unknown access level' },
      { status: 404 },
    );
  }

  const result = await callApi<LoginResponse>(
    `/auth/${role}/login`,
    { body: await request.json() },
  );

  if (!result.ok) {
    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const login = result.body as LoginResponse;

  await writeSession({
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    user: login.user,
  });

  return NextResponse.json({ user: login.user });
}
