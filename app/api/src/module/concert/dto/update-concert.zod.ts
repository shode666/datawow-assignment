import { z } from 'zod';

export const updateConcertSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  totalSeat: z.int().min(1).max(1000).optional(),
  version: z.int().min(1), // required — ใช้เช็ค optimistic lock
});

export type UpdateConcertInput = z.infer<typeof updateConcertSchema>;
