import { NextResponse, type NextRequest } from 'next/server';

import { callApi } from '@/lib/api';
import { readSession } from '@/lib/session';
import { ACCESS_COOKIE } from '@/lib/api-cookie';
import type { HistoryResponse } from '@/lib/history';

/** เฉพาะ param ที่ NestJS รู้จัก — ไม่ส่งของแปลกปลอมต่อ */
const FORWARDED = ['concertName', 'userName', 'page', 'pageSize'] as const;

export async function GET(request: NextRequest) {
  const session = await readSession();

  // ตอบ 401 ให้ apiFetch ฝั่ง client จับไป refresh แล้วยิงซ้ำเอง
  if (!session) {
    return NextResponse.json(
      { message: 'Not signed in' },
      { status: 401 },
    );
  }

  const params = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const result = await callApi<HistoryResponse>(
    `/reservations/history${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      cookie: `${ACCESS_COOKIE}=${session.accessToken}`,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
