import { redirect } from 'next/navigation';

import { AuthLayout } from '@/features/auth/auth-layout';
import { LoginForm } from '@/features/auth/login-form';
import { readSession } from '@/lib/session';

export default async function AdminLoginPage() {
  if (await readSession()) {
    redirect('/admin');
  }

  return (
    <AuthLayout
      eyebrow="Free Concert Ticket"
      heading="เข้าสู่ระบบสำหรับผู้ดูแล"
      description={
        <p>
          เข้าใช้งานในระดับ Admin สำหรับจัดการรอบคอนเสิร์ต
          <br />
          สลับไปใช้งานระดับ User ได้ภายหลังจากในเมนู
        </p>
      }
    >
      <LoginForm role="admin" />
    </AuthLayout>
  );
}
