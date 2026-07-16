'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Typography,
} from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  registerSchema,
  type RegisterInput,
} from './register.zod';

const { Paragraph, Text, Title } = Typography;

type ErrorResponse = {
  message?: string | string[];
};

export function RegisterForm() {
  const router = useRouter();

  const [serverError, setServerError] =
    useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (input: RegisterInput) => {
    setServerError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: input.fullName,
          email: input.email,
          password: input.password,
        }),
      });

      const rawBody = await response.text();

      let result: ErrorResponse = {};

      if (rawBody) {
        try {
          result = JSON.parse(rawBody) as ErrorResponse;
        } catch {
          result = {
            message: rawBody,
          };
        }
      }

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message.join(', ')
          : result.message;

        setServerError(
          message ?? 'ไม่สามารถสมัครสมาชิกได้',
        );

        return;
      }

      router.replace('/login?registered=true');
    } catch (error) {
      console.error('Register error:', error);

      setServerError(
        'ไม่สามารถเชื่อมต่อกับระบบได้',
      );
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <Text className="text-sm uppercase tracking-[0.24em] text-slate-500">
          Create account
        </Text>

        <Title level={1} className="!mb-2 !mt-3">
          สมัครสมาชิก
        </Title>

        <Paragraph className="!mb-0 text-slate-500">
          สร้างบัญชีเพื่อเริ่มใช้งานระบบ
        </Paragraph>
      </div>

      {serverError && (
        <Alert
          className="mb-5"
          type="error"
          title={serverError}
          showIcon
        />
      )}

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        requiredMark={false}
      >
        <Controller
          name="fullName"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="ชื่อ"
              validateStatus={
                fieldState.error ? 'error' : undefined
              }
              help={fieldState.error?.message}
            >
              <Input
                {...field}
                size="large"
                prefix={<UserOutlined />}
                placeholder="ชื่อของคุณ"
                autoComplete="name"
              />
            </Form.Item>
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="อีเมล"
              validateStatus={
                fieldState.error ? 'error' : undefined
              }
              help={fieldState.error?.message}
            >
              <Input
                {...field}
                size="large"
                prefix={<MailOutlined />}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </Form.Item>
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="รหัสผ่าน"
              validateStatus={
                fieldState.error ? 'error' : undefined
              }
              help={fieldState.error?.message}
            >
              <Input.Password
                {...field}
                size="large"
                prefix={<LockOutlined />}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                autoComplete="new-password"
              />
            </Form.Item>
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="ยืนยันรหัสผ่าน"
              validateStatus={
                fieldState.error ? 'error' : undefined
              }
              help={fieldState.error?.message}
            >
              <Input.Password
                {...field}
                size="large"
                prefix={<LockOutlined />}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                autoComplete="new-password"
              />
            </Form.Item>
          )}
        />

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isSubmitting}
          className="mt-2"
        >
          สมัครสมาชิก
        </Button>
      </Form>

      <div className="mt-6 text-center">
        <Text type="secondary">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="font-medium">
            เข้าสู่ระบบ
          </Link>
        </Text>
      </div>
    </div>
  );
}