import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
          .check(
              z.trim(),
              z.email('รูปแบบอีเมลไม่ถูกต้อง'),
              z.toLowerCase())
,

  password: z
    .string()
    .min(1, 'กรุณากรอกรหัสผ่าน'),
});

export type LoginInput = z.infer<typeof loginSchema>;