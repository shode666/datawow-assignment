import { Module } from '@nestjs/common';
import { ConcertService } from './concert.service';
import { ReservationService } from './reservation.service';
import { ConcertController } from './concert.controller';
import { ReservationController } from './reservation.controller';

@Module({
  providers: [ConcertService, ReservationService],
  controllers: [ConcertController, ReservationController]
})
export class ConcertModule {}
