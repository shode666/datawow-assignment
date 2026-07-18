'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Spin, Tabs } from 'antd';
import {
  CloseCircleOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';

import apiFetch from '@/lib/api-fetch';
import type { StatsResponse } from '@/lib/stats';
import StatCard, { type StatCardType } from '@/features/concert/stat-card';
import ConcertOverview from '@/features/concert/concert-overview';
import ConcertCreateForm from '@/features/concert/concert-create-form';

const CARDS: StatCardType[] = [
  {
    key: 'totalSeats',
    label: 'Total of seats',
    icon: <UserOutlined />,
    bg: '#2f7fb0',
  },
  {
    key: 'totalReserved',
    label: 'Reserve',
    icon: <TrophyOutlined />,
    bg: '#3aa17e',
  },
  {
    key: 'totalCancelled',
    label: 'Cancel',
    icon: <CloseCircleOutlined />,
    bg: '#e2686a',
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  // bump เพื่อสั่งให้ Overview reload list หลังสร้าง/ลบ
  const [refreshToken, setRefreshToken] = useState(0);

  const loadStats = useCallback(async () => {
    const res = await apiFetch('/api/stats');
    if (!res.ok) {
      return;
    }
    setStats((await res.json()) as StatsResponse);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await loadStats();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadStats]);

  // stats + list เปลี่ยนพร้อมกันทุกครั้งที่ข้อมูลคอนเสิร์ตขยับ
  const refreshData = useCallback(() => {
    void loadStats();
    setRefreshToken((token) => token + 1);
  }, [loadStats]);

  const handleCreated = () => {
    setActiveTab('overview');
    refreshData();
  };

  return (
    <App>
      <div className="mx-auto max-w-5xl">
        <Spin spinning={loading}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CARDS.map((card) => (
              <StatCard
                key={card.key}
                card={card}
                stat={stats && stats[card.key]}
              />
            ))}
          </div>
        </Spin>

        <Tabs
          className="mt-6"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <ConcertOverview
                  refreshToken={refreshToken}
                  onChanged={refreshData}
                />
              ),
            },
            {
              key: 'create',
              label: 'Create',
              children: <ConcertCreateForm onCreated={handleCreated} />,
            },
          ]}
        />
      </div>
    </App>
  );
}
