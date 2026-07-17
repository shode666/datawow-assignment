import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { PermissionGuard } from './permission.guard';
import { Permission } from '../constants/permission.constant';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;

  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  function contextWith(permissions?: number[]) {
    return {
      switchToHttp: () => ({
        getRequest: () =>
          permissions ? { user: { permissions } } : {},
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        { provide: Reflector, useValue: reflectorMock },
      ],
    }).compile();

    guard = moduleRef.get(PermissionGuard);
  });

  it('should allow a route without @RequirePermission', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(
      undefined,
    );

    expect(
      guard.canActivate(contextWith([Permission.USER])),
    ).toBe(true);
  });

  it('should allow a token wearing the required role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      Permission.ADMIN,
    ]);

    expect(
      guard.canActivate(contextWith([Permission.ADMIN])),
    ).toBe(true);
  });

  it('should reject a token wearing the wrong role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      Permission.ADMIN,
    ]);

    expect(() =>
      guard.canActivate(contextWith([Permission.USER])),
    ).toThrow(ForbiddenException);
  });

  it('should reject when no user was attached', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      Permission.ADMIN,
    ]);

    expect(() => guard.canActivate(contextWith())).toThrow(
      ForbiddenException,
    );
  });
});
