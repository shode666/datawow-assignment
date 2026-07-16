'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LockOutlined,
  MailOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Input,
  Typography,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  loginSchema,
  type LoginInput,
} from './login.zod';

const { Title, Text } = Typography;

interface ErrorResponse {
  message?: string | string[];
}

function resolveErrorMessage(error: ErrorResponse): string {
  if (Array.isArray(error.message)) {
    return error.message.join(', ');
  }

  return error.message ?? 'ไม่สามารถเข้าสู่ระบบได้';
}

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (input: LoginInput) => {
    setServerError(undefined);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const result = (await response.json()) as ErrorResponse;

      if (!response.ok) {
        setServerError(resolveErrorMessage(result));
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setServerError('ไม่สามารถเชื่อมต่อกับระบบได้');
    }
  };

  return (
    <Card
      className="w-full max-w-md shadow-xl"
      styles={{
        body: {
          padding: 32,
        },
      }}
    >
      <div className="mb-8 text-center">
        <Title
          level={2}
          className="!mb-2"
        >
          Sign in
        </Title>

        <Text type="secondary">
          Enter your account information
        </Text>
      </div>

      {serverError && (
        <Alert
          className="mb-5"
          type="error"
          title={serverError}
          showIcon
        />
      )}

      <form
        className="space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium"
          >
            Email
          </label>

          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="email"
                size="large"
                autoComplete="email"
                placeholder="name@example.com"
                prefix={<MailOutlined />}
                status={errors.email ? 'error' : undefined}
              />
            )}
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium"
          >
            Password
          </label>

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                id="password"
                size="large"
                autoComplete="current-password"
                placeholder="Password"
                prefix={<LockOutlined />}
                status={
                  errors.password ? 'error' : undefined
                }
              />
            )}
          />

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isSubmitting}
        >
          Sign in
        </Button>
      </form>
    </Card>
  );
}