import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { VerifiedTokenPayload } from '@/module/auth/types/token-payload.type';

/**
 * ดึง payload ที่ JwtAuthGuard verify มาแล้ว
 *
 * ใช้ตัวนี้เสมอเวลาต้องการ user id — ห้ามรับจาก body หรือ query
 * ไม่งั้นจะจอง/ยกเลิกแทนคนอื่นได้
 */
export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): VerifiedTokenPayload => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
