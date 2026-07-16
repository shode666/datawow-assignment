import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';

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

  const accessToken =
    cookieStore.get('access_token')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  const rawUser = cookieStore.get('auth_user')?.value;

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