import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">

      <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.25),transparent_45%)]" />

        <div className="relative flex h-full items-end p-16">
          <div className="max-w-lg">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-slate-500">
              Free Concert Tiket Register
            </p>

            <h2 className="text-4xl font-semibold leading-tight text-slate-800">
              สมัครสมาชิกเพื่อจองที่นั่ง
            </h2>

            <p className="mt-5 text-md leading-8 text-slate-500">
              บัญชีแรกที่สมัครในระบบจะได้รับสิทธิ์ Admin + User โดยอัตโนมัติ<br/>
              บัญชีที่ 2 ที่สมัครในระบบจะได้รับสิทธิ์ Admin โดยอัตโนมัติ<br/>
              หลังจากนั้นจะได้รับสิทธิ์ User โดยอัตโนมัติ
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <RegisterForm />
      </section>
    </main>
  );
}