import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fetch from '@/lib/api-fetch'

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    fullName: string;
    permissions: number[];
  };
}

interface ApiError {
  message?: string | string[];
}

export async function POST(request: Request) {
  const apiUrl = process.env.API_INTERNAL_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { message: 'API_INTERNAL_URL is not configured' },
      { status: 500 },
    );
  }

  const body: unknown = await request.json();

  const apiResponse = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const responseBody = (await apiResponse.json()) as
    | LoginResponse
    | ApiError;

  if (!apiResponse.ok) {
    return NextResponse.json(responseBody, {
      status: apiResponse.status,
    });
  }

  const loginResult = responseBody as LoginResponse;
  const cookieStore = await cookies();

  cookieStore.set('access_token', loginResult.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  cookieStore.set(
    'auth_user',
    JSON.stringify(loginResult.user),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    },
  );

  return NextResponse.json({
    user: loginResult.user,
  });
}