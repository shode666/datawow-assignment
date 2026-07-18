import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import { readSession } from '@/lib/session';
import { ACCESS_COOKIE } from '@/lib/api-cookie';
import type { StatsResponse } from '@/lib/stats';

export async function GET() {
  const session = await readSession();

  // ตอบ 401 ให้ apiFetch ฝั่ง client จับไป refresh แล้วยิงซ้ำเอง
  if (!session) {
    return NextResponse.json(
      { message: 'Not signed in' },
      { status: 401 },
    );
  }

  const result = await callApi<StatsResponse>('/concerts/stats', {
    method: 'GET',
    cookie: `${ACCESS_COOKIE}=${session.accessToken}`,
  });

  return NextResponse.json(result.body, { status: result.status });
}
