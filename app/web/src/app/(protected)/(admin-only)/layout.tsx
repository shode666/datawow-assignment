import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
};

export default async function AdminOnlyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get('auth_user')?.value;

  if (!rawUser) {
    redirect('/login');
  }

  let user: AuthUser;

  try {
    user = JSON.parse(decodeURIComponent(rawUser)) as AuthUser;
  } catch {
    redirect('/login');
  }

  const isAdmin = user.permissions.includes(2);

  if (!isAdmin) {
    redirect('/');
  }

  return children;
}