'use client';

import { useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Typography,
} from 'antd';
import { SaveOutlined, UserOutlined } from '@ant-design/icons';

import apiFetch from '@/lib/api-fetch';
import type { ApiError } from '@/lib/api';
import type { CreateConcertInput } from '@/lib/concert';

const { Title } = Typography;
const { TextArea } = Input;

type ConcertCreateFormProps = {
  /** เรียกเมื่อสร้างสำเร็จ ให้ parent สลับไปแท็บ Overview + refresh */
  onCreated: () => void;
};

export default function ConcertCreateForm({
  onCreated,
}: ConcertCreateFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateConcertInput>();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: CreateConcertInput) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/concerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = (await res.json()) as ApiError;
        const detail = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        message.error(detail ?? 'Failed to create concert');
        return;
      }

      message.success('Create successfully');
      form.resetFields();
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-200 p-6">
      <Title level={3} style={{ color: '#1677ff', marginTop: 0 }}>
        Create
      </Title>
      <hr className="mb-6 border-gray-200" />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        initialValues={{}}
      >
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Form.Item
            label="Concert Name"
            name="name"
            rules={[
              { required: true, message: 'Concert Name is required.' },
              { max: 255, message: 'Concert Name must not exceed 255 characters.' },
            ]}
          >
            <Input placeholder="Please input concert name" />
          </Form.Item>

          <Form.Item
            label="Total of seat"
            name="totalSeat"
            rules={[{ required: true, message: 'Total of seat is required.' }]}
          >
            <InputNumber
              className="w-full"
              min={1}
              max={1000}
              addonAfter={<UserOutlined />}
            />
          </Form.Item>
        </div>

        <Form.Item label="Description" name="description">
          <TextArea rows={4} placeholder="Please input description" />
        </Form.Item>

        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={submitting}
          >
            Save
          </Button>
        </div>
      </Form>
    </div>
  );
}
