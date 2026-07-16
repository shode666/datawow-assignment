import { z } from 'zod';

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'กรุณากรอกชื่อ')
      .max(255, 'ชื่อต้องไม่เกิน 255 ตัวอักษร'),

    email: z
      .string()
      .trim()
      .pipe(z.email('รูปแบบอีเมลไม่ถูกต้อง')),

    password: z
      .string()
      .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      .max(20, 'รหัสผ่านต้องไม่เกิน 20 ตัวอักษร')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
        'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว'),

    confirmPassword: z
      .string()
      .min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'รหัสผ่านไม่ตรงกัน',
      path: ['confirmPassword'],
    },
  );

export type RegisterInput = z.infer<
  typeof registerSchema
>;