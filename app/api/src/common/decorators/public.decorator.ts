import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * ยกเว้น JwtAuthGuard ที่ตั้งเป็น global ไว้
 *
 * ตั้งใจให้เป็น opt-out ไม่ใช่ opt-in — ลืมใส่แล้ว endpoint ถูกป้องกัน
 * ปลอดภัยกว่าลืมใส่แล้วเปิดโล่ง
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
