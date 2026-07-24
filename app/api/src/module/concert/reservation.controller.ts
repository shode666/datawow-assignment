import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/types/token-payload.type';
import { ReservationService } from './reservation.service';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { Permission } from '@/common/constants/permission.constant';
import { type ReservationInput, reservationSchema } from './dto/reservation.zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

/**
 * reserve/cancel เป็น user action — ไม่ใส่ @RequirePermission
 * (ทั้ง user และ admin จองได้ แค่ต้อง login ผ่าน JwtAuthGuard global)
 *
 * user_id มาจาก @CurrentUser() เท่านั้น — ห้ามรับจาก body/query
 * ไม่งั้นจอง/ยกเลิกแทนคนอื่นได้
 */
@Controller('concerts/:concertId/reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @RequirePermission(Permission.USER)
  @HttpCode(HttpStatus.CREATED)
  reserve(
    @Param('concertId', ParseUUIDPipe) concertId: string,
    @Body(new ZodValidationPipe(reservationSchema)) input: ReservationInput,
    @CurrentUser() currentUser: VerifiedTokenPayload,
  ) {
    return this.reservationService.reserve(concertId, currentUser.sub, input.seat);
  }

  @Delete()
  @RequirePermission(Permission.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('concertId', ParseUUIDPipe) concertId: string,
    @CurrentUser() currentUser: VerifiedTokenPayload,
  ) {
    return this.reservationService.cancel(concertId, currentUser.sub);
  }
}
