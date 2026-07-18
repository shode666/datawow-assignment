import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS } from '@/infra/redis/redis.constants';

/**
 * cache ของ concert list (per-user เพราะ payload มี myReservation ต่อคน)
 *
 * invalidate ด้วย "version bump" ไม่ใช่ลบ key ทีละอัน:
 * key ผูก version ปัจจุบันไว้ พอ add/delete/reserve/cancel → INCR version
 * → key เวอร์ชันเก่าเข้าไม่ถึงทั้งหมด (ทุก user ทุกหน้า) โดยไม่ต้อง SCAN/KEYS
 * ของเก่าเหลือทิ้งไว้ให้ TTL เก็บกวาดเอง
 *
 * ทุก path fail-open — Redis ล่มต้องตกไปอ่าน DB ได้ ไม่ทำให้ทั้งระบบพัง
 */
@Injectable()
export class ConcertListCacheService {
  private readonly logger = new Logger(ConcertListCacheService.name);

  private readonly VERSION_KEY = 'concerts:list:version';
  /** safety net เก็บกวาด key เวอร์ชันเก่า — ความถูกต้องมาจาก invalidate ไม่ใช่ TTL */
  private readonly TTL_SECONDS = 300;

  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  /** ยังไม่เคย invalidate → ไม่มี key, default '0' เพื่อให้ INCR ครั้งแรก (→1) เปลี่ยน namespace จริง */
  private async currentVersion(): Promise<string> {
    const version = await this.redis.get(this.VERSION_KEY);

    return version ?? '0';
  }

  private key(
    version: string,
    userId: string,
    page: number,
    pageSize: number,
  ): string {
    return `concerts:list:${version}:${userId}:${page}:${pageSize}`;
  }

  async read<T>(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<T | null> {
    try {
      const version = await this.currentVersion();
      const cached = await this.redis.get(
        this.key(version, userId, page, pageSize),
      );

      if (!cached) {
        this.logger.debug(`cache MISS user=${userId} page=${page}`);

        return null;
      }

      this.logger.debug(`cache HIT user=${userId} page=${page}`);

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('cache read failed, falling back to DB', error);

      return null;
    }
  }

  async write<T>(
    userId: string,
    page: number,
    pageSize: number,
    value: T,
  ): Promise<void> {
    try {
      const version = await this.currentVersion();

      await this.redis.setex(
        this.key(version, userId, page, pageSize),
        this.TTL_SECONDS,
        JSON.stringify(value),
      );
    } catch (error) {
      this.logger.error('cache write failed', error);
    }
  }

  /** bump version → cache list ทั้งหมดเข้าไม่ถึง (เรียกหลัง write ที่กระทบ list สำเร็จ) */
  async invalidate(): Promise<void> {
    try {
      await this.redis.incr(this.VERSION_KEY);

      this.logger.debug('concert list cache invalidated');
    } catch (error) {
      this.logger.error('cache invalidate failed', error);
    }
  }
}
