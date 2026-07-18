import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import { readSession } from '@/lib/session';
import { ACCESS_COOKIE } from '@/lib/api-cookie';
import { toNextResponse } from '@/lib/api-response';

/** จอง/ยกเลิกใช้ concertId จาก path เท่านั้น — user มาจาก access token ฝั่ง NestJS */
async function forward(
  id: string,
  method: 'POST' | 'DELETE',
): Promise<NextResponse> {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }

  const result = await callApi(`/concerts/${id}/reservations`, {
    method,
    cookie: `${ACCESS_COOKIE}=${session.accessToken}`,
  });

  return toNextResponse(result);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forward(id, 'POST');
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forward(id, 'DELETE');
}
