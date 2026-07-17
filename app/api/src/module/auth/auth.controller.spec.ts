import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
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

    it('should return both tokens in the body', async () => {
      mockLogin([Permission.USER]);

      const result = await controller.loginUser(credentials);

      // ไม่ตั้ง cookie เอง ผู้เรียกเป็นคนตัดสินใจว่าจะเก็บยังไง
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
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

      await controller.loginUser(credentials);

      expect(authServiceMock.login).toHaveBeenCalledWith(
        credentials,
        [Permission.USER],
      );
    });

    it('should ask the service to sign an admin role on admin login', async () => {
      // เคสที่เคยพัง: role ถูกทับแค่ใน response body ส่วน token ยังเป็น user
      mockLogin([Permission.ADMIN]);

      const result = await controller.loginAdmin(credentials);

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
    it('should return the rotated tokens in the body', async () => {
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

      const result = await controller.refresh(requestMock);

      expect(authServiceMock.refresh).toHaveBeenCalledWith(
        'old-refresh-token',
      );

      // refresh token ตัวใหม่ต้องกลับไปด้วย ตัวเก่าถูก revoke ไปแล้ว
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
      });
    });

    it('should throw when refresh cookie is missing', async () => {
      const requestMock = {
        cookies: {},
      } as unknown as Request;

      await expect(
        controller.refresh(requestMock),
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
      await controller.switch(currentUser);

      expect(authServiceMock.switch).toHaveBeenCalledWith(
        currentUser,
      );
      expect(authServiceMock.refresh).not.toHaveBeenCalled();
    });

    it('should return the rotated refresh token so the new role survives a refresh', async () => {
      const result = await controller.switch(currentUser);

      expect(result).toEqual({
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
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      const requestMock = {
        cookies: {
          [REFRESH_COOKIE]: 'refresh-token',
        },
      } as unknown as Request;

      await controller.logout(requestMock);

      // ลบ cookie เป็นหน้าที่ผู้เรียก ที่นี่ revoke ตัว token จริง
      expect(authServiceMock.logout).toHaveBeenCalledWith(
        'refresh-token',
      );
    });

    it('should stay quiet when there is no refresh token', async () => {
      const requestMock = {
        cookies: {},
      } as unknown as Request;

      await expect(
        controller.logout(requestMock),
      ).resolves.toBeUndefined();

      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });
});
