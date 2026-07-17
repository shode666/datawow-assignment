import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS } from '@/infra/redis/redis.constants';

@Injectable()
export class TokenDenylistService {
  private readonly logger = new Logger(
    TokenDenylistService.name,
  );

  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  private key(jti: string) {
    return `denylist:${jti}`;
  }

  /**
   * TTL = เวลาที่เหลือของ token เอง พอหมดอายุ Redis ลบให้เอง
   * ไม่ต้องมี cleanup job และ denylist ไม่โตไม่มีที่สิ้นสุด
   */
  async revoke(jti: string, exp: number) {
    // กัน key `denylist:undefined` ที่ทุก token ไร้ jti จะใช้ร่วมกันจนชนกันหมด
    if (!jti) {
      this.logger.error(
        'Refused to revoke a token without jti',
      );

      return;
    }

    const ttl = exp - Math.floor(Date.now() / 1000);

    if (ttl <= 0) {
      return;
    }

    try {
      await this.redis.setex(this.key(jti), ttl, '1');
    } catch (error) {
      // fail-open: Redis ล่มไม่ควรทำให้ logout พัง แต่ต้องรู้ว่า revoke ไม่ติด
      this.logger.error(
        `Failed to revoke ${jti}, token stays valid until it expires`,
        error,
      );
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    if (!jti) {
      return true;
    }

    try {
      const found = await this.redis.exists(this.key(jti));

      return found === 1;
    } catch (error) {
      // fail-open: ยอมให้ผ่านดีกว่า login ทั้งระบบพังเพราะ Redis ล่ม
      this.logger.error(
        `Denylist unavailable, allowing ${jti} through`,
        error,
      );

      return false;
    }
  }
}
