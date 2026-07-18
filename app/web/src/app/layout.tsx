import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'Application',
  description: 'Next.js and NestJS application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="th">
          <body>
            <AntdRegistry>{children}</AntdRegistry>
          </body>
        </html>
  );
}