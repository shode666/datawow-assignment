import { NextResponse } from 'next/server';

import { callApi } from '@/lib/api';
import { clearSession, readSession } from '@/lib/session';
import { REFRESH_COOKIE } from '@/lib/api-cookie';

export async function POST() {
  const session = await readSession();

  // บอก NestJS ให้ revoke ก่อน ไม่งั้นลบแค่ cookie ฝั่งเรา token ยังใช้ได้อยู่
  if (session) {
    try {
      await callApi('/auth/logout', {
        cookie: `${REFRESH_COOKIE}=${session.refreshToken}`,
      });
    } catch (error) {
      // ล้าง session ฝั่งเราต่อไป ผู้ใช้ต้อง logout ได้เสมอ
      console.error('Logout revoke failed:', error);
    }
  }

  await clearSession();

  return NextResponse.json({ success: true });
}
