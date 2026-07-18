import { Test } from '@nestjs/testing';

import { ConcertController } from './concert.controller';
import { ConcertService } from './concert.service';
import type { VerifiedTokenPayload } from '../auth/types/token-payload.type';

describe('ConcertController', () => {
  let controller: ConcertController;

  const serviceMock = {
    create: jest.fn(),
    softDelete: jest.fn(),
  };

  const currentUser: VerifiedTokenPayload = {
    sub: 'admin-1',
    email: 'admin@example.com',
    permissions: [2],
    type: 'access',
    jti: 'jti-1',
    iat: 0,
    exp: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ConcertController],
      providers: [
        { provide: ConcertService, useValue: serviceMock },
      ],
    }).compile();

    controller = moduleRef.get(ConcertController);
  });

  describe('createConcert', () => {
    it('passes the body and the current user id to the service', async () => {
      const input = {
        name: 'Rock Fest',
        description: 'desc',
        totalSeat: 100,
      };
      serviceMock.create.mockResolvedValue({ id: 'concert-1' });

      const result = await controller.createConcert(input, currentUser);

      // createdBy มาจาก token (sub) ไม่ใช่ body
      expect(serviceMock.create).toHaveBeenCalledWith(input, 'admin-1');
      expect(result).toEqual({ id: 'concert-1' });
    });
  });

  describe('softDelete', () => {
    it('passes the id to the service', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);

      await controller.softDelete('concert-1');

      expect(serviceMock.softDelete).toHaveBeenCalledWith('concert-1');
    });
  });
});