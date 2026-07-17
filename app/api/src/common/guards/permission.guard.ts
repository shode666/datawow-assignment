import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import type { PermissionValue } from '../constants/permission.constant';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

/**
 * ตอบว่า "token นี้กำลังสวมหมวกอะไร" — ต้องรันหลัง JwtAuthGuard เสมอ
 * เพราะอ่าน request.user ที่ guard ตัวนั้นแปะไว้
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      PermissionValue[]
    >(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const granted = request.user?.permissions ?? [];
    const allowed = required.some((permission) =>
      granted.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Insufficient permission',
      );
    }

    return true;
  }
}
