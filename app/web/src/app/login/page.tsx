import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (accessToken) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 size-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-96 rounded-full bg-indigo-200/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full justify-center">
        <LoginForm />

      </div>
    </main>
  );
}