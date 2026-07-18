/** shape ของคอนเสิร์ต — ตรงกับที่ NestJS `GET /concerts` คืนมา */
export type Concert = {
  id: string;
  name: string;
  description: string | null;
  totalSeat: number;
  reservedSeat: number;
  version: number;
  createdAt: string;
  myReservation: 'reserved' | null;
};

export type ConcertListResponse = {
  data: Concert[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** payload ตอนสร้าง — ตรงกับ createConcertSchema ฝั่ง NestJS */
export type CreateConcertInput = {
  name: string;
  description?: string;
  totalSeat: number;
};
