import { AuthLayout } from '@/features/auth/auth-layout';
import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterPage() {
  return (
    <AuthLayout
      eyebrow="Free Concert Ticket Register"
      heading="สมัครสมาชิกเพื่อจองที่นั่ง"
      description={
        <p>
          สมัครครั้งเดียวใช้ได้ทั้งระดับ User และ Admin
          <br />
          เลือกระดับที่ต้องการตอนเข้าสู่ระบบ และสลับได้ภายหลัง
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
