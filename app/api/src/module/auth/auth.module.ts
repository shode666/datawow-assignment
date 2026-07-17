import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenDenylistService } from './token-denylist.service';

@Module({
  // global: ให้ JwtAuthGuard ที่เป็น global guard ใช้ JwtService ได้
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, TokenDenylistService],
})
export class AuthModule {}