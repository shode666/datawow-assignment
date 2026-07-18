import { pgTable,
          pgEnum,
          uuid,
          index,
          uniqueIndex,
          timestamp } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { concerts } from './concerts.schema';
import { users } from './users.schema';

export const reservationStatus = pgEnum('reservation_status', ['reserved', 'cancelled']);

export const reservations = pgTable('reservations',{
  id: uuid('id').defaultRandom().primaryKey(),
  concertId: uuid('concert_id').notNull().references(()=>concerts.id),
  userId: uuid('user_id').notNull().references(()=>users.id),
  status: reservationStatus('status').notNull().default('reserved'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', {
      withTimezone: true,
    }).defaultNow().notNull()
  },
(table) => [
  uniqueIndex('reservations_active_unique')
    .on(table.concertId, table.userId)
    .where(sql`${table.status} = 'reserved'`),      // กันจองซ้ำ แต่ cancelled ไม่กินโควตา
  index('reservations_concert_id_idx').on(table.concertId),  // 0.6
  index('reservations_user_id_idx').on(table.userId),        // 0.6
])

export type Reservations = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;