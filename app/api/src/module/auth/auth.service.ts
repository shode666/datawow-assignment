import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

import { DATABASE } from '@/infra/database/database.constants';
import type { AppDatabase } from '@/infra/database/database.types';
import { users } from '@/infra/database/schema/users.schema';
import type { LoginInput } from './dto/login.zod';
import type { RegisterInput } from './dto/register.zod';
import type { TokenPayload } from './types/token-payload.type';
import { Permission } from '@/common/constants/permission.constant';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginInput, permissions: number[]) {
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
      permissions,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        permissions,
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

    // คง role ที่ switch ไว้ ไม่อ่านจาก DB ไม่งั้น role เด้งกลับทุกครั้งที่ refresh
    return this.issueTokens({
      sub: user.id,
      email: user.email,
      permissions: payload.permissions,
    });
  }

  async switch(token: string) {
    let payload: TokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<TokenPayload>(
          token,
          {
            secret: this.config.getOrThrow<string>(
              'JWT_ACCESS_SECRET',
            ),
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Invalid token',
      );
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException(
        'Invalid type',
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

    // พลิก role จาก token ปัจจุบัน ไม่ใช่จาก DB เพราะ DB เก็บ capability ไม่ใช่ role ที่สวมอยู่
    const newPermissions = payload.permissions.includes(
      Permission.ADMIN,
    )
      ? [Permission.USER]
      : [Permission.ADMIN];

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      permissions: newPermissions,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        permissions: newPermissions,
      },
    };
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

  async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 12);

    return this.db.transaction(async (tx) => {
      // ป้องกัน request สมัครพร้อมกันแล้วกลายเป็น admin มากกว่า 1 คน
      await tx.execute(
        sql`select pg_advisory_xact_lock(918273645)`,
      );

      const [existingUser] = await tx
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        throw new ConflictException(
          'Email is already registered',
        );
      }

      const permissions = [Permission.USER];

      const [createdUser] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          fullName: input.fullName.trim(),
          permissions,
        })
        .returning({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          permissions: users.permissions,
          createdAt: users.createdAt,
        });

      if (!createdUser) {
        throw new InternalServerErrorException(
          'Unable to create user',
        );
      }

      return createdUser;
    });
  }
}