import { Test } from '@nestjs/testing';

import { REDIS } from '@/infra/redis/redis.constants';
import { TokenDenylistService } from './token-denylist.service';

describe('TokenDenylistService', () => {
  let service: TokenDenylistService;

  const redisMock = {
    setex: jest.fn(),
    exists: jest.fn(),
  };

  const now = Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TokenDenylistService,
        {
          provide: REDIS,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = moduleRef.get(TokenDenylistService);
  });

  describe('revoke', () => {
    it('should set a TTL matching the remaining lifetime of the token', async () => {
      await service.revoke('jti-1', now + 3600);

      expect(redisMock.setex).toHaveBeenCalledWith(
        'denylist:jti-1',
        expect.any(Number),
        '1',
      );

      const [, ttl] = redisMock.setex.mock.calls[0] as [
        string,
        number,
        string,
      ];

      // ปัดเศษวินาทีระหว่างรันได้ แต่ต้องอยู่ราวๆ 1 ชั่วโมง
      expect(ttl).toBeGreaterThan(3590);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should skip a token that already expired', async () => {
      await service.revoke('jti-1', now - 10);

      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('should refuse a missing jti instead of writing denylist:undefined', async () => {
      // token ที่ออกก่อนมี jti ทุกใบจะชนกันที่ key เดียวแล้วเตะทุกคนพร้อมกัน
      await service.revoke(
        undefined as unknown as string,
        now + 3600,
      );

      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('should not throw when redis is down', async () => {
      redisMock.setex.mockRejectedValue(
        new Error('connection refused'),
      );

      await expect(
        service.revoke('jti-1', now + 3600),
      ).resolves.toBeUndefined();
    });
  });

  describe('isRevoked', () => {
    it('should report a revoked token', async () => {
      redisMock.exists.mockResolvedValue(1);

      await expect(
        service.isRevoked('jti-1'),
      ).resolves.toBe(true);
    });

    it('should report an unknown token as usable', async () => {
      redisMock.exists.mockResolvedValue(0);

      await expect(
        service.isRevoked('jti-1'),
      ).resolves.toBe(false);
    });

    it('should treat a missing jti as unusable', async () => {
      await expect(
        service.isRevoked(undefined as unknown as string),
      ).resolves.toBe(true);

      expect(redisMock.exists).not.toHaveBeenCalled();
    });

    it('should fail open when redis is down', async () => {
      redisMock.exists.mockRejectedValue(
        new Error('connection refused'),
      );

      // ยอมให้ผ่าน ดีกว่าให้ทั้งระบบ login ไม่ได้เพราะ Redis ล่ม
      await expect(
        service.isRevoked('jti-1'),
      ).resolves.toBe(false);
    });
  });
});
