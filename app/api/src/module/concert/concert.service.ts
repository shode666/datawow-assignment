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
import { and, desc, eq, sql } from 'drizzle-orm';
import { UpdateConcertInput } from './dto/update-concert.zod';
import { ListConcertInput } from './dto/list-concert.zod';

@Injectable()
export class ConcertService {
  private readonly logger = new Logger(ConcertService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,
  ) {}

  async create(input: CreateConcertInput, createdBy: string) {
    this.logger.log('Enter cconcert service : create ');
    const [concert] = await this.db
      .insert(concerts)
      .values({ ...input, createdBy })
      .returning();
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
  async list(userId: string, { page, pageSize }: ListConcertInput) {
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

    return {
      data,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  /**
   * สถิติ 3 การ์ด (admin dashboard)
   * - totalSeats / totalReserved — SUM จาก concerts ที่ยัง active เท่านั้น
   *   (คอนเสิร์ตที่ soft-delete ไม่นับ ตาม decision log)
   * - totalCancelled — COUNT reservations ที่ status='cancelled'
   */
  async stats() {
    const [seats] = await this.db
      .select({
        totalSeats: sql<number>`coalesce(sum(${concerts.totalSeat}), 0)::int`,
        totalReserved: sql<number>`coalesce(sum(${concerts.reservedSeat}), 0)::int`,
      })
      .from(concerts)
      .where(eq(concerts.status, 'active'));

    const [{ totalCancelled }] = await this.db
      .select({ totalCancelled: sql<number>`count(*)::int` })
      .from(reservations)
      .where(eq(reservations.status, 'cancelled'));

    return {
      totalSeats: seats.totalSeats,
      totalReserved: seats.totalReserved,
      totalCancelled,
    };
  }
}
