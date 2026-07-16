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

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema))
    input: LoginInput,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.authService.login(input);

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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @Res({ passthrough: true })
    response: Response,
  ) {
    response.clearCookie(
      REFRESH_COOKIE,
      this.refreshCookieOptions(),
    );
  }

  private refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}