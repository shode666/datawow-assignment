import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

import { DATABASE } from '@/infra/database/database.constants';
import type { AppDatabase } from '@/infra/database/database.types';
import { users } from '@/infra/database/schema/users.schema';
import type { LoginInput } from './dto/login.zod';
import type { TokenPayload } from './types/token-payload.type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginInput) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordMatched = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        permissions: user.permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<TokenPayload>(
          refreshToken,
          {
            secret: this.config.getOrThrow<string>(
              'JWT_REFRESH_SECRET',
            ),
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(
        'Invalid token type',
      );
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    });
  }

  private async issueTokens(
    user: Omit<TokenPayload, 'type'>,
  ) {
    const accessExpiresIn =
      this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as StringValue;

    const refreshExpiresIn =
      this.config.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...user,
          type: 'access',
        } satisfies TokenPayload,
        {
          secret: this.config.getOrThrow<string>(
            'JWT_ACCESS_SECRET',
          ),
          expiresIn: accessExpiresIn,
        },
      ),

      this.jwtService.signAsync(
        {
          ...user,
          type: 'refresh',
        } satisfies TokenPayload,
        {
          secret: this.config.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
          ),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }
}