'use client';

import { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SyncOutlined,
  HomeOutlined,
  LogoutOutlined,
  InboxOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Menu,
  Typography,
} from 'antd';
import { navigationRoutes } from '@/config/navigation';
import {
  modeHome,
  type ViewMode,
} from '@/config/routes';
import apiFetch from '@/lib/api-fetch';

const { Text, Title } = Typography;

type User = {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
};

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
};

type AppShellProps = {
  user: User|null;
  children: React.ReactNode;
};

export function AppShell({
  children,
  user,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switching, setSwitching] = useState(false);

  // role ที่สวมอยู่จริงมาจาก token ไม่ใช่จาก URL ที่เปิดค้างไว้
  const activeMode: ViewMode = user?.permissions.includes(2)
    ? 'admin'
    : 'user';

  const currentRoute =
  navigationRoutes.find((route) =>
    route.match(pathname),
  ) ?? navigationRoutes[0];

  const selectedKey = currentRoute.key;

  const menuItems = useMemo(() => {
  const items: MenuItem[] = navigationRoutes
    .filter((route) => route.mode === activeMode)
    .map((route) => ({
      key: route.key,
      icon: route.icon,
      label: route.label,
    }));

    items.push({
      key: '/switch',
      icon: <SyncOutlined spin={switching} />,
      disabled: switching,
      label:
        activeMode === 'admin'
          ? 'Switch to User'
          : 'Switch to Admin',
    });

  return items;
}, [activeMode, switching]);

  const switchRole = async () => {
    if (switching) {
      return;
    }

    try {
      setSwitching(true);

      // apiFetch: ถ้า access token หมดอายุจะ refresh แล้วยิงซ้ำให้เอง
      const response = await apiFetch('/api/auth/switch', {
        method: 'POST',
      });

      if (!response.ok) {
        return;
      }

      const nextMode: ViewMode =
        activeMode === 'admin' ? 'user' : 'admin';

      // ต้องสลับ token ให้เสร็จก่อนค่อยเข้าหน้าใหม่ ไม่งั้นโดน layout guard เตะกลับ
      router.push(modeHome[nextMode]);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  const handleMenuClick = ({ key }: {key: string}) => {
      if (key === '/switch') {
        void switchRole();
        setDrawerOpen(false);

        return;
      }
      router.push(key);
      setDrawerOpen(false);
  };
  const logout = async () => {
    try {
      setLoggingOut(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      router.replace('/role-select');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const menu = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <Title
          level={4}
          className="mb-1!"
        >
          Application
        </Title>

        {user && (
          <>
            <Text className="block">
              {user.fullName}
            </Text>

            <Text
              type="secondary"
              className="block text-xs"
            >
              {user.email}
            </Text>
          </>
        )}
      </div>

      <div className="flex-1 py-3">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </div>

      <div className="border-t border-slate-200 p-4">
        <Button
          type="text"
          danger
          block
          loading={loggingOut}
          icon={<LogoutOutlined />}
          onClick={logout}
          className="flex! justify-start!"
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white md:block">
        {menu}
      </aside>

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={280}
        styles={{
          body: {
            padding: 0,
          },
        }}
        title={null}
      >
        {menu}
      </Drawer>

      <div className="md:pl-64">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 md:px-6">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
            className="md:hidden!"
            aria-label="Open navigation"
          />

          <span className="ml-2 font-medium md:ml-0">
            {currentRoute.label}
          </span>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}