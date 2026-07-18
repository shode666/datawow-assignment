'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Empty, Popconfirm, Spin } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

import apiFetch from '@/lib/api-fetch';
import type { Concert, ConcertListResponse } from '@/lib/concert';
import ConcertInfoBox from './concert-info-box';


type ConcertOverviewProps = {
  /** เปลี่ยนค่าเพื่อสั่ง reload list (เช่นหลังสร้างคอนเสิร์ตใหม่) */
  refreshToken: number;
  /** เรียกเมื่อลบสำเร็จ ให้ parent ไป refresh stats ต่อ */
  onChanged: () => void;
};

export default function ConcertOverview({
  refreshToken,
  onChanged,
}: ConcertOverviewProps) {
  const { message } = App.useApp();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/concerts?pageSize=100');
      if (!res.ok) {
        setConcerts([]);
        return;
      }
      const body = (await res.json()) as ConcertListResponse;
      setConcerts(body.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // reload ทั้งตอน mount และทุกครั้งที่ refreshToken เปลี่ยน
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshToken]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/concerts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        message.error('Failed to delete concert');
        return;
      }
      message.success('Delete successfully');
      setConcerts((prev) => prev.filter((c) => c.id !== id));
      onChanged();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Spin spinning={loading}>
      {!loading && concerts.length === 0 ? (
        <Empty description="No concerts yet" />
      ) : (
        <div className="flex flex-col gap-4">
          {concerts.map((concert) => (
            <ConcertInfoBox key={concert.id} concert={concert}>
              <Popconfirm
                  title="Delete this concert?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(concert.id)}
                >
                  <Button
                    danger
                    type="primary"
                    icon={<DeleteOutlined />}
                    loading={deletingId === concert.id}
                  >
                    Delete
                  </Button>
                </Popconfirm>
            </ConcertInfoBox>
          ))}
        </div>
      )}
    </Spin>
  );
}
