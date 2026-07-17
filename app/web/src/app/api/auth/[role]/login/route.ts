import { NextResponse } from 'next/server';

import {
  type SessionUser,
  readRefreshToken,
  writeSession,
} from '@/lib/session';

const ROLES = ['user', 'admin'] as const;

type Role = (typeof ROLES)[number];

function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
}

interface ApiError {
  message?: string | string[];
}

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

  const apiUrl = process.env.API_INTERNAL_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { message: 'API_INTERNAL_URL is not configured' },
      { status: 500 },
    );
  }

  const body: unknown = await request.json();

  const apiResponse = await fetch(
    `${apiUrl}/auth/${role}/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );

  const responseBody = (await apiResponse.json()) as
    | LoginResponse
    | ApiError;

  if (!apiResponse.ok) {
    return NextResponse.json(responseBody, {
      status: apiResponse.status,
    });
  }

  const result = responseBody as LoginResponse;

  await writeSession({
    accessToken: result.accessToken,
    refreshToken: readRefreshToken(apiResponse),
    user: result.user,
  });

  return NextResponse.json({
    user: result.user,
  });
}
