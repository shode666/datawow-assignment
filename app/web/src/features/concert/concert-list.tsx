'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Empty, Popconfirm, Spin } from 'antd';

import apiFetch from '@/lib/api-fetch';
import type { Concert, ConcertListResponse } from '@/lib/concert';
import ConcertInfoBox from './concert-info-box';

/** หน้า user: reuse ConcertInfoBox แล้วเสียบปุ่ม Reserve/Cancel ตาม myReservation */
export default function ConcertList() {
  const { message } = App.useApp();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  const handleReserve = async (id: string) => {
    setPendingId(id);
    try {
      const res = await apiFetch(`/api/concerts/${id}/reservations`, {
        method: 'POST',
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

    const isFull = concert.reservedSeat >= concert.totalSeat;

    return (
      <Button
        type="primary"
        disabled={isFull}
        loading={pendingId === concert.id}
        onClick={() => handleReserve(concert.id)}
      >
        {isFull ? 'Full' : 'Reserve'}
      </Button>
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
