import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import {
  REFRESH_COOKIE,
  USER_COOKIE,
} from '@/lib/session';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
}

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  // gate ด้วย refresh token: access token หมดอายุทุก 15 นาทีเป็นเรื่องปกติ
  // ไม่ได้แปลว่า logout ตราบใดที่ refresh ยังอยู่ก็ยัง login อยู่
  const refreshToken =
    cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    redirect('/role-select');
  }

  const rawUser = cookieStore.get(USER_COOKIE)?.value;

  let user: AuthUser | null = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      user = null;
    }
  }

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}