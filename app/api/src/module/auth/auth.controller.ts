import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  loginSchema,
  type LoginInput,
} from './dto/login.zod';
import { AuthService } from './auth.service';
import { type RegisterInput, registerSchema } from './dto/register.zod';
import { Permission } from '@/common/constants/permission.constant';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { REFRESH_COOKIE } from '@/common/constants/cookie.constant';
import type { VerifiedTokenPayload } from './types/token-payload.type';

/**
 * คืน token ทาง body ไม่เคยตั้ง cookie เอง
 *
 * เพราะ NestJS ไม่ได้คุยกับ browser — มันนั่งหลัง BFF ของ Next.js
 * เรื่อง secure/sameSite/maxAge ขึ้นกับว่า browser ต่อเข้ามายังไง
 * ซึ่งมีแต่ Next.js ที่รู้ NestJS ตั้งไปก็ได้แต่เดา แล้วโดนทิ้งอยู่ดี
 *
 * ขาเข้ายังรับ token ทาง Cookie header ที่ Next.js แนบมาให้
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  async loginUser(
    @Body(new ZodValidationPipe(loginSchema))
    input: LoginInput,
  ) {
    return this.login(input, [Permission.USER]);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(
    @Body(new ZodValidationPipe(loginSchema))
    input: LoginInput,
  ) {
    return this.login(input, [Permission.ADMIN]);
  }

  private async login(
    input: LoginInput,
    permissions: number[],
  ) {
    const result = await this.authService.login(
      input,
      permissions,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  // ไม่มี @Public: JwtAuthGuard เป็นคนตรวจ access token และแปะ payload ให้
  @Post('switch')
  @HttpCode(HttpStatus.OK)
  async switch(
    @CurrentUser() currentUser: VerifiedTokenPayload,
  ) {
    const result =
      await this.authService.switch(currentUser);

    // Rotation: refresh token ตัวใหม่ถือ role ใหม่ ผู้เรียกต้องเก็บทับตัวเก่า
    // ไม่งั้น refresh ครั้งหน้า role เด้งกลับ
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  // access token หมดอายุแล้วถึงต้องมาเรียกตัวนี้ ถ้า guard บล็อกจะต่ออายุไม่ได้เลย
  // ตัวมันเองตรวจ refresh token อยู่แล้วจึงไม่ได้เปิดโล่ง
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request) {
    const refreshToken =
      request.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is missing',
      );
    }

    const tokens =
      await this.authService.refresh(refreshToken);

    // Rotation: ออก refresh token ใหม่ทุกครั้ง ตัวเก่าถูก revoke ไปแล้ว
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
    };
  }

  // ต้อง logout ได้เสมอแม้ access token หมดอายุ ตัวมันเองตรวจ refresh token อยู่แล้ว
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request) {
    const refreshToken =
      request.cookies?.[REFRESH_COOKIE];

    // ลบ cookie อย่างเดียวไม่พอ JWT ที่หลุดไปแล้วยัง valid จนหมดอายุ
    // ผู้เรียกลบ cookie ฝั่งตัวเอง ส่วนที่นี่ revoke ตัว token จริง
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body(new ZodValidationPipe(registerSchema))
    input: RegisterInput,
  ) {
    return this.authService.register(input);
  }
}
