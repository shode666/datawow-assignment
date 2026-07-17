import type { Request } from 'express';
import type { VerifiedTokenPayload } from '@/module/auth/types/token-payload.type';

export type AuthenticatedRequest = Request & {
  user: VerifiedTokenPayload;
};
