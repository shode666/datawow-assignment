import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ConcertService } from './concert.service';
import { DATABASE } from '@/infra/database/database.constants';

describe('ConcertService', () => {
  let service: ConcertService;

  const dbMock = {
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    query: {
      concerts: {
        findFirst: jest.fn(),
      },
    },
  };

  const concert = {
    id: 'concert-1',
    name: 'Rock Fest',
    description: 'desc',
    totalSeat: 100,
    reservedSeat: 0,
    status: 'active',
    version: 1,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ConcertService, { provide: DATABASE, useValue: dbMock }],
    }).compile();

    service = moduleRef.get(ConcertService);
  });

  // insert(...).values(...).returning()
  function mockInsert(rows: unknown[]) {
    const returning = jest.fn().mockResolvedValue(rows);
    const values = jest.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });
    return { values, returning };
  }

  // update(...).set(...).where(...).returning()
  function mockUpdate(rows: unknown[]) {
    const returning = jest.fn().mockResolvedValue(rows);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });
    return { set, where, returning };
  }

  function mockUpdateReject(error: unknown) {
    const returning = jest.fn().mockRejectedValue(error);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });
  }

  // list: select().from().leftJoin().where().orderBy().limit().offset()
  //     + select().from().where()  (count)
  function mockList(rows: unknown[], count: number) {
    const offset = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ offset });
    const orderBy = jest.fn().mockReturnValue({ limit });
    const whereData = jest.fn().mockReturnValue({ orderBy });
    const leftJoin = jest.fn().mockReturnValue({ where: whereData });
    const fromData = jest.fn().mockReturnValue({ leftJoin });

    const whereCount = jest.fn().mockResolvedValue([{ count }]);
    const fromCount = jest.fn().mockReturnValue({ where: whereCount });

    dbMock.select
      .mockReturnValueOnce({ from: fromData })
      .mockReturnValueOnce({ from: fromCount });
  }

  describe('create', () => {
    it('inserts with createdBy from the caller, never from the body', async () => {
      const { values } = mockInsert([concert]);

      const result = await service.create(
        { name: 'Rock Fest', description: 'desc', totalSeat: 100 },
        'admin-1',
      );

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rock Fest',
          createdBy: 'admin-1',
        }),
      );
      expect(result).toEqual(concert);
    });
  });

  describe('softDelete', () => {
    it('returns the deleted concert', async () => {
      mockUpdate([{ ...concert, status: 'deleted' }]);

      const result = await service.softDelete('concert-1');

      expect(result.status).toBe('deleted');
    });

    it('throws 404 when nothing was deleted (missing or already deleted)', async () => {
      mockUpdate([]);

      await expect(service.softDelete('concert-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const input = { name: 'New name', version: 1 };

    it('returns the updated row', async () => {
      mockUpdate([{ ...concert, name: 'New name', version: 2 }]);

      const result = await service.update('concert-1', input);

      expect(result.version).toBe(2);
    });

    it('throws 409 when the version no longer matches', async () => {
      mockUpdate([]);
      dbMock.query.concerts.findFirst.mockResolvedValue(concert);

      await expect(service.update('concert-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws 404 when the concert is gone or already deleted', async () => {
      mockUpdate([]);
      dbMock.query.concerts.findFirst.mockResolvedValue(undefined);

      await expect(service.update('concert-1', input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 400 when totalSeat drops below reserved (check violation 23514)', async () => {
      mockUpdateReject({ code: '23514' });

      await expect(
        service.update('concert-1', { totalSeat: 1, version: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns paginated data with total and totalPages', async () => {
      const row = { ...concert, myReservation: null };
      mockList([row], 1);

      const result = await service.list('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual({
        data: [row],
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  // stats:
  //   select({sum}).from(concerts).where()                          — seats
  //   select({count}).from(reservations).where(notExists(subquery)) — cancel
  //     โดย subquery = select().from(alias).where()  (สร้าง builder เฉยๆ ไม่ถูก await)
  function mockStats(
    seats: { totalSeats: number; totalReserved: number },
    cancelled: number,
  ) {
    const whereSeats = jest.fn().mockResolvedValue([seats]);
    const fromSeats = jest.fn().mockReturnValue({ where: whereSeats });

    const whereSub = jest.fn().mockReturnValue({});
    const fromSub = jest.fn().mockReturnValue({ where: whereSub });

    const whereCancel = jest
      .fn()
      .mockResolvedValue([{ totalCancelled: cancelled }]);
    const fromCancel = jest.fn().mockReturnValue({ where: whereCancel });

    dbMock.select
      .mockReturnValueOnce({ from: fromSeats })
      .mockReturnValueOnce({ from: fromCancel })
      .mockReturnValueOnce({ from: fromSub });
  }

  describe('stats', () => {
    it('sums active seats and counts cancelled reservations', async () => {
      mockStats({ totalSeats: 300, totalReserved: 40 }, 12);

      const result = await service.stats();

      expect(result).toEqual({
        totalSeats: 300,
        totalReserved: 40,
        totalCancelled: 12,
      });
    });
  });
});
