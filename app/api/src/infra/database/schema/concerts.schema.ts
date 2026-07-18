import { pgTable,
          pgEnum,
          check,
          uuid,
          text,
          varchar,
          integer,
          timestamp } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { users } from './users.schema'

export const concertStatus = pgEnum('concert_status',['active','deleted']);

export const concerts = pgTable('concerts',{
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  totalSeat: integer('total_seat').notNull(),
  reservedSeat: integer('reserved_seat').notNull().default(0),
  status: concertStatus('status').notNull().default('active'),
  createdBy: uuid('created_by').notNull().references(()=>users.id),
  createdAt: timestamp('created_at', {
      withTimezone: true,
    }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).defaultNow().notNull(),
},
(table) => [
    check('total_seat_positive', sql`${table.totalSeat} > 0`),
    check(
      'reserved_seat_in_range',
      sql`${table.reservedSeat} BETWEEN 0 AND ${table.totalSeat}`,
    ),
  ],);

export type Concerts = typeof concerts.$inferSelect;
export type NewConcerts = typeof concerts.$inferInsert;