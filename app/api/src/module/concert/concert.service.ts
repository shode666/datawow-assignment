import { DATABASE } from '@/infra/database/database.constants';
import type { AppDatabase } from '@/infra/database/database.types';
import { concerts, reservations } from '@/infra/database/schema';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateConcertInput } from './dto/create-concert.zod';
import { and, desc, eq, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { UpdateConcertInput } from './dto/update-concert.zod';
import { ListConcertInput } from './dto/list-concert.zod';
import { ConcertListCacheService } from './concert-list-cache.service';

/** shape ที่ list() คืน — ใช้ typing ทั้ง DB path และ cache path ให้ตรงกัน */
type ConcertListResult = {
  data: {
    id: string;
    name: string;
    description: string | null;
    totalSeat: number;
    reservedSeat: number;
    version: number;
    createdAt: Date;
    myReservation: 'reserved' | 'cancelled' | null;
  }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ConcertService {
  private readonly logger = new Logger(ConcertService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,
    private readonly cache: ConcertListCacheService,
  ) {}

  async create(input: CreateConcertInput, createdBy: string) {
    this.logger.log('Enter cconcert service : create ');
    const [concert] = await this.db
      .insert(concerts)
      .values({ ...input, createdBy })
      .returning();

    await this.cache.invalidate(); // list มีคอนเสิร์ตใหม่แล้ว
    return concert;
  }

  async softDelete(id: string) {
    const [deleted] = await this.db
      .update(concerts)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(eq(concerts.id, id), eq(concerts.status, 'active')))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Concert not found or already deleted');
    }

    await this.cache.invalidate(); // คอนเสิร์ตหายจาก list แล้ว
    return deleted;
  }

  async update(id: string, input: UpdateConcertInput) {
    const { version, ...fields } = input;

    let updated;
    try {
      [updated] = await this.db
        .update(concerts)
        .set({
          ...fields,
          version: sql`${concerts.version} + 1`, // bump version
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(concerts.id, id),
            eq(concerts.status, 'active'),
            eq(concerts.version, version), // ← optimistic lock
          ),
        )
        .returning();
    } catch (err) {
      // 23514 check_violation ลด totalSeat ต่ำกว่า reserved (400)ge
      if ((err as { code?: string }).code === '23514') {
        throw new BadRequestException(
          'totalSeat cannot be lower than reserved seats',
        );
      }
      throw err;
    }

    if (updated) return updated;

    // 0 แถว — แยกว่า "ไม่มี/ลบแล้ว" (404) หรือ "version ชน" (409)
    const existing = await this.db.query.concerts.findFirst({
      where: and(eq(concerts.id, id), eq(concerts.status, 'active')),
    });
    if (!existing) throw new NotFoundException('Concert not found or deleted');
    throw new ConflictException('Concert was modified by someone else');
  }
  async list(
    userId: string,
    { page, pageSize }: ListConcertInput,
  ): Promise<ConcertListResult> {
    const cached = await this.cache.read<ConcertListResult>(
      userId,
      page,
      pageSize,
    );
    if (cached) {
      return cached;
    }

    const offset = (page - 1) * pageSize;

    const data = await this.db
      .select({
        id: concerts.id,
        name: concerts.name,
        description: concerts.description,
        totalSeat: concerts.totalSeat,
        reservedSeat: concerts.reservedSeat, // ← frontend ใช้เช็ค "Full"
        version: concerts.version, // ← ต้องส่งไปให้ update ใช้
        createdAt: concerts.createdAt,
        myReservation: reservations.status, // 'reserved' | null
      })
      .from(concerts)
      .leftJoin(
        reservations,
        and(
          eq(reservations.concertId, concerts.id),
          eq(reservations.userId, userId), // ⚠️ อยู่ใน ON ไม่ใช่ WHERE
          eq(reservations.status, 'reserved'),
        ),
      )
      .where(eq(concerts.status, 'active'))
      .orderBy(desc(concerts.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(concerts)
      .where(eq(concerts.status, 'active'));

    const result: ConcertListResult = {
      data,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    };

    await this.cache.write(userId, page, pageSize, result);
    return result;
  }

  /**
   * สถิติ 3 การ์ด (admin dashboard)
   * - totalSeats / totalReserved — SUM จาก concerts ที่ยัง active เท่านั้น
   *   (คอนเสิร์ตที่ soft-delete ไม่นับ ตาม decision log)
   * - totalCancelled — นับแบบ distinct (concert, user) ไม่ใช่ทุกแถวที่ยกเลิก
   *   (คน ๆ เดียวจอง/ยกเลิกคอนเสิร์ตเดิมหลายรอบ = นับ 1)
   *   และตัด pair ที่ปัจจุบันกลับมาจองอยู่ (มีแถว status='reserved') ออก
   */
  async stats() {
    const [seats] = await this.db
      .select({
        totalSeats: sql<number>`coalesce(sum(${concerts.totalSeat}), 0)::int`,
        totalReserved: sql<number>`coalesce(sum(${concerts.reservedSeat}), 0)::int`,
      })
      .from(concerts)
      .where(eq(concerts.status, 'active'));

    // subquery: pair (concert, user) นี้ยังมีการจอง active อยู่ไหม
    const activeReservation = alias(reservations, 'active_reservation');
    const [{ totalCancelled }] = await this.db
      .select({
        totalCancelled: sql<number>`count(distinct (${reservations.concertId}, ${reservations.userId}))::int`,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'cancelled'),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(activeReservation)
              .where(
                and(
                  eq(activeReservation.concertId, reservations.concertId),
                  eq(activeReservation.userId, reservations.userId),
                  eq(activeReservation.status, 'reserved'),
                ),
              ),
          ),
        ),
      );

    return {
      totalSeats: seats.totalSeats,
      totalReserved: seats.totalReserved,
      totalCancelled,
    };
  }
}
