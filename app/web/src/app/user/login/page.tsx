import { redirect } from 'next/navigation';

import { AuthLayout } from '@/features/auth/auth-layout';
import { LoginForm } from '@/features/auth/login-form';
import { readSession } from '@/lib/session';

export default async function UserLoginPage() {
  if (await readSession()) {
    redirect('/list');
  }

  return (
    <AuthLayout
      eyebrow="Free Concert Ticket"
      heading="เข้าสู่ระบบเพื่อจองที่นั่ง"
      description={
        <p>
          เข้าใช้งานในระดับ User สำหรับจองที่นั่งคอนเสิร์ต
          <br />
          สลับไปใช้งานระดับ Admin ได้ภายหลังจากในเมนู
        </p>
      }
    >
      <LoginForm role="user" />
    </AuthLayout>
  );
}
