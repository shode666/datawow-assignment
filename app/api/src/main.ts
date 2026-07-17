import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ยังต้องมี: Next.js BFF แนบ token มาทาง Cookie header ให้ guard อ่าน
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  // ไม่มี enableCors: browser ไม่เคยยิงมาที่นี่ตรงๆ ทุก request ผ่าน Next.js
  // ซึ่งเป็น server-to-server จึงไม่มี CORS เข้ามาเกี่ยว

  await app.listen(3001);
}
void bootstrap();