#!/bin/sh
# gen JWT secret ของ Nest → .env (รันตอน build ใน Dockerfile stage `secret` → ฝังใน image)
# idempotent: มี .env แล้วไม่ทับ
set -e

ENV_FILE=.env

if [ ! -f "$ENV_FILE" ]; then
  {
    echo "JWT_ACCESS_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
    echo "JWT_REFRESH_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  } > "$ENV_FILE"
  echo "gen-nest-env: generated $ENV_FILE"
else
  echo "gen-nest-env: reuse existing $ENV_FILE"
fi
