import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateConcertInput,
  createConcertSchema,
} from './dto/create-concert.zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { ConcertService } from './concert.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/types/token-payload.type';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { Permission } from '@/common/constants/permission.constant';
import {
  type ListConcertInput,
  listConcertSchema,
} from './dto/list-concert.zod';

@Controller('concerts')
export class ConcertController {
  constructor(private readonly concertService: ConcertService) {}

  @Post()
  @RequirePermission(Permission.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createConcert(
    @Body(new ZodValidationPipe(createConcertSchema))
    input: CreateConcertInput,
    @CurrentUser() currentUser: VerifiedTokenPayload,
  ) {
    return this.concertService.create(input, currentUser.sub);
  }

  // ⚠️ ต้องประกาศก่อน route ที่มี :id ไม่งั้น 'stats' จะโดนจับเป็น id
  @Get('stats')
  @RequirePermission(Permission.ADMIN)
  @HttpCode(HttpStatus.OK)
  stats() {
    return this.concertService.stats();
  }

  @Delete(':id')
  @RequirePermission(Permission.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.concertService.softDelete(id);
  }

  @Get()
  list(
    @CurrentUser() currentUser: VerifiedTokenPayload,
    @Query(new ZodValidationPipe(listConcertSchema)) query: ListConcertInput,
  ) {
    return this.concertService.list(currentUser.sub, query);
  }
}
