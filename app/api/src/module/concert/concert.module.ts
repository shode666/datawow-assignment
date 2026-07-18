import { Module } from '@nestjs/common';
import { ConcertService } from './concert.service';
import { ReservationService } from './reservation.service';
import { ConcertListCacheService } from './concert-list-cache.service';
import { ConcertController } from './concert.controller';
import { ReservationController } from './reservation.controller';
import { ReservationHistoryController } from './reservation-history.controller';

@Module({
  providers: [
    ConcertService,
    ReservationService,
    ConcertListCacheService,
  ],
  controllers: [
    ConcertController,
    ReservationController,
    ReservationHistoryController,
  ],
})
export class ConcertModule {}
