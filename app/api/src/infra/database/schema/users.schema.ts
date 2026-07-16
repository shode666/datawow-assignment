import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: varchar('email', { length: 255 })
    .notNull()
    .unique(),

  passwordHash: varchar('password_hash', { length: 255 })
    .notNull(),

  fullName: varchar('full_name', { length: 255 })
    .notNull(),

  permissions: integer('permissions')
    .array()
    .notNull()
    .default([]),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;