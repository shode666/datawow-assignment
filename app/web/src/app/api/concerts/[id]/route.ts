import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import { readSession } from '@/lib/session';
import { ACCESS_COOKIE } from '@/lib/api-cookie';
import { toNextResponse } from '@/lib/api-response';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }

  const { id } = await params;
  const result = await callApi(`/concerts/${id}`, {
    method: 'DELETE',
    cookie: `${ACCESS_COOKIE}=${session.accessToken}`,
  });

  return toNextResponse(result);
}
