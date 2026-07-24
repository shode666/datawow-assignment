import { Test } from '@nestjs/testing';

import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import type { VerifiedTokenPayload } from '../auth/types/token-payload.type';

describe('ReservationController', () => {
  let controller: ReservationController;

  const serviceMock = {
    reserve: jest.fn(),
    cancel: jest.fn(),
  };

  const currentUser: VerifiedTokenPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    permissions: [1],
    type: 'access',
    jti: 'jti-1',
    iat: 0,
    exp: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [{ provide: ReservationService, useValue: serviceMock }],
    }).compile();

    controller = moduleRef.get(ReservationController);
  });

  describe('reserve', () => {
    it('passes concertId and the current user id to the service', async () => {
      serviceMock.reserve.mockResolvedValue({ id: 'res-1' });

      const result = await controller.reserve('concert-1', { seat: 2 }, currentUser);

      // userId มาจาก token (sub) ไม่ใช่ body/query, seat มาจาก validated input
      expect(serviceMock.reserve).toHaveBeenCalledWith('concert-1', 'user-1', 2);
      expect(result).toEqual({ id: 'res-1' });
    });
  });

  describe('cancel', () => {
    it('passes concertId and the current user id to the service', async () => {
      serviceMock.cancel.mockResolvedValue(undefined);

      await controller.cancel('concert-1', currentUser);

      expect(serviceMock.cancel).toHaveBeenCalledWith('concert-1', 'user-1');
    });
  });
});
