import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { ReservationService } from './reservation.service';
import { ConcertListCacheService } from './concert-list-cache.service';
import { DATABASE } from '@/infra/database/database.constants';

describe('ReservationService', () => {
  let service: ReservationService;

  const dbMock = {
    transaction: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  };

  const cacheMock = {
    read: jest.fn().mockResolvedValue(null),
    write: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  };

  const concert = {
    id: 'concert-1',
    status: 'active',
    reservedSeat: 5,
    totalSeat: 100,
  };

  const reservation = {
    id: 'res-1',
    concertId: 'concert-1',
    userId: 'user-1',
    status: 'reserved',
    cancelledAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // ทรานแซกชันส่ง dbMock ตัวเดิมเป็น tx (เหมือน auth.service.spec)
    dbMock.transaction.mockImplementation(
      async (cb: (tx: typeof dbMock) => Promise<unknown>) => cb(dbMock),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: DATABASE, useValue: dbMock },
        { provide: ConcertListCacheService, useValue: cacheMock },
      ],
    }).compile();

    service = moduleRef.get(ReservationService);
  });

  // select().from().where().for('update').limit() -> rows
  function selectForUpdate(rows: unknown[]) {
    const limit = jest.fn().mockResolvedValue(rows);
    const forUpdate = jest.fn().mockReturnValue({ limit });
    const where = jest.fn().mockReturnValue({ for: forUpdate });
    const from = jest.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });
    return { from, where, forUpdate, limit };
  }

  // update().set().where().returning() -> rows
  function updateReturning(rows: unknown[]) {
    const returning = jest.fn().mockResolvedValue(rows);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    return { set, where, returning };
  }

  // update().set().where()  (ไม่มี returning — awaited ตรงๆ)
  function updateNoReturning() {
    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    return { set, where };
  }

  function insertReturning(rows: unknown[]) {
    const returning = jest.fn().mockResolvedValue(rows);
    const values = jest.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });
    return { values, returning };
  }

  function insertReject(error: unknown) {
    const returning = jest.fn().mockRejectedValue(error);
    const values = jest.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });
  }

  // chainable builder ที่ await แล้วได้ `value` — รองรับทั้งสาย union (offset)
  // และสาย count (where) เพราะทุก method คืน instance เดิมที่เป็น thenable
  function chainable(value: unknown) {
    const c: Record<string, unknown> = {};
    for (const m of [
      'from',
      'innerJoin',
      'where',
      'unionAll',
      'orderBy',
      'limit',
      'offset',
    ]) {
      c[m] = jest.fn(() => c);
    }
    c.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => Promise.resolve(value).then(resolve, reject);
    return c;
  }

  // ลำดับ db.select ใน history: reservedEvents, cancelledEvents, reservedCount, cancelledCount
  function mockHistory(
    dataRows: unknown[],
    reservedCount: number,
    cancelledCount: number,
  ) {
    dbMock.select
      .mockReturnValueOnce(chainable(dataRows)) // reservedEvents (await ที่ .offset)
      .mockReturnValueOnce(chainable([])) // cancelledEvents (เป็น arg ของ unionAll)
      .mockReturnValueOnce(chainable([{ count: reservedCount }]))
      .mockReturnValueOnce(chainable([{ count: cancelledCount }]));
  }

  describe('history', () => {
    it('merges reserved + cancelled events; reserve→cancel→reserve = 3 events', async () => {
      const dataRows = [
        { action: 'reserved' },
        { action: 'cancelled' },
        { action: 'reserved' },
      ];
      // 2 reservations → 2 reserved events, 1 ในนั้นถูกยกเลิก → 1 cancelled event
      mockHistory(dataRows, 2, 1);

      const result = await service.history({ page: 1, pageSize: 10 });

      expect(result).toEqual({
        data: dataRows,
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
      });
    });

    it('computes pagination from the summed event count', async () => {
      mockHistory([], 5, 2);

      const result = await service.history({
        concertName: 'Rock',
        userName: 'Bob',
        page: 2,
        pageSize: 5,
      });

      expect(result.total).toBe(7); // 5 reserved + 2 cancelled
      expect(result.totalPages).toBe(2); // ceil(7 / 5)
      expect(result.page).toBe(2);
    });
  });

  describe('reserve', () => {
    it('locks the concert, bumps the counter, then inserts the reservation', async () => {
      const sel = selectForUpdate([concert]);
      dbMock.update.mockReturnValue({ set: updateNoReturning().set });
      insertReturning([reservation]);

      const result = await service.reserve('concert-1', 'user-1');

      expect(sel.forUpdate).toHaveBeenCalled(); // FOR UPDATE ถูกเรียก
      expect(dbMock.insert).toHaveBeenCalled();
      expect(result).toEqual(reservation);
    });

    it('throws 409 when the concert is full', async () => {
      selectForUpdate([{ ...concert, reservedSeat: 100, totalSeat: 100 }]);

      await expect(service.reserve('concert-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      // เต็มแล้ว → ไม่แตะ counter / ไม่ insert
      expect(dbMock.update).not.toHaveBeenCalled();
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('throws 404 when the concert is gone or deleted', async () => {
      selectForUpdate([]);

      await expect(service.reserve('concert-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 409 when the user already reserved (unique violation 23505)', async () => {
      selectForUpdate([concert]);
      insertReject({ code: '23505' });

      await expect(service.reserve('concert-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      // ชน dup ก่อนแตะ counter → update ไม่ถูกเรียก
      expect(dbMock.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels the reservation and returns the counter', async () => {
      selectForUpdate([concert]);
      const resUpdate = updateReturning([
        { ...reservation, status: 'cancelled' },
      ]);
      const concertUpdate = updateNoReturning();
      dbMock.update
        .mockReturnValueOnce({ set: resUpdate.set })
        .mockReturnValueOnce({ set: concertUpdate.set });

      const result = await service.cancel('concert-1', 'user-1');

      // ลด counter ในทรานแซกชันเดียวกัน
      expect(concertUpdate.set).toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
    });

    it('throws 404 when there is no active reservation', async () => {
      selectForUpdate([concert]);
      dbMock.update.mockReturnValueOnce({ set: updateReturning([]).set });

      await expect(service.cancel('concert-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      // ไม่มีอะไรให้ยกเลิก → ไม่ลด counter (update reservation ครั้งเดียว)
      expect(dbMock.update).toHaveBeenCalledTimes(1);
    });
  });
});
