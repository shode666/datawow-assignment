import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { DATABASE } from '@/infra/database/database.constants';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const dbMock = {
    select: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };

      return config[key];
    }),
  };

  const user = {
    id: 'user-id',
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Admin User',
    permissions: [1, 2],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DATABASE,
          useValue: dbMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);

    jest.clearAllMocks();
  });

  function mockDatabaseResult<T>(result: T[]) {
    const limit = jest.fn().mockResolvedValue(result);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });

    dbMock.select.mockReturnValue({ from });

    return {
      from,
      where,
      limit,
    };
  }

  describe('login', () => {
    it('should return access token, refresh token and user', async () => {
      mockDatabaseResult([user]);

      jest
        .mocked(bcrypt.compare)
        .mockResolvedValue(true as never);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          permissions: user.permissions,
        },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password123!',
        user.passwordHash,
      );

      expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw when user is not found', async () => {
      mockDatabaseResult([]);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('should throw when password is invalid', async () => {
      mockDatabaseResult([user]);

      jest
        .mocked(bcrypt.compare)
        .mockResolvedValue(false as never);

      await expect(
        service.login({
          email: user.email,
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should verify refresh token and issue new tokens', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: user.permissions,
        type: 'refresh',
      });

      mockDatabaseResult([user]);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
      });

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
        'old-refresh-token',
        {
          secret: 'refresh-secret',
        },
      );
    });

    it('should throw when refresh token is invalid', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(
        new Error('invalid token'),
      );

      await expect(
        service.refresh('invalid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject access token used as refresh token', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: user.permissions,
        type: 'access',
      });

      await expect(
        service.refresh('access-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token user no longer exists', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: user.permissions,
        type: 'refresh',
      });

      mockDatabaseResult([]);

      await expect(
        service.refresh('refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});