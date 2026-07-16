import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
              .min(8,'Password must be at least 8 characters')
              .max(20,'Password must not exceed 20 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;