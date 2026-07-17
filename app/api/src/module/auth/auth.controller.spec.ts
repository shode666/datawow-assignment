import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Permission } from '@/common/constants/permission.constant';
import { REFRESH_COOKIE } from '@/common/constants/cookie.constant';
import type { VerifiedTokenPayload } from './types/token-payload.type';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    switch: jest.fn(),
    logout: jest.fn(),
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
    const credentials = {
      email: 'admin@example.com',
      password: 'Password123!',
    };

    function mockLogin(permissions: number[]) {
      authServiceMock.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions,
        },
      });
    }

    it('should set refresh cookie and return access token', async () => {
      mockLogin([Permission.USER]);

      const result = await controller.loginUser(
        credentials,
        responseMock,
      );

      expect(responseMock.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
        }),
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions: [Permission.USER],
        },
      });
    });

    it('should ask the service to sign a user role on user login', async () => {
      mockLogin([Permission.USER]);

      await controller.loginUser(credentials, responseMock);

      expect(authServiceMock.login).toHaveBeenCalledWith(
        credentials,
        [Permission.USER],
      );
    });

    it('should ask the service to sign an admin role on admin login', async () => {
      // เคสที่เคยพัง: role ถูกทับแค่ใน response body ส่วน token ยังเป็น user
      mockLogin([Permission.ADMIN]);

      const result = await controller.loginAdmin(
        credentials,
        responseMock,
      );

      expect(authServiceMock.login).toHaveBeenCalledWith(
        credentials,
        [Permission.ADMIN],
      );

      expect(result.user.permissions).toEqual([
        Permission.ADMIN,
      ]);
    });
  });

  describe('refresh', () => {
    it('should rotate refresh cookie and return new access token', async () => {
      const requestMock = {
        cookies: {
          [REFRESH_COOKIE]: 'old-refresh-token',
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
        REFRESH_COOKIE,
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
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

  describe('switch', () => {
    // JwtAuthGuard verify แล้วแปะ payload นี้มาให้ ไม่ต้องอ่าน cookie เอง
    const currentUser: VerifiedTokenPayload = {
      sub: 'user-id',
      email: 'admin@example.com',
      permissions: [Permission.USER],
      type: 'access',
      jti: 'jti-1',
      iat: 0,
      exp: 0,
    };

    beforeEach(() => {
      authServiceMock.switch.mockResolvedValue({
        accessToken: 'switched-access-token',
        refreshToken: 'switched-refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions: [Permission.ADMIN],
        },
      });
    });

    it('should switch using the payload from the guard, not refresh', async () => {
      // เคยพัง: endpoint นี้ก๊อปมาจาก refresh เลยไปเรียก refresh()
      await controller.switch(currentUser, responseMock);

      expect(authServiceMock.switch).toHaveBeenCalledWith(
        currentUser,
      );
      expect(authServiceMock.refresh).not.toHaveBeenCalled();
    });

    it('should rotate the refresh cookie so the new role survives a refresh', async () => {
      const result = await controller.switch(
        currentUser,
        responseMock,
      );

      expect(responseMock.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'switched-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
        }),
      );

      expect(result).toEqual({
        accessToken: 'switched-access-token',
        tokenType: 'Bearer',
        user: {
          id: 'user-id',
          email: 'admin@example.com',
          fullName: 'Admin User',
          permissions: [Permission.ADMIN],
        },
      });
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token and clear the cookie', async () => {
      const requestMock = {
        cookies: {
          [REFRESH_COOKIE]: 'refresh-token',
        },
      } as unknown as Request;

      await controller.logout(requestMock, responseMock);

      // ลบ cookie อย่างเดียวไม่พอ token ต้องถูก revoke ด้วย
      expect(authServiceMock.logout).toHaveBeenCalledWith(
        'refresh-token',
      );

      expect(responseMock.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
        }),
      );
    });

    it('should still clear the cookie when there is no refresh token', async () => {
      const requestMock = {
        cookies: {},
      } as unknown as Request;

      await controller.logout(requestMock, responseMock);

      expect(authServiceMock.logout).not.toHaveBeenCalled();
      expect(responseMock.clearCookie).toHaveBeenCalled();
    });
  });
});