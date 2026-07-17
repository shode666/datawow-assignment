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

const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

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

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  async switch(
    @Req() request: Request,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const accessToken = request.cookies?.[ACCESS_COOKIE];

    if (!accessToken) {
      throw new UnauthorizedException(
        'Access token is missing',
      );
    }

    const result =
      await this.authService.switch(accessToken);

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