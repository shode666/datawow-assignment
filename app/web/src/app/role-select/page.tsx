import Link from 'next/link';

export default function RoleSelectPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="size-3.5 rounded-full bg-brand" />

          <span className="text-sm font-bold tracking-[0.2em] text-brand">
            BRAND
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            Select Access Level
          </h1>

          <p className="mt-4 text-base text-slate-500">
            เลือกระดับการเข้าใช้งาน บัญชีเดียวเข้าได้ทั้งสองแบบ
            และสลับได้ภายหลัง
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-14">
          <RoleCard
            tone="light"
            title="User"
            description="จองที่นั่งคอนเสิร์ต ดูรายการจองของตัวเอง และยกเลิกการจองได้"
            href="/user/login"
            action="Enter Workspace"
          />

          <RoleCard
            tone="dark"
            title="Administrator"
            description="จัดการรอบคอนเสิร์ต ดูภาพรวมที่นั่งทั้งหมด และตรวจสอบประวัติการจอง"
            href="/admin/login"
            action="Enter Portal"
          />
        </div>
      </main>
    </div>
  );
}

type RoleCardProps = {
  tone: 'light' | 'dark';
  title: string;
  description: string;
  href: string;
  action: string;
};

const toneStyles = {
  light: {
    card: 'border border-slate-200 bg-white text-brand',
    description: 'text-brand/85',
    action: 'bg-brand text-white',
  },
  dark: {
    card: 'bg-brand text-white',
    description: 'text-white/85',
    action: 'bg-white text-brand',
  },
} as const;

function RoleCard({
  tone,
  title,
  description,
  href,
  action,
}: RoleCardProps) {
  const styles = toneStyles[tone];

  return (
    <section
      className={`flex min-h-104 flex-col p-10 ${styles.card}`}
    >
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>

      <p
        className={`mt-6 text-sm leading-6 ${styles.description}`}
      >
        {description}
      </p>

      <Link
        href={href}
        className={`mt-auto flex h-12 items-center justify-center gap-2 text-sm font-semibold transition-opacity hover:opacity-90 ${styles.action}`}
      >
        {action}
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
