import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
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

  @Delete(':id')
  @RequirePermission(Permission.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.concertService.softDelete(id);
  }
}
