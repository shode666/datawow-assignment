import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  type SessionUser,
  USER_COOKIE,
} from '@/lib/session';

export default async function UserOnlyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get(USER_COOKIE)?.value;

  if (!rawUser) {
    redirect('/role-select');
  }

  let user: SessionUser;

  try {
    user = JSON.parse(decodeURIComponent(rawUser)) as SessionUser;
  } catch {
    redirect('/role-select');
  }

  const isUser = user.permissions.includes(1);

  if (!isUser) {
    redirect('/admin');
  }

  return children;
}
