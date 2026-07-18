# datawow assignment — free concert ticket

Monorepo: `app/api` (NestJS + Drizzle + Postgres + Redis), `app/web` (Next.js + AntD, BFF).

## Use cases

| # | ทำอะไร | API | หน้าเว็บ | ใคร |
|---|---|---|---|---|
| 1 | สมัคร | `POST /api/auth/register` | `/register` | ทุกคน |
| 2 | login user | `POST /api/auth/user/login` | `/user/login` | ทุกคน |
| 3 | login admin | `POST /api/auth/admin/login` | `/admin/login` | ทุกคน |
| 4 | สลับ user/admin | `POST /api/auth/switch` | sidebar | login |
| 5 | ต่อ session | `POST /api/auth/refresh` | auto ตอน 401 | - |
| 6 | logout | `POST /api/auth/logout` | sidebar | login |
| 7 | ดู list | `GET /api/concerts` | `/list`, `/admin` | user + admin |
| 8 | จอง | `POST /api/concerts/:id/reservations` | `/list` | user |
| 9 | ยกเลิก | `DELETE /api/concerts/:id/reservations` | `/list` | user |
| 10 | stats | `GET /api/stats` | `/admin` | admin |
| 11 | สร้าง | `POST /api/concerts` | `/admin` | admin |
| 12 | ลบ | `DELETE /api/concerts/:id` | `/admin` | admin |
| 13 | history | `GET /api/history` | `/history` | admin |

1 คน/1 ที่/คอนเสิร์ต · เต็ม→"Full" · ลบ/ยกเลิก = soft delete · กันจองเกิน = `SELECT FOR UPDATE`.

**Cache**: concert list (UC 7) cache ที่ Redis, per-user, version-namespace. Invalidate (bump version, ล้างทุก user พร้อมกัน) ตอน **create / delete / reserve / cancel** — ทุก write ที่ทำให้ list เปลี่ยน.

## Run

```bash
docker compose -f docker-compose-dev.yml up -d
cd app/api && cp .env.template .env && pnpm install && pnpm db:migrate && pnpm dev   # :3001
cd app/web && cp .env.template .env && pnpm install && pnpm dev                       # :3000
cd app/api && pnpm test
```

## Easier
```bash
docker compose up -d
```

## Env

- `app/api/.env` — `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`
- `app/web/.env` — `API_INTERNAL_URL=http://localhost:3001/api` (ต้องมี `/api` ท้าย)
