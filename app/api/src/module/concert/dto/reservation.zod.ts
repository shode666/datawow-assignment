import { z } from 'zod';

export const reservationSchema = z.object({
  seat: z.coerce.number().int().min(1, 'minimum 1 seat').default(1),
});
export type ReservationInput = z.infer<typeof reservationSchema>;
