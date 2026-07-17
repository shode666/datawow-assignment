import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';

export async function POST(request: Request) {
  const result = await callApi('/auth/register', {
    body: await request.json(),
  });

  return NextResponse.json(result.body, {
    status: result.status,
  });
}
