/** shape ของ event ประวัติการจอง — ตรงกับที่ NestJS `GET /reservations/history` คืนมา */
export type HistoryEvent = {
  reservationId: string;
  concertId: string;
  concertName: string;
  userId: string;
  userName: string;
  action: 'reserved' | 'cancelled';
  at: string;
};

export type HistoryResponse = {
  data: HistoryEvent[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
