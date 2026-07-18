/** shape ของสถิติ — ตรงกับที่ NestJS `GET /concerts/stats` คืนมา */
export type StatsResponse = {
  totalSeats: number;
  totalReserved: number;
  totalCancelled: number;
};
