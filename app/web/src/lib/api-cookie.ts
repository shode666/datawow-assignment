/**
 * ชื่อ cookie ที่ NestJS คาดหวังใน Cookie header — ต้องตรงกับ
 * `common/constants/cookie.constant.ts` ฝั่ง api
 *
 * คนละเรื่องกับ cookie ที่ browser เก็บ (ดู lib/session.ts) — browser มี
 * `session` ก้อนเดียว ส่วนตรงนี้คือ header ที่ BFF ประกอบขึ้นมาเองตอนยิงหา NestJS
 */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
