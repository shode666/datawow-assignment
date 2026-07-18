import { NextResponse } from 'next/server';

import type { ApiResult } from '@/lib/api';

/**
 * null-body statuses (204/205/304) ห้ามแนบ body
 * ไม่งั้น Response constructor โยน TypeError → route กลายเป็น 500
 */
const NULL_BODY_STATUS = new Set([204, 205, 304]);

/** แปลงผลจาก callApi เป็น NextResponse โดยรักษา status เดิม */
export function toNextResponse<T>(result: ApiResult<T>): NextResponse {
  if (NULL_BODY_STATUS.has(result.status)) {
    return new NextResponse(null, { status: result.status });
  }

  return NextResponse.json(result.body, { status: result.status });
}
