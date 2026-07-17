import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  loginSchema,
  type LoginInput,
} from './dto/login.zod';
import { AuthService } from './auth.service';
import { type RegisterInput, registerSchema } from './dto/register.zod';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { Permission } from '@/common/constants/permission.constant';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { REFRESH_COOKIE } from '@/common/constants/cookie.constant';
import type { VerifiedTokenPayload } from './types/token-payload.type';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  async loginUser(
    @Body(new ZodValidationPipe(loginSchema))
    input: LoginInput,
    @Res({ passthrough: true })
    response: Response,
  ) {
    return this.login(input, response, [Permission.USER])
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(
    @Body(new ZodValidationPipe(loginSchema))
    input: LoginInput,
    @Res({ passthrough: true })
    response: Response,
  ) {
    return this.login(input, response, [Permission.ADMIN])
  }

  private async login(
    input: LoginInput,
    response: Response,
    permissions: number[],
  ) {
    const result = await this.authService.login(
      input,
      permissions,
    );

    response.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      this.refreshCookieOptions(),
    );
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  // ไม่มี @Public: JwtAuthGuard เป็นคนตรวจ access token และแปะ payload ให้
  @Post('switch')
  @HttpCode(HttpStatus.OK)
  async switch(
    @CurrentUser() currentUser: VerifiedTokenPayload,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const result =
      await this.authService.switch(currentUser);

    // Rotation: refresh token ต้องถือ role ใหม่ด้วย ไม่งั้น refresh ครั้งหน้า role เด้งกลับ
    response.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      this.refreshCookieOptions(),
    );

    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      user: result.user,
    };
  }

  // access token หมดอายุแล้วถึงต้องมาเรียกตัวนี้ ถ้า guard บล็อกจะต่ออายุไม่ได้เลย
  // ตัวมันเองตรวจ refresh token อยู่แล้วจึงไม่ได้เปิดโล่ง
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken =
      request.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is missing',
      );
    }

    const tokens =
      await this.authService.refresh(refreshToken);

    // Rotation: ออก refresh token ใหม่ทุกครั้ง
    response.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      this.refreshCookieOptions(),
    );

    return {
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
    };
  }

  // ต้อง logout ได้เสมอแม้ access token หมดอายุ ตัวมันเองตรวจ refresh token อยู่แล้ว
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken =
      request.cookies?.[REFRESH_COOKIE];

    // ลบ cookie อย่างเดียวไม่พอ JWT ที่หลุดไปแล้วยัง valid จนหมดอายุ
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie(
      REFRESH_COOKIE,
      this.refreshCookieOptions(),
    );
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

  private refreshCookieOptions() {
    const expiresIn = this.config.getOrThrow<string>(
    'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;
    const maxAge = ms(expiresIn);
    if (typeof maxAge !== 'number') {
      throw new Error(
        'JWT_REFRESH_EXPIRES_IN must be a valid duration',
      );
    }
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge
    };
  }



}