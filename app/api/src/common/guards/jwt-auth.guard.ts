import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ACCESS_COOKIE } from '../constants/cookie.constant';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { VerifiedTokenPayload } from '@/module/auth/types/token-payload.type';

/**
 * ตอบว่า "คุณคือใคร" — ตั้งเป็น global guard ใน AppModule
 *
 * อ่าน token จาก cookie เพราะ browser ไม่ได้คุยกับ NestJS ตรงๆ
 * แต่ผ่าน BFF ของ Next.js ที่แนบ cookie มาให้
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const token = request.cookies?.[ACCESS_COOKIE] as
      | string
      | undefined;

    if (!token) {
      throw new UnauthorizedException(
        'Access token is missing',
      );
    }

    let payload: VerifiedTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<VerifiedTokenPayload>(
          token,
          {
            secret: this.config.getOrThrow<string>(
              'JWT_ACCESS_SECRET',
            ),
          },
        );
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    // refresh token ใช้แทน access ไม่ได้ ถึงจะ verify ผ่านก็ตาม
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    request.user = payload;

    return true;
  }
}
