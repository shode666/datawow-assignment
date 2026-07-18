'use client';

import { App } from 'antd';

import ConcertList from '@/features/concert/concert-list';

export default function ListPage() {
  return (
    <App>
      <div className="mx-auto max-w-5xl">
        <ConcertList />
      </div>
    </App>
  );
}
