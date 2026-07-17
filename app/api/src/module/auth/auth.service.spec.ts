import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { DATABASE } from '@/infra/database/database.constants';
import { Permission } from '@/common/constants/permission.constant';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const dbMock = {
    select: jest.fn(),
    insert: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
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
    jest.clearAllMocks();
    dbMock.select.mockReset();
    dbMock.insert.mockReset();
    dbMock.execute.mockReset();
    dbMock.transaction.mockReset();

    jwtServiceMock.signAsync.mockReset();
    jwtServiceMock.verifyAsync.mockReset();

    jest.mocked(bcrypt.compare).mockReset();
    jest.mocked(bcrypt.hash).mockReset();

    dbMock.transaction.mockImplementation(
      async (
        callback: (tx: typeof dbMock) => Promise<unknown>,
      ) => callback(dbMock),
    );
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

      const result = await service.login(
        {
          email: 'admin@example.com',
          password: 'Password123!',
        },
        [Permission.ADMIN],
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          permissions: [Permission.ADMIN],
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
        service.login(
          {
            email: 'missing@example.com',
            password: 'Password123!',
          },
          [Permission.USER],
        ),
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
        service.login(
          {
            email: user.email,
            password: 'WrongPassword!',
          },
          [Permission.USER],
        ),
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

    it('should keep the switched role instead of reading it from the database', async () => {
      // token ถือ role user อยู่ แต่ DB เก็บ [1, 2] — refresh ต้องไม่ดึง role จาก DB มาทับ
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: [Permission.USER],
        type: 'refresh',
      });

      mockDatabaseResult([user]);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      await service.refresh('old-refresh-token');

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [Permission.USER],
          type: 'access',
        }),
        expect.anything(),
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

  describe('switch', () => {
    function mockSwitch(permissions: number[]) {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions,
        type: 'access',
      });

      mockDatabaseResult([user]);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
    }

    it('should switch user to admin', async () => {
      mockSwitch([Permission.USER]);

      const result = await service.switch('access-token');

      expect(result.user.permissions).toEqual([
        Permission.ADMIN,
      ]);

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [Permission.ADMIN],
          type: 'access',
        }),
        expect.anything(),
      );
    });

    it('should switch admin back to user', async () => {
      // เคสที่เคยพัง: อ่าน role จาก DB ทำให้กลับมาเป็น user ไม่ได้
      mockSwitch([Permission.ADMIN]);

      const result = await service.switch('access-token');

      expect(result.user.permissions).toEqual([
        Permission.USER,
      ]);
    });

    it('should return tokens and user like login does', async () => {
      mockSwitch([Permission.USER]);

      const result = await service.switch('access-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          permissions: [Permission.ADMIN],
        },
      });
    });

    it('should reject a refresh token used as access token', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: [Permission.USER],
        type: 'refresh',
      });

      await expect(
        service.switch('refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when the token is invalid', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(
        new Error('invalid token'),
      );

      await expect(
        service.switch('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when the user no longer exists', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        permissions: [Permission.USER],
        type: 'access',
      });

      mockDatabaseResult([]);

      await expect(
        service.switch('access-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a user', async () => {
      const createdUser = {
        id: 'user-id',
        email: 'user@example.com',
        fullName: 'Normal User',
        permissions: [1],
        createdAt: new Date(),
      };

      dbMock.select
        // ตรวจ email ซ้ำ
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        // มี user อยู่แล้ว จึงเป็น user ปกติ
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([
            {
              total: 1,
            },
          ]),
        });

      dbMock.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            createdUser,
          ]),
        }),
      });

      jest
        .mocked(bcrypt.hash)
        .mockResolvedValue('hashed-password' as never);

      const result = await service.register({
        email: 'USER@EXAMPLE.COM',
        password: 'Password123',
        fullName: 'Normal User',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'Password123',
        12,
      );

      expect(result).toEqual(createdUser);
    });

    it('should reject duplicated email', async () => {
      const selectLimit = jest
        .fn()
        .mockResolvedValue([
          {
            id: 'existing-user',
          },
        ]);

      dbMock.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: selectLimit,
          }),
        }),
      });

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'Password123',
          fullName: 'Normal User',
        }),
      ).rejects.toThrow('Email is already registered');
    });
    it('should promote the first user to admin', async () => {
      const createdUser = {
        id: 'first-user-id',
        email: 'admin@example.com',
        fullName: 'First User',
        permissions: [1, 2],
        createdAt: new Date(),
      };

      const existingUserLimit = jest.fn().mockResolvedValue([]);

      const countFrom = jest.fn().mockResolvedValue([
        {
          total: 0,
        },
      ]);

      dbMock.select
        // ครั้งแรก: ตรวจ email ซ้ำ
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: existingUserLimit,
            }),
          }),
        })
        // ครั้งที่สอง: นับจำนวน user
        .mockReturnValueOnce({
          from: countFrom,
        });

      dbMock.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdUser]),
        }),
      });

      const result = await service.register({
        email: 'admin@example.com',
        password: 'Password123',
        fullName: 'First User',
      });

      expect(result.permissions).toEqual([1, 2]);
    });
  });
});