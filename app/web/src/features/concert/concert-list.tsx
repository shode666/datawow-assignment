'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Empty, InputNumber, Popconfirm, Space, Spin } from 'antd';

import apiFetch from '@/lib/api-fetch';
import type { Concert, ConcertListResponse } from '@/lib/concert';
import ConcertInfoBox from './concert-info-box';

/** หน้า user: reuse ConcertInfoBox แล้วเสียบปุ่ม Reserve/Cancel ตาม myReservation */
export default function ConcertList() {
  const { message } = App.useApp();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // จำนวนที่นั่งที่เลือกไว้ต่อคอนเสิร์ต (ยังไม่กด Reserve) — default 1
  const [seatById, setSeatById] = useState<Record<string, number>>({});

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleReserve = async (id: string, seat: number) => {
    setPendingId(id);
    try {
      const res = await apiFetch(`/api/concerts/${id}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat }),
      });
      if (!res.ok) {
        message.error('Failed to reserve');
        return;
      }
      message.success('Reserve successfully');
      await load(); // reload เพื่อให้ reservedSeat/myReservation ตรงจริง
    } finally {
      setPendingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setPendingId(id);
    try {
      const res = await apiFetch(`/api/concerts/${id}/reservations`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        message.error('Failed to cancel');
        return;
      }
      message.success('Cancel successfully');
      await load();
    } finally {
      setPendingId(null);
    }
  };

  const renderAction = (concert: Concert) => {
    if (concert.myReservation === 'reserved') {
      return (
        <Popconfirm
          title="Cancel this reservation?"
          okText="Cancel reservation"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleCancel(concert.id)}
        >
          <Button danger type="primary" loading={pendingId === concert.id}>
            Cancel
          </Button>
        </Popconfirm>
      );
    }

    const available = concert.totalSeat - concert.reservedSeat;
    const isFull = available <= 0;
    // clamp จำนวนที่เลือกให้ไม่เกินที่ว่าง (backend ก็เช็คซ้ำอีกชั้น)
    const seat = Math.min(seatById[concert.id] ?? 1, Math.max(available, 1));

    return (
      <Space>
        <InputNumber
          min={1}
          max={available || 1}
          value={seat}
          disabled={isFull || pendingId === concert.id}
          onChange={(value) =>
            setSeatById((prev) => ({ ...prev, [concert.id]: value ?? 1 }))
          }
        />
        <Button
          type="primary"
          disabled={isFull}
          loading={pendingId === concert.id}
          onClick={() => handleReserve(concert.id, seat)}
        >
          {isFull ? 'Full' : 'Reserve'}
        </Button>
      </Space>
    );
  };

  return (
    <Spin spinning={loading}>
      {!loading && concerts.length === 0 ? (
        <Empty description="No concerts available" />
      ) : (
        <div className="flex flex-col gap-4">
          {concerts.map((concert) => (
            <ConcertInfoBox key={concert.id} concert={concert}>
              {renderAction(concert)}
            </ConcertInfoBox>
          ))}
        </div>
      )}
    </Spin>
  );
}
