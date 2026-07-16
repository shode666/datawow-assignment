import {
  HomeOutlined,
  InboxOutlined,
} from '@ant-design/icons';

export type ViewMode = 'user' | 'admin';

export type NavigationRoute = {
  key: string;
  label: string;
  mode: ViewMode;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
};

export const navigationRoutes: NavigationRoute[] = [
  {
    key: '/',
    label: 'Home',
    mode: 'user',
    icon: <HomeOutlined />,
    match: (pathname) => pathname === '/',
  },
  {
    key: '/admin',
    label: 'Home',
    mode: 'admin',
    icon: <HomeOutlined />,
    match: (pathname) =>
      pathname === '/admin' ||
      pathname.startsWith('/admin/'),
  },
  {
    key: '/history',
    label: 'History',
    mode: 'admin',
    icon: <InboxOutlined />,
    match: (pathname) =>
      pathname === '/history' ||
      pathname.startsWith('/history/'),
  },
];

export const modeHome: Record<ViewMode, string> = {
  user: '/',
  admin: '/admin',
};