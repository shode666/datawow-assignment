# datawow interview assignment

## Project: free concert ticket

### project init
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