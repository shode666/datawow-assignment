import { z } from 'zod';

export const historySchema = z.object({
  concertName: z.string().trim().optional(),
  userName: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type HistoryInput = z.infer<typeof historySchema>;
