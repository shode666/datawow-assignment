import { DATABASE } from '@/infra/database/database.constants';
import type { AppDatabase } from '@/infra/database/database.types';
import { concerts, reservations, users } from '@/infra/database/schema';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, isNotNull, sql, type SQL } from 'drizzle-orm';
import { HistoryInput } from './dto/history-reservation.zod';

/** Postgres SQLSTATE — unique_violation (จองซ้ำ ชน partial unique index) */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: AppDatabase,
  ) {}

  /**
   * จองที่นั่ง — ทั้งหมดในทรานแซกชันเดียว
   *
   * SELECT ... FOR UPDATE ล็อกแถวคอนเสิร์ตจนจบ transaction
   * คนกดพร้อมกันจะเข้าคิวทีละคน อ่านค่า reserved_seat ที่ล่าสุดเสมอ
   * เช็คเต็ม/ไม่เต็มใน app แล้วค่อยเขียน — กันเกินได้เพราะไม่มีใครแทรกระหว่างนั้น
   */
  async reserve(concertId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [concert] = await tx
        .select()
        .from(concerts)
        .where(and(eq(concerts.id, concertId), eq(concerts.status, 'active')))
        .for('update') // 🔒 ล็อกแถวนี้จนจบ tx
        .limit(1);

      if (!concert) {
        throw new NotFoundException('Concert not found');
      }
      if (concert.reservedSeat >= concert.totalSeat) {
        throw new ConflictException('Concert is full');
      }

      try {
        // 1) สร้าง reservation ก่อน — ชน partial unique index = จองซ้ำ
        const [reservation] = await tx
          .insert(reservations)
          .values({ concertId, userId })
          .returning();

        // 2) แล้วค่อยสะท้อนใน counter (ถือ lock อยู่ ค่าไม่มีใครแทรก)
        await tx
          .update(concerts)
          .set({
            reservedSeat: concert.reservedSeat + 1,
            updatedAt: new Date(),
          })
          .where(eq(concerts.id, concertId));

        return reservation;
      } catch (err) {
        // ชน dup → throw ก่อนแตะ counter → counter ไม่ถูกแตะเลย
        if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
          throw new ConflictException('You already reserved this concert');
        }
        throw err;
      }
    });
  }

  /**
   * ยกเลิกการจอง — cancel reservation + คืน counter ในทรานแซกชันเดียว
   *
   * ล็อกแถวคอนเสิร์ตก่อน (FOR UPDATE) ให้ลำดับ lock ตรงกับ reserve
   * (ล็อก concerts ก่อนเสมอ) → ไม่มี deadlock ข้ามกัน
   *
   * `AND status='reserved'` สำคัญ: กันกด cancel ซ้ำแล้วลด counter หลายรอบ
   */
  async cancel(concertId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [concert] = await tx
        .select()
        .from(concerts)
        .where(eq(concerts.id, concertId))
        .for('update') // 🔒 ล็อกก่อนแตะ counter
        .limit(1);

      if (!concert) {
        throw new NotFoundException('Concert not found');
      }

      const [cancelled] = await tx
        .update(reservations)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(
          and(
            eq(reservations.concertId, concertId),
            eq(reservations.userId, userId),
            eq(reservations.status, 'reserved'),
          ),
        )
        .returning();

      if (!cancelled) {
        throw new NotFoundException('No active reservation to cancel');
      }

      await tx
        .update(concerts)
        .set({
          reservedSeat: concert.reservedSeat - 1,
          updatedAt: new Date(),
        })
        .where(eq(concerts.id, concertId));

      return cancelled;
    });
  }

  /**
   * ประวัติการจอง (admin) — เป็น "เหตุการณ์" ไม่ใช่ "แถว reservation"
   *
   * 1 reservation แตกได้ถึง 2 เหตุการณ์:
   *   - reserved  — ทุกแถว, at = created_at
   *   - cancelled — เฉพาะที่ยกเลิกแล้ว (cancelled_at IS NOT NULL), at = cancelled_at
   * รวมด้วย UNION ALL แล้วเรียงตามเวลาเกิดเหตุการณ์ (at) ล่าสุดก่อน
   * → จอง → ยกเลิก → จองใหม่ = 3 เหตุการณ์
   *
   * filter ด้วย concertName / userName แบบ partial (ILIKE) ถ้าส่งมา
   */
  async history({ concertName, userName, page, pageSize }: HistoryInput) {
    const offset = (page - 1) * pageSize;

    const filters: SQL[] = [];
    if (concertName) {
      filters.push(ilike(concerts.name, `%${concertName}%`));
    }
    if (userName) {
      filters.push(ilike(users.fullName, `%${userName}%`));
    }
    const baseWhere = filters.length ? and(...filters) : undefined;
    const cancelledWhere = baseWhere
      ? and(baseWhere, isNotNull(reservations.cancelledAt))
      : isNotNull(reservations.cancelledAt);

    const reservedEvents = this.db
      .select({
        reservationId: reservations.id,
        concertId: reservations.concertId,
        concertName: concerts.name,
        userId: reservations.userId,
        userName: users.fullName,
        action: sql<'reserved' | 'cancelled'>`'reserved'`.as('action'),
        at: sql<Date>`${reservations.createdAt}`.as('at'),
      })
      .from(reservations)
      .innerJoin(concerts, eq(concerts.id, reservations.concertId))
      .innerJoin(users, eq(users.id, reservations.userId))
      .where(baseWhere);

    const cancelledEvents = this.db
      .select({
        reservationId: reservations.id,
        concertId: reservations.concertId,
        concertName: concerts.name,
        userId: reservations.userId,
        userName: users.fullName,
        action: sql<'reserved' | 'cancelled'>`'cancelled'`.as('action'),
        at: sql<Date>`${reservations.cancelledAt}`.as('at'),
      })
      .from(reservations)
      .innerJoin(concerts, eq(concerts.id, reservations.concertId))
      .innerJoin(users, eq(users.id, reservations.userId))
      .where(cancelledWhere);

    const data = await reservedEvents
      .unionAll(cancelledEvents)
      .orderBy(sql`at desc`)
      .limit(pageSize)
      .offset(offset);

    // total = จำนวน reserved event (ทุกแถวที่ match) + cancelled event (ที่ยกเลิกแล้ว)
    const [{ count: reservedCount }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .innerJoin(concerts, eq(concerts.id, reservations.concertId))
      .innerJoin(users, eq(users.id, reservations.userId))
      .where(baseWhere);

    const [{ count: cancelledCount }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .innerJoin(concerts, eq(concerts.id, reservations.concertId))
      .innerJoin(users, eq(users.id, reservations.userId))
      .where(cancelledWhere);

    const total = reservedCount + cancelledCount;

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
