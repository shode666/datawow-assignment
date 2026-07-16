import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(20, 'Password must not exceed 20 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
        'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว');

export const registerSchema = z.object({
  email: z.email('Invalid email address'),

  password: passwordSchema,

  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(255),

  permissions: z
    .array(z.number().int().positive())
    .default([1]),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;