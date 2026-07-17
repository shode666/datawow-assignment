import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { AuthModule } from './module/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,
    RedisModule,
    AuthModule,
  ],
  providers: [
    // ป้องกันทุก endpoint ตั้งแต่แรก แล้วค่อยใช้ @Public() ยกเว้นเป็นรายตัว
    // ลืมใส่ = ถูกป้องกัน ปลอดภัยกว่า ลืมใส่ = เปิดโล่ง
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // ลำดับสำคัญ: ต้องมาหลัง JwtAuthGuard เพราะอ่าน request.user ที่ตัวนั้นแปะไว้
    // endpoint ที่ไม่ได้ใส่ @RequirePermission จะถูกปล่อยผ่าน
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
