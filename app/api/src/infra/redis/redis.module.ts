import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');

        const client = new Redis(
          config.getOrThrow<string>('REDIS_URL'),
          {
            // fail-open: ถ้า Redis ล่ม ห้ามให้ command ค้างจนคา request
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          },
        );

        // ไม่มี handler แล้ว error จาก ioredis จะกลายเป็น unhandled ทำ process ตาย
        client.on('error', (error: Error) => {
          logger.error(
            `Redis unavailable: ${error.message}`,
          );
        });

        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
