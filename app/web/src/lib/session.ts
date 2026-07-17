import { cookies } from 'next/headers';

/**
 * session ทั้งก้อนอยู่ใน cookie เดียว
 *
 * เดิมแยกเป็น access_token / refresh_token / auth_user แล้วเจอ 2 ปัญหา:
 * - แต่ละตัวหมดอายุคนละเวลา ทำให้มีจังหวะที่ session ครึ่งๆ กลางๆ
 * - โค้ดอ่าน/parse กระจาย 4 ที่ แล้ว drift กันจนพัง
 *
 * รวมเป็นก้อนเดียวแล้วหมดอายุพร้อมกัน และ parse ที่เดียวคือที่นี่
 */
export const SESSION_COOKIE = 'session';

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  permissions: number[];
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

/**
 * cookie เก็บ JSON ที่ผ่าน base64 มา
 *
 * JSON ดิบมีอักขระที่ cookie ต้อง percent-encode (`{` `"` `,` และภาษาไทยใน fullName)
 * ซึ่งเคยทำให้ decode ผิดพลาดมาแล้ว base64 ตัดปัญหานั้นทิ้ง
 */
function encode(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString(
    'base64url',
  );
}

function decode(raw: string): Session | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString(
      'utf8',
    );

    return JSON.parse(json) as Session;
  } catch {
    // cookie เสียหรือมาจาก session รุ่นเก่า ถือว่าไม่ได้ login
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;

  return raw ? decode(raw) : null;
}

export async function writeSession(session: Session) {
  (await cookies()).set(
    SESSION_COOKIE,
    encode(session),
    cookieOptions,
  );
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
