export type ApiError = {
  message?: string | string[];
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  body: T | ApiError;
  /** เก็บไว้ให้ readRefreshToken() แกะ Set-Cookie ที่ NestJS ส่งกลับมา */
  response: Response;
};

type CallOptions = {
  body?: unknown;
  /** fetch ฝั่ง server ไม่ส่ง cookie ของ browser ต่อให้ ต้องแนบเอง */
  cookie?: string;
};

/**
 * เรียก NestJS จาก route handler
 *
 * โยน error ถ้า API_INTERNAL_URL ไม่ได้ตั้ง — เป็น misconfiguration ตอน deploy
 * ไม่ใช่เรื่องที่ client แก้ได้ ปล่อยให้เป็น 500 แล้วไปโผล่ใน log
 */
export async function callApi<T>(
  path: string,
  { body, cookie }: CallOptions = {},
): Promise<ApiResult<T>> {
  const baseUrl = process.env.API_INTERNAL_URL;

  if (!baseUrl) {
    throw new Error('API_INTERNAL_URL is not configured');
  }

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body:
      body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readBody<T>(response),
    response,
  };
}

/** รับมือทั้ง 204 ที่ไม่มี body และ error ที่ตอบกลับมาเป็น text เปล่าๆ */
async function readBody<T>(
  response: Response,
): Promise<T | ApiError> {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return { message: raw };
  }
}
