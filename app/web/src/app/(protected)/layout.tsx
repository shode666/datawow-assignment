import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { readSession } from '@/lib/session';

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // มี session = ยัง login อยู่ ไม่ต้องสนว่า access token หมดอายุหรือยัง
  // เพราะมันหมดทุก 15 นาทีเป็นเรื่องปกติ api-fetch จะต่ออายุให้เอง
  const session = await readSession();

  if (!session) {
    redirect('/role-select');
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
