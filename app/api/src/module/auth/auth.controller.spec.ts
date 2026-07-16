import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_REFRESH_EXPIRES_IN: '7d',
      };

      return values[key];
    }),

    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'test',
      };

      return values[key];
    }),
  };

  const responseMock = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should set refresh cookie and return access token', async () => {
      authServiceMock.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions: [1, 2],
        },
      });

      const result = await controller.login(
        {
          email: 'admin@example.com',
          password: 'Password123!',
        },
        responseMock,
      );

      expect(authServiceMock.login).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(responseMock.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/auth',
        }),
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions: [1, 2],
        },
      });
    });
  });

  describe('refresh', () => {
    it('should rotate refresh cookie and return new access token', async () => {
      const requestMock = {
        cookies: {
          refresh_token: 'old-refresh-token',
        },
      } as unknown as Request;

      authServiceMock.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
      });

      const result = await controller.refresh(
        requestMock,
        responseMock,
      );

      expect(authServiceMock.refresh).toHaveBeenCalledWith(
        'old-refresh-token',
      );

      expect(responseMock.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/auth',
        }),
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        tokenType: 'Bearer',
      });
    });

    it('should throw when refresh cookie is missing', async () => {
      const requestMock = {
        cookies: {},
      } as unknown as Request;

      await expect(
        controller.refresh(requestMock, responseMock),
      ).rejects.toThrow(UnauthorizedException);

      expect(authServiceMock.refresh).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear refresh cookie', () => {
      controller.logout(responseMock);

      expect(responseMock.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/auth',
        }),
      );
    });
  });
});