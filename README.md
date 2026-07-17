# datawow interview assignment

## Project: free concert ticket

> **สถานะ: กำลังพัฒนา** — ตอนนี้เสร็จเฉพาะส่วน auth และ permission ส่วนฟีเจอร์จองตั๋วยังไม่ได้เริ่ม

Monorepo แบ่งเป็น 2 แอปที่ deploy แยกกัน — `app/api` (NestJS) และ `app/web` (Next.js)

---

## Stack

### Backend — `app/api`

| | |
|---|---|
| Framework | NestJS 11 (Express) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 17 |
| ORM | Drizzle ORM 0.45 + drizzle-kit 0.31 |
| Cache / Denylist | Redis 7 (ioredis) |
| Auth | `@nestjs/jwt` + bcrypt |
| Validation | Zod 4 (ผ่าน custom `ZodValidationPipe`) |
| Test | Jest 30 |

### Frontend — `app/web`

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Ant Design 6 |
| Styling | Tailwind CSS 4 |
| Form | react-hook-form + Zod resolver |
| Pattern | BFF — route handler เป็นตัวกลางคุยกับ NestJS |

### Infrastructure

- pnpm 10 (แต่ละแอปมี lockfile ของตัวเอง ไม่ได้ใช้ workspace)
- Docker Compose — dev มี postgres + redis

> `passport` / `passport-jwt` และ `@tanstack/react-query` ติดตั้งไว้แล้วแต่ยังไม่มีโค้ดใช้งาน

---

## Architecture

```
browser ──> Next.js (app/web) ──> NestJS (app/api) ──> PostgreSQL
              BFF route handler                    └─> Redis (token denylist)
```

Browser **ไม่เคยคุยกับ NestJS โดยตรง** ทุก request ผ่าน route handler ของ Next.js ซึ่งถือ token ไว้ใน httpOnly cookie ฝั่งตัวเอง แล้วแนบส่งต่อไป NestJS เอง

token ไม่โผล่ใน JavaScript ฝั่ง client และไม่มี CORS ระหว่าง browser กับ API

---

## Use cases

ที่ทำเสร็จแล้ว 6 ตัว — อยู่ในโดเมน auth ทั้งหมด

| # | Use case | API | หน้าเว็บ |
|---|---|---|---|
| 1 | สมัครสมาชิก | `POST /api/auth/register` | `/register` |
| 2 | เข้าระบบแบบ User | `POST /api/auth/user/login` | `/role-select` → `/user/login` |
| 3 | เข้าระบบแบบ Admin | `POST /api/auth/admin/login` | `/role-select` → `/admin/login` |
| 4 | สลับ role ระหว่าง User - Admin | `POST /api/auth/switch` | ปุ่มใน sidebar |
| 5 | ต่ออายุ session อัตโนมัติ | `POST /api/auth/refresh` | เมื่อเจอ 401 ลองยิง refresh 1 ครั้งขอ access token ใหม่ |
| 6 | ออกจากระบบ | `POST /api/auth/logout` | ปุ่มใน sidebar |


---

## Auth design

**Role มาจากตอน login ไม่ใช่จาก DB** — ทุกบัญชีเข้าได้ทั้ง User และ Admin ขึ้นกับว่าเลือกประตูไหนที่หน้า `/role-select` role ที่สวมอยู่ถูกเก็บใน JWT (`permissions`)

**Switch เป็น toggle** — อ่าน role ปัจจุบันจาก access token แล้วพลิก จากนั้นออก token ใหม่ทั้งคู่ (refresh ต้อง rotate ด้วย ไม่งั้น role เด้งกลับตอน refresh ครั้งถัดไป)

**Session ผูกกับ refresh token ไม่ใช่ access token** — layout ฝั่ง protected เช็คว่ามี `refresh_token` ไหม เพราะ access token หมดอายุทุก 15 นาทีเป็นเรื่องปกติ ไม่ได้แปลว่า logout

### Cookie ที่ Next.js ถือไว้

| Cookie | อายุ | ใช้ทำอะไร |
|---|---|---|
| `access_token` | 15 นาที | แนบไป NestJS |
| `refresh_token` | 7 วัน | ต่ออายุ + เป็นตัวชี้ว่ายัง login อยู่ |
| `auth_user` | 7 วัน | ข้อมูลโชว์ใน UI (ไม่ใช่ credential) |

### Token revocation

Refresh token เป็น **one-time-use** — ทุกครั้งที่ refresh ตัวเก่าจะถูกใส่ denylist ใน Redis (key `denylist:{jti}`, TTL เท่าอายุที่เหลือของ token จึงลบตัวเองไม่ต้องมี cleanup job)

ได้ผลพลอยได้เป็น **reuse detection** — ใครเอา refresh เก่ามาเล่นซ้ำจะโดน 401 พร้อม log

- Redis ล่มจะ **fail-open** (ปล่อยผ่าน + log error) เพื่อไม่ให้ทั้งระบบ login ไม่ได้
- Access token **ไม่ถูกเช็ค denylist** โดยตั้งใจ เพราะจะทิ้งข้อดีของ JWT ไปหมด ยอมรับ window 15 นาทีแทน

---

## Getting started

### 1. Start infrastructure

```bash
docker compose -f docker-compose-dev.yml up -d
```

### 2. Backend

```bash
cd app/api
cp .env.template .env      # แล้วแก้ค่าให้ครบ
pnpm install
pnpm db:migrate            # สร้าง schema
pnpm dev                   # http://localhost:3001
```

### 3. Frontend

```bash
cd app/web
cp .env.template .env
pnpm install
pnpm dev                   # http://localhost:3000
```

### Test

```bash
cd app/api && pnpm test
```

---

## Environment

### `app/api/.env`

| Key | ตัวอย่าง |
|---|---|
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://app_user:app_password@localhost:5432/app_db` |
| `REDIS_URL` | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |

### `app/web/.env`

| Key | ตัวอย่าง |
|---|---|
| `API_INTERNAL_URL` | `http://localhost:3001/api` |

> ต้องมี `/api` ต่อท้าย เพราะ NestJS ตั้ง `setGlobalPrefix('api')`

---

## Database

```bash
cd app/api
pnpm db:generate   # สร้าง migration จาก schema
pnpm db:migrate    # apply migration
pnpm db:studio     # เปิด Drizzle Studio
```

Schema อยู่ที่ `src/infra/database/schema/` ส่วน migration อยู่ที่ `drizzle/`

---

## Project init

- package management: **pnpm**
- nest init script

```
pnpm dlx @nestjs/cli new app/api \
  --package-manager pnpm \
  --strict \
  --skip-git
```

- next init script

```
pnpm create next-app@latest app/web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```
