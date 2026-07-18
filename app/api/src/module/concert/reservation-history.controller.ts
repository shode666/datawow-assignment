import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import {
  type HistoryInput,
  historySchema,
} from './dto/history-reservation.zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { Permission } from '@/common/constants/permission.constant';

/**
 * ประวัติการจอง (admin) — เป็น query ข้ามทุกคอนเสิร์ต
 * ไม่ผูกกับ :concertId จึงแยกออกมาที่ /reservations/history
 */
@Controller('reservations')
export class ReservationHistoryController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get('history')
  @RequirePermission(Permission.ADMIN)
  @HttpCode(HttpStatus.OK)
  history(@Query(new ZodValidationPipe(historySchema)) query: HistoryInput) {
    return this.reservationService.history(query);
  }
}
