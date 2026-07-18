import { z } from 'zod';

export const createConcertSchema = z.object({
  name: z
    .string()
    .min(1, 'Concert Name is required.')
    .max(255, 'Concert Name must not exceed 255 characters.'),
  description: z.string().optional(),
  totalSeat: z.int().min(1, 'Total Seat > 0').max(1000, 'Total Seat < 1000'),
});

export type CreateConcertInput = z.infer<typeof createConcertSchema>;
