import {
  HomeOutlined,
  InboxOutlined,
} from '@ant-design/icons';

import type { ViewMode } from './routes';

export type NavigationRoute = {
  key: string;
  label: string;
  mode: ViewMode;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
};

export const navigationRoutes: NavigationRoute[] = [
  {
    key: '/list',
    label: 'Home',
    mode: 'user',
    icon: <HomeOutlined />,
    match: (pathname) =>
      pathname === '/list' ||
      pathname.startsWith('/list/'),
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