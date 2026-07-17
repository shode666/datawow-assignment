import { redirect } from 'next/navigation';

import { modeHome } from '@/config/routes';
import { Permission } from '@/config/permission';
import { readSession } from '@/lib/session';

export default async function RootPage() {
  const session = await readSession();

  if (!session) {
    redirect('/role-select');
  }

  redirect(
    session.user.permissions.includes(Permission.ADMIN)
      ? modeHome.admin
      : modeHome.user,
  );
}
