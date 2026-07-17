import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  REFRESH_COOKIE,
  clearSession,
} from '@/lib/session';

export async function POST() {
  const apiUrl = process.env.API_INTERNAL_URL;
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get(REFRESH_COOKIE)?.value;

  // บอก Nest ให้ revoke ก่อน ไม่งั้นลบแค่ cookie ฝั่งเรา token ยังใช้ได้อยู่
  if (apiUrl && refreshToken) {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `${REFRESH_COOKIE}=${refreshToken}`,
        },
        cache: 'no-store',
      });
    } catch (error) {
      // ล้าง session ฝั่งเราต่อไป ผู้ใช้ต้อง logout ได้เสมอ
      console.error('Logout revoke failed:', error);
    }
  }

  await clearSession();

  return NextResponse.json({
    success: true,
  });
}
