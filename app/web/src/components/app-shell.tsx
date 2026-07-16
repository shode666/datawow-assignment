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

const { Text, Title } = Typography;

type User = {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
};

type AppShellProps = {
  user: User;
  children: React.ReactNode;
};
type ViewMode = 'user' | 'admin';

export function AppShell({
  children,
  user,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('user');

  const isAdmin = user.permissions.includes(2);

  const menuItems = useMemo(() => {
    const items = []
    if(isAdmin){
      items.push({
        key: '/admin',
        icon: <HomeOutlined />,
        label: 'Home',
      });
      items.push({
        key: '/history',
        icon: <InboxOutlined />,
        label: 'History',
      });
    }else{
      items.push({
        key: '/',
        icon: <HomeOutlined />,
        label: 'Home',
      });
    }

    if (isAdmin) {
      items.push({
        key: '/switch',
        icon: <SyncOutlined />,
        label: viewMode === 'admin'
                ? 'Switch to User'
                : 'Switch to Admin',
      });
    }

    return items;
  }, [isAdmin, viewMode]);

  const handleMenuClick = (info:any) => {
    if (info.key === '/switch') {
      const nextMode: ViewMode =
      viewMode === 'admin' ? 'user' : 'admin';

    setViewMode(nextMode);

    router.push(
      nextMode === 'admin' ? '/admin' : '/',
    );

    setMobileOpen(false);
    }

  };
  const logout = async () => {
    try {
      setLoggingOut(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      router.replace('/login');
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
          className="!mb-1"
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
          selectedKeys={[pathname]}
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
            Home
          </span>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}