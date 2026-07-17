import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { modeHome } from '@/config/routes';
import {
  type SessionUser,
  REFRESH_COOKIE,
  USER_COOKIE,
} from '@/lib/session';

export default async function RootPage() {
  const cookieStore = await cookies();

  if (!cookieStore.get(REFRESH_COOKIE)) {
    redirect('/role-select');
  }

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

  redirect(
    user.permissions.includes(2)
      ? modeHome.admin
      : modeHome.user,
  );
}
