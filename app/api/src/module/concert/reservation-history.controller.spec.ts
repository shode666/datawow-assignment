import { Test } from '@nestjs/testing';

import { ReservationHistoryController } from './reservation-history.controller';
import { ReservationService } from './reservation.service';
import type { HistoryInput } from './dto/history-reservation.zod';

describe('ReservationHistoryController', () => {
  let controller: ReservationHistoryController;

  const serviceMock = {
    history: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationHistoryController],
      providers: [{ provide: ReservationService, useValue: serviceMock }],
    }).compile();

    controller = moduleRef.get(ReservationHistoryController);
  });

  it('passes the validated query straight to the service', async () => {
    const query: HistoryInput = {
      concertName: 'Rock',
      userName: 'Bob',
      page: 1,
      pageSize: 10,
    };
    const page = { data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };
    serviceMock.history.mockResolvedValue(page);

    const result = await controller.history(query);

    expect(serviceMock.history).toHaveBeenCalledWith(query);
    expect(result).toBe(page);
  });
});
