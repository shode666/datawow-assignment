'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Input,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';

import apiFetch from '@/lib/api-fetch';
import type { HistoryEvent, HistoryResponse } from '@/lib/history';

const { Title } = Typography;

const DEFAULT_PAGE_SIZE = 10;

const columns: TableColumnsType<HistoryEvent> = [
  {
    title: 'Date time',
    dataIndex: 'at',
    key: 'at',
    render: (at: string) => new Date(at).toLocaleString(),
  },
  {
    title: 'Username',
    dataIndex: 'userName',
    key: 'userName',
  },
  {
    title: 'Concert name',
    dataIndex: 'concertName',
    key: 'concertName',
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    render: (action: HistoryEvent['action']) =>
      action === 'reserved' ? (
        <Tag color="green">Reserve</Tag>
      ) : (
        <Tag color="red">Cancel</Tag>
      ),
  },
];

export default function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  // ค่าที่กำลังพิมพ์ แยกจากค่าที่ apply แล้ว (กด Search ถึงค่อยยิง query)
  const [concertInput, setConcertInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [concertName, setConcertName] = useState('');
  const [userName, setUserName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (concertName) {
        params.set('concertName', concertName);
      }
      if (userName) {
        params.set('userName', userName);
      }
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await apiFetch(
        `/api/history?${params.toString()}`,
      );

      if (!res.ok) {
        setEvents([]);
        setTotal(0);
        return;
      }

      const body = (await res.json()) as HistoryResponse;
      setEvents(body.data);
      setTotal(body.total);
    } finally {
      setLoading(false);
    }
  }, [concertName, userName, page, pageSize]);

  useEffect(() => {
    // โหลดใหม่ทุกครั้งที่ filter/หน้าเปลี่ยน — load() setState หลัง await ตาม flow ปกติ
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const applyFilters = () => {
    setPage(1); // เปลี่ยน filter ต้องกลับหน้าแรก ไม่งั้นค้างหน้าที่ไม่มีข้อมูล
    setConcertName(concertInput.trim());
    setUserName(userInput.trim());
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Title level={3}>History</Title>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search concert name"
          value={concertInput}
          onChange={(e) => setConcertInput(e.target.value)}
          onPressEnter={applyFilters}
          allowClear
          className="sm:max-w-xs"
        />
        <Input
          placeholder="Search username"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onPressEnter={applyFilters}
          allowClear
          className="sm:max-w-xs"
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={applyFilters}
        >
          Search
        </Button>
      </div>

      <Table<HistoryEvent>
        rowKey={(row) => `${row.reservationId}-${row.action}`}
        columns={columns}
        dataSource={events}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
