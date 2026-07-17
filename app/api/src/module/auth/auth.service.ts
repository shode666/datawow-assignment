import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { StringValue } from 'ms';

import { DATABASE } from '@/infra/database/database.constants';
import type { AppDatabase } from '@/infra/database/database.types';
import { users } from '@/infra/database/schema/users.schema';
import type { LoginInput } from './dto/login.zod';
import type { RegisterInput } from './dto/register.zod';
import type {
  TokenPayload,
  TokenType,
  VerifiedTokenPayload,
} from './types/token-payload.type';
import { Permission } from '@/common/constants/permission.constant';
import { TokenDenylistService } from './token-denylist.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly denylist: TokenDenylistService,
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
    const payload = await this.verifyToken(
      refreshToken,
      'refresh',
    );

    // refresh token ใช้ได้ครั้งเดียว ถ้าถูกใช้ไปแล้วแปลว่ามีคนเอาของเก่ามาเล่นซ้ำ
    if (await this.denylist.isRevoked(payload.jti)) {
      this.logger.warn(
        `Replayed refresh token for user ${payload.sub} (jti ${payload.jti})`,
      );

      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const user = await this.findActiveUser(payload.sub);

    await this.denylist.revoke(payload.jti, payload.exp);

    // คง role ที่ switch ไว้ ไม่อ่านจาก DB ไม่งั้น role เด้งกลับทุกครั้งที่ refresh
    return this.issueTokens({
      sub: user.id,
      email: user.email,
      permissions: payload.permissions,
    });
  }

  async logout(refreshToken: string) {
    let payload: VerifiedTokenPayload;

    try {
      payload = await this.verifyToken(
        refreshToken,
        'refresh',
      );
    } catch {
      // token เสียหรือหมดอายุอยู่แล้ว ไม่มีอะไรให้ revoke ปล่อย logout ผ่านไป
      return;
    }

    await this.denylist.revoke(payload.jti, payload.exp);
  }

  async switch(token: string) {
    const payload = await this.verifyToken(token, 'access');
    const user = await this.findActiveUser(payload.sub);

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

  /**
   * verify + เช็คว่าเป็น token ชนิดที่ต้องการจริง
   * access กับ refresh คนละ secret จึงสลับกันใช้ไม่ได้อยู่แล้ว
   * แต่เช็ค type ซ้ำกันเหนียวไว้เผื่อ secret ถูกตั้งซ้ำกันโดยไม่ตั้งใจ
   */
  private async verifyToken(
    token: string,
    type: TokenType,
  ): Promise<VerifiedTokenPayload> {
    const secret =
      type === 'access'
        ? 'JWT_ACCESS_SECRET'
        : 'JWT_REFRESH_SECRET';

    let payload: VerifiedTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<VerifiedTokenPayload>(
          token,
          {
            secret: this.config.getOrThrow<string>(secret),
          },
        );
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.type !== type) {
      throw new UnauthorizedException('Invalid token type');
    }

    // token ที่ออกก่อนมี jti จะ revoke ไม่ได้ ต้องบังคับ login ใหม่
    // ปล่อยผ่านไม่ได้ เพราะ jti undefined จะทำให้ทุก session ชนกันที่ key เดียว
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    return payload;
  }

  private async findActiveUser(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async issueTokens(
    user: Omit<TokenPayload, 'type' | 'jti'>,
  ) {
    const accessExpiresIn =
      this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as StringValue;

    const refreshExpiresIn =
      this.config.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as StringValue;

    // jti คนละตัวโดยตั้งใจ: denylist เก็บเฉพาะของ refresh
    // ถ้าใช้ร่วมกัน พอ revoke refresh แล้ว access ที่ยังไม่หมดอายุจะโดนไปด้วย
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...user,
          type: 'access',
          jti: randomUUID(),
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
          jti: randomUUID(),
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