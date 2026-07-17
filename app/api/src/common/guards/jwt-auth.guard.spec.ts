import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { ACCESS_COOKIE } from '../constants/cookie.constant';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(() => 'access-secret'),
  };

  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  const payload = {
    sub: 'user-id',
    email: 'admin@example.com',
    permissions: [1],
    type: 'access',
    jti: 'jti-1',
    iat: 0,
    exp: 0,
  };

  function contextWith(cookies: Record<string, string>) {
    const request = { cookies };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
      __request: request,
    } as unknown as ExecutionContext & {
      __request: { cookies: Record<string, string>; user?: unknown };
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    reflectorMock.getAllAndOverride.mockReturnValue(false);

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: Reflector, useValue: reflectorMock },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  it('should let a valid access token through and attach the payload', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue(payload);

    const context = contextWith({
      [ACCESS_COOKIE]: 'access-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(
      true,
    );

    // controller อ่าน user ต่อจากตรงนี้ ห้ามรับ user id จาก body
    expect(context.__request.user).toEqual(payload);
  });

  it('should skip verification on a public route', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);

    await expect(
      guard.canActivate(contextWith({})),
    ).resolves.toBe(true);

    expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
  });

  it('should reject when the cookie is missing', async () => {
    await expect(
      guard.canActivate(contextWith({})),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject an invalid token', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(
      new Error('invalid token'),
    );

    await expect(
      guard.canActivate(
        contextWith({ [ACCESS_COOKIE]: 'broken' }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a refresh token used as an access token', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      ...payload,
      type: 'refresh',
    });

    await expect(
      guard.canActivate(
        contextWith({ [ACCESS_COOKIE]: 'refresh-token' }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
