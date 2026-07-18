# free concert ticket

Monorepo จองฟรีคอนเสิร์ต: `app/api` (NestJS) + `app/web` (Next.js). login เป็น user (จอง/ยกเลิก) หรือ admin (สร้าง/ลบ/ดู stats)

## Setup (release version)

```bash
docker compose up --build      # เปิด http://localhost:3000
```

### Setup (hot reload)

```bash
docker compose -f docker-compose-dev.yml up -d                                  # postgres + redis
cd app/api && cp .env.template .env && pnpm install && pnpm db:migrate && pnpm dev   # :3001
cd app/web && cp .env.template .env && pnpm install && pnpm dev                       # :3000
```

**Env**
- `app/api/.env` — `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`
- `app/web/.env` — `API_INTERNAL_URL=http://localhost:3001/api` (ต้องมี `/api` ท้าย)

## Architecture

```
Browser ──▶ Next.js (web)  ──▶  NestJS (api :3001)  ──▶  Postgres
            └ BFF route handlers      └ REST + JWT guard        └ Redis (cache + token denylist)
              (แนบ httpOnly cookie)
```

- **web** เป็น BFF — หน้าเว็บไม่ยิง api ตรง แต่ยิงผ่าน Next route handler (`src/app/api/**`) ที่แนบ JWT จาก httpOnly cookie ให้ browser ไม่เห็น token
- **api** โครง NestJS module: `auth` (register,login,refresh,logout,switch role), `concert` (list,create,delete,reserve,cancel,stats,history) — infra แยก `database` (Drizzle) กับ `redis`
- **auth** — access + refresh token (JWT), permission-based guard, refresh token denylist เก็บใน Redis
- **concurrent** — `SELECT ... FOR UPDATE` ล็อกแถวตอนจอง · 1 คน/1 ที่/คอนเสิร์ต · ลบ/ยกเลิก = soft delete
- **cache** — concert list cache ที่ Redis (per-user, version-namespace) invalidate ตอน create/delete/reserve/cancel

### Use cases

| # | ทำอะไร | API | หน้าเว็บ | ใคร |
|---|---|---|---|---|
| 1 | register | `POST /api/auth/register` | `/register` | ทุกคน |
| 2 | login user | `POST /api/auth/user/login` | `/user/login` | ทุกคน |
| 3 | login admin | `POST /api/auth/admin/login` | `/admin/login` | ทุกคน |
| 4 | switch role | `POST /api/auth/switch` | sidebar | login |
| 5 | refresh jwt | `POST /api/auth/refresh` | auto ตอน 401 | - |
| 6 | logout | `POST /api/auth/logout` | sidebar | login |
| 7 | concert list | `GET /api/concerts` | `/list`, `/admin` | user + admin |
| 8 | reserve | `POST /api/concerts/:id/reservations` | `/list` | user |
| 9 | cancel reserved | `DELETE /api/concerts/:id/reservations` | `/list` | user |
| 10 | stats | `GET /api/stats` | `/admin` | admin |
| 11 | create concert | `POST /api/concerts` | `/admin` | admin |
| 12 | (soft)delete concert | `DELETE /api/concerts/:id` | `/admin` | admin |
| 13 | history | `GET /api/history` | `/history` | admin |

## Libraries

**api** — NestJS 11, Drizzle ORM + `pg` (Postgres), ioredis (Redis), `@nestjs/jwt` + bcrypt (auth), zod (validation), Jest + supertest (test)

**web** — Next.js 16 (App Router), React 19, Ant Design 6, react-hook-form + zod (form), Tailwind 4

**tooling** — TypeScript, pnpm, Docker Compose, drizzle-kit (migration), ESLint + Prettier

## Test

```bash
cd app/api
pnpm test          # unit + integration (Jest)
pnpm test:watch    # watch mode
pnpm test:cov      # + coverage report
pnpm test:e2e      # e2e
```

test อยู่ที่ฝั่ง api (`*.spec.ts` คู่กับไฟล์ที่เทสต์) — ครอบ auth service/controller/guard, concert + reservation service/controller, token denylist และ cache invalidation
