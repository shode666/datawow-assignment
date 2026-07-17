import { redirect } from 'next/navigation';

import { Permission } from '@/config/permission';
import { readSession } from '@/lib/session';

export default async function UserOnlyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readSession();

  if (!session) {
    redirect('/role-select');
  }

  if (!session.user.permissions.includes(Permission.USER)) {
    redirect('/admin');
  }

  return children;
}
